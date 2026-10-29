import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BouquetsService } from './bouquets.service';
import { CreateBouquetOrderDto, QuoteBouquetDto } from './bouquets.dto';
import { OrdersService } from '../orders/orders.service';
import type { CurrentAdmin } from '../common/guards/admin-auth.guard';

describe('平台花束', () => {
  let db: any, users: any, orders: OrdersService, service: BouquetsService;
  const admin = { id: 1, role: 'PLATFORM_ADMIN' } as CurrentAdmin;
  const input = { bouquetId: 10, specId: 20, quantity: 2, address: '市区花园路', contactName: '收花人', contactPhone: '13800000000', expectedAmount: 20800, requestKey: 'custom-request-key-123', remark: '生日' };
  beforeEach(() => {
    const spec = { id: 20, productId: 10, name: '标准', unit: '束', price: 99, enabled: true, stemsPerUnit: 8 };
    const product = { id: 10, type: 'CUSTOM', enabled: true, name: '沉鱼', coverImage: '/flower.jpg', images: ['/flower.jpg'], description: '', specs: [spec] };
    db = {
      platformConfig: { findUnique: jest.fn(async () => ({ id: 1, customEnabled: true, deliveryArea: '市区', deliveryFee: 10, servicePhone: '4001234567', businessHours: '9-18' })), upsert: jest.fn() },
      product: { findMany: jest.fn(async () => [product]), findFirst: jest.fn(async () => product) },
      order: {
        findUnique: jest.fn(async () => null), findFirst: jest.fn(),
        create: jest.fn(async ({ data }) => ({ ...data, id: 1, version: 0, discountAmount: 0, item: { ...data.item.create, discountAmount: 0 }, logs: [] })),
        updateMany: jest.fn(async () => ({ count: 1 })), findUniqueOrThrow: jest.fn(),
      },
      inventoryLog: { findUnique: jest.fn(async () => null) },
      orderLog: { create: jest.fn() }, orderDispatch: { create: jest.fn() },
      $transaction: jest.fn(async fn => fn(db)),
    };
    users = { currentUser: jest.fn(async () => ({ id: 7 })) };
    orders = new OrdersService(db, users);
    service = new BouquetsService(db, users, orders);
  });
  it('列表使用 CUSTOM 商品，不返回虚构库存，金额为分', async () => {
    const list = await service.list();
    expect(db.product.findMany.mock.calls[0][0].where.type).toBe('CUSTOM');
    expect(list[0].specs[0].price).toBe(9900);
    expect(list[0].deliveryFee).toBe(1000);
    expect(list[0].specs[0]).not.toHaveProperty('available');
  });
  it('关闭平台服务会拒绝列表和报价', async () => {
    db.platformConfig.findUnique.mockResolvedValue({ customEnabled: false });
    await expect(service.list()).rejects.toThrow(BadRequestException);
    await expect(service.quote(7, input)).rejects.toThrow(BadRequestException);
  });
  it('不能购买其他商品规格或使用空白地址', async () => {
    await expect(service.quote(7, { ...input, specId: 21 })).rejects.toThrow(BadRequestException);
    await expect(service.quote(7, { ...input, address: ' ' })).rejects.toThrow(BadRequestException);
  });
  it('报价含平台配送费，校验身份与客户端金额', async () => {
    expect(await service.quote(7, input)).toEqual({ productAmount: 19800, deliveryFee: 1000, discountAmount: 0, payableAmount: 20800 });
    await expect(service.create(7, { ...input, expectedAmount: 1 })).rejects.toThrow(ConflictException);
    expect(db.order.create).not.toHaveBeenCalled();
  });
  it('创建无门店定制订单，不访问门店库存，不伪造支付成功', async () => {
    const order = await service.create(7, input);
    expect(order).toMatchObject({ type: 'CUSTOM', storeId: null, method: 'DELIVERY', status: 'PENDING_DISPATCH', paymentStatus: 'NOT_REQUIRED', payableAmount: 20800 });
    expect(order.serviceSnapshot).toMatchObject({ servicePhone: '4001234567' });
    expect(db.inventoryLog.findUnique).not.toHaveBeenCalled();
  });
  it('重复提交返回原单，拒绝变更参数与跨普通订单的请求键', async () => {
    await service.create(7, input);
    const saved = await db.order.create.mock.results[0].value;
    db.order.findUnique.mockResolvedValue(saved);
    const again = await service.create(7, input);
    expect(again.orderNo).toBe(saved.orderNo);
    expect(db.order.create).toHaveBeenCalledTimes(1);
    await expect(service.create(7, { ...input, quantity: 3 })).rejects.toThrow(ConflictException);
    db.order.findUnique.mockResolvedValue({ ...saved, type: 'ORDINARY' });
    await expect(service.create(7, input)).rejects.toThrow(ConflictException);
  });
  it('用户取消待派单订单不需要门店库存预留记录', async () => {
    await service.create(7, input);
    const saved = await db.order.create.mock.results[0].value;
    db.order.findFirst.mockResolvedValue(saved);
    db.order.findUniqueOrThrow.mockResolvedValue({ ...saved, status: 'CANCELLED', paymentStatus: 'CLOSED' });
    expect((await orders.cancel(7, saved.orderNo)).status).toBe('CANCELLED');
    expect(db.orderLog.create).toHaveBeenCalled();
  });
  it.each(['STORE_MANAGER', 'STORE_ADMIN', 'CUSTOMER_SERVICE'])('拒绝 %s 读取或操作平台业务', async role => {
    const other = { id: 9, role } as CurrentAdmin;
    await expect(service.settings(other)).rejects.toThrow(ForbiddenException);
    await expect(service.manageList({ page: 1, pageSize: 20 }, other)).rejects.toThrow(ForbiddenException);
    await expect(service.manageDetail('CUS1', other)).rejects.toThrow(ForbiddenException);
    await expect(service.action('CUS1', { action: 'complete', version: 0 }, other)).rejects.toThrow(ForbiddenException);
  });
  it('派单要求合作方、状态和版本，重复操作冲突', async () => {
    await service.create(7, input);
    const saved = await db.order.create.mock.results[0].value;
    db.order.findFirst.mockResolvedValue(saved);
    await expect(service.action(saved.orderNo, { action: 'dispatch', version: 0 }, admin)).rejects.toThrow(BadRequestException);
    await expect(service.action(saved.orderNo, { action: 'complete', version: 0 }, admin)).rejects.toThrow(ConflictException);
    await expect(service.action(saved.orderNo, { action: 'dispatch', version: 1 }, admin)).rejects.toThrow(ConflictException);
    db.order.findUniqueOrThrow.mockResolvedValue({ ...saved, status: 'DISPATCHED', version: 1 });
    await service.action(saved.orderNo, { action: 'dispatch', version: 0, partnerName: '合作方', partnerPhone: '13800000000' }, admin);
    expect(db.orderDispatch.create.mock.calls[0][0].data).toMatchObject({ adminId: 1, partnerName: '合作方' });
    db.order.findFirst.mockResolvedValue({ ...saved, status: 'DISPATCHED', version: 1 });
    await expect(service.action(saved.orderNo, { action: 'dispatch', version: 0, partnerName: '合作方', partnerPhone: '13800000000' }, admin)).rejects.toThrow(ConflictException);
  });
  it('DTO 拒绝门店字段、字符串 ID、负数和小数数量', async () => {
    expect(await validate(plainToInstance(CreateBouquetOrderDto, input), { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    for (const bad of [{ ...input, storeId: 1 }, { ...input, bouquetId: '10' }, { ...input, quantity: -1 }, { ...input, quantity: 1.5 }])
      expect((await validate(plainToInstance(CreateBouquetOrderDto, bad), { whitelist: true, forbidNonWhitelisted: true })).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(QuoteBouquetDto, { bouquetId: 10, specId: 20, quantity: 1000, address: '市区' }))).length).toBeGreaterThan(0);
  });
});
