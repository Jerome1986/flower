import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UserAuthService } from '../user-auth/user-auth';
import { OrdersService } from '../orders/orders.service';
import type { CurrentAdmin } from '../common/guards/admin-auth.guard';
import { BouquetSettingsDto, CreateBouquetOrderDto, CustomOrderAction, CustomOrderQuery, QuoteBouquetDto } from './bouquets.dto';

const productInclude = {
  specs: { where: { enabled: true }, orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.ProductInclude;
const orderInclude = { item: true, logs: { orderBy: { createdAt: 'asc' as const } } } satisfies Prisma.OrderInclude;
type SavedOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
const cents = (value: Prisma.Decimal | number) => Math.round(Number(value) * 100);

@Injectable()
export class BouquetsService {
  constructor(private readonly prisma: PrismaService, private readonly users: UserAuthService, private readonly orders: OrdersService) {}

  private authorize(admin: CurrentAdmin) {
    if (!['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(admin.role))
      throw new ForbiddenException('仅平台管理员可管理定制业务');
  }
  private async config(db: Prisma.TransactionClient = this.prisma) {
    const config = await db.platformConfig.findUnique({ where: { id: 1 } });
    if (!config?.customEnabled || !config.deliveryArea?.trim())
      throw new BadRequestException('定制服务暂未开放');
    return config;
  }
  private output(product: Prisma.ProductGetPayload<{ include: typeof productInclude }>, config: Awaited<ReturnType<BouquetsService['config']>>) {
    return {
      id: product.id, name: product.name, coverImage: product.coverImage,
      images: Array.isArray(product.images) ? product.images.filter((item): item is string => typeof item === 'string') : [],
      description: product.description ?? '',
      deliveryArea: config.deliveryArea, deliveryFee: cents(config.deliveryFee),
      businessHours: config.businessHours ?? '', servicePhone: config.servicePhone ?? '',
      // 每笔数量校验上限，不是库存或每日限单；定制订单不扣门店库存。
      maxQuantity: 999,
      specs: product.specs.map(spec => ({ id: spec.id, name: spec.name, unit: spec.unit, price: cents(spec.price) })),
    };
  }
  async list() {
    const config = await this.config();
    const products = await this.prisma.product.findMany({
      where: { type: 'CUSTOM', enabled: true, specs: { some: { enabled: true } } },
      include: productInclude, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return products.map(product => this.output(product, config));
  }
  async detail(id: number) {
    const config = await this.config();
    const product = await this.prisma.product.findFirst({
      where: { id, type: 'CUSTOM', enabled: true, specs: { some: { enabled: true } } }, include: productInclude,
    });
    if (!product) throw new NotFoundException('花束不存在或已下架');
    return this.output(product, config);
  }
  private async selection(dto: QuoteBouquetDto, db: Prisma.TransactionClient = this.prisma) {
    if (!dto.address.trim()) throw new BadRequestException('请填写配送地址');
    const config = await this.config(db);
    const product = await db.product.findFirst({ where: { id: dto.bouquetId, type: 'CUSTOM', enabled: true }, include: productInclude });
    const spec = product?.specs.find(item => item.id === dto.specId);
    if (!product || !spec) throw new BadRequestException('花束或规格已下架，请重新选择');
    const productAmount = cents(spec.price) * dto.quantity;
    const deliveryFee = cents(config.deliveryFee);
    const payableAmount = productAmount + deliveryFee;
    if (!Number.isSafeInteger(payableAmount) || payableAmount > 999999999)
      throw new BadRequestException('订单金额超过限制，请减少数量');
    return { config, product, spec, quote: { productAmount, deliveryFee, discountAmount: 0, payableAmount } };
  }
  async quote(userId: number, dto: QuoteBouquetDto) {
    await this.users.currentUser(userId);
    return (await this.selection(dto)).quote;
  }
  private same(order: SavedOrder, dto: CreateBouquetOrderDto) {
    if (order.type !== 'CUSTOM' || order.storeId !== null || order.method !== 'DELIVERY' ||
      (order.serviceSnapshot as Prisma.JsonObject)?.productId !== dto.bouquetId ||
      order.item?.specId !== dto.specId || order.item?.quantity !== dto.quantity ||
      order.contactName !== dto.contactName.trim() || order.contactPhone !== dto.contactPhone ||
      (order.addressSnapshot as Prisma.JsonObject)?.detail !== dto.address.trim() ||
      (order.remark ?? '') !== (dto.remark?.trim() ?? '') || cents(order.payableAmount) !== dto.expectedAmount)
      throw new ConflictException('重复提交的内容已变化，请重新进入结算页');
    return this.orders.serialize(order);
  }
  async create(userId: number, dto: CreateBouquetOrderDto) {
    await this.users.currentUser(userId);
    if (!dto.contactName.trim()) throw new BadRequestException('请填写联系人');
    try {
      return await this.prisma.$transaction(async tx => {
        const prior = await tx.order.findUnique({ where: { userId_requestKey: { userId, requestKey: dto.requestKey } }, include: orderInclude });
        if (prior) return this.same(prior, dto);
        const { config, product, spec, quote } = await this.selection(dto, tx);
        if (dto.expectedAmount !== quote.payableAmount) throw new ConflictException('价格或配送费已变化，请重新报价');
        const order = await tx.order.create({
          data: {
            orderNo: `CUS${randomUUID().replace(/-/g, '')}`, userId, requestKey: dto.requestKey,
            type: 'CUSTOM', storeId: null, method: 'DELIVERY',
            // 与现有普通订单相同的测试下单模式；没有收款，也不标记 PAID。
            status: 'PENDING_DISPATCH', paymentStatus: 'NOT_REQUIRED',
            contactName: dto.contactName.trim(), contactPhone: dto.contactPhone,
            addressSnapshot: { detail: dto.address.trim() }, remark: dto.remark?.trim(),
            serviceSnapshot: { productId: product.id, deliveryArea: config.deliveryArea, deliveryFee: quote.deliveryFee, servicePhone: config.servicePhone, businessHours: config.businessHours },
            productAmount: quote.productAmount / 100, deliveryFee: quote.deliveryFee / 100, payableAmount: quote.payableAmount / 100,
            item: { create: { specId: spec.id, productName: product.name, coverImage: product.coverImage, specName: spec.name, unit: spec.unit, unitPrice: spec.price, quantity: dto.quantity, stemsPerUnit: spec.stemsPerUnit, productAmount: quote.productAmount / 100 } },
            logs: { create: { actorType: 'USER', actorId: userId, action: 'CREATE', toStatus: 'PENDING_DISPATCH', toPaymentStatus: 'NOT_REQUIRED', operationKey: `create:${userId}:${dto.requestKey}`, remark: '测试订单已创建，等待平台派单；支付待接入' } },
          }, include: orderInclude,
        });
        return this.orders.serialize(order);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const prior = await this.prisma.order.findUnique({ where: { userId_requestKey: { userId, requestKey: dto.requestKey } }, include: orderInclude });
        if (prior) return this.same(prior, dto);
      }
      throw error;
    }
  }
  async settings(admin: CurrentAdmin) {
    this.authorize(admin);
    const config = await this.prisma.platformConfig.findUnique({ where: { id: 1 } });
    return { customEnabled: config?.customEnabled ?? false, deliveryArea: config?.deliveryArea ?? '', deliveryFee: cents(config?.deliveryFee ?? 0), businessHours: config?.businessHours ?? '', servicePhone: config?.servicePhone ?? '', deliveryStaff: config?.deliveryStaff ?? '' };
  }
  async saveSettings(dto: BouquetSettingsDto, admin: CurrentAdmin) {
    this.authorize(admin);
    if (!dto.deliveryArea.trim()) throw new BadRequestException('请填写配送区域');
    const data = { ...dto, deliveryArea: dto.deliveryArea.trim(), deliveryFee: new Prisma.Decimal(dto.deliveryFee).div(100) };
    // 只更新独立列，保留首页 banners 等配置。
    await this.prisma.platformConfig.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    return this.settings(admin);
  }
  async manageList(query: CustomOrderQuery, admin: CurrentAdmin) {
    this.authorize(admin);
    const where = { type: 'CUSTOM' as const, status: query.status };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, include: orderInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.order.count({ where }),
    ]);
    return { list: list.map(order => this.orders.serialize(order)), total, page: query.page, pageSize: query.pageSize };
  }
  async manageDetail(orderNo: string, admin: CurrentAdmin) {
    this.authorize(admin);
    const order = await this.prisma.order.findFirst({ where: { orderNo, type: 'CUSTOM' }, include: { ...orderInclude, dispatches: { orderBy: { createdAt: 'asc' } } } });
    if (!order) throw new NotFoundException('定制订单不存在');
    return { ...this.orders.serialize(order), dispatches: order.dispatches };
  }
  async action(orderNo: string, dto: CustomOrderAction, admin: CurrentAdmin) {
    this.authorize(admin);
    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { orderNo, type: 'CUSTOM' }, include: orderInclude });
      if (!order) throw new NotFoundException('定制订单不存在');
      if (order.version !== dto.version) throw new ConflictException('订单已变化，请刷新');
      const transitions = {
        dispatch: { from: ['PENDING_DISPATCH', 'DISPATCHED'], to: 'DISPATCHED' as const },
        deliver: { from: ['DISPATCHED'], to: 'DELIVERING' as const },
        complete: { from: ['DELIVERING'], to: 'COMPLETED' as const },
        cancel: { from: ['PENDING_DISPATCH', 'DISPATCHED'], to: 'CANCELLED' as const },
      };
      const next = transitions[dto.action as keyof typeof transitions];
      if (!next || !next.from.includes(order.status)) throw new ConflictException('当前状态不能执行此操作');
      if (dto.action === 'cancel' && order.paymentStatus === 'PAID') throw new ConflictException('已付款订单需走退款流程');
      if (dto.action === 'dispatch' && (!dto.partnerName?.trim() || !dto.partnerPhone?.trim())) throw new BadRequestException('请填写合作方名称和电话');
      const result = await tx.order.updateMany({ where: { id: order.id, type: 'CUSTOM', version: dto.version, status: order.status }, data: { status: next.to, version: { increment: 1 }, ...(next.to === 'COMPLETED' ? { completedAt: new Date() } : {}), ...(next.to === 'CANCELLED' ? { cancelledAt: new Date(), paymentStatus: 'CLOSED', cancelReason: dto.remark?.trim() || '平台取消订单' } : {}) } });
      if (result.count !== 1) throw new ConflictException('订单已变化，请刷新');
      const operationKey = `custom:${order.id}:${dto.version}:${dto.action}`;
      if (dto.action === 'dispatch') await tx.orderDispatch.create({ data: { orderId: order.id, partnerName: dto.partnerName!.trim(), partnerPhone: dto.partnerPhone!.trim(), adminId: admin.id, remark: dto.remark?.trim(), operationKey } });
      await tx.orderLog.create({ data: { orderId: order.id, actorType: 'ADMIN', actorId: admin.id, action: dto.action, fromStatus: order.status, toStatus: next.to, fromPaymentStatus: order.paymentStatus, toPaymentStatus: next.to === 'CANCELLED' ? 'CLOSED' : order.paymentStatus, operationKey, remark: dto.remark?.trim() } });
      return this.orders.serialize(await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude }));
    });
  }
}
