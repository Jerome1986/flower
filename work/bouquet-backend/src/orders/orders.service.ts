import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UserAuthService } from '../user-auth/user-auth';
import { CreateOrderDto, QuoteOrderDto } from './orders.dto';

const include = {
  item: true,
  logs: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;
type SavedOrder = Prisma.OrderGetPayload<{ include: typeof include }>;
const cents = (value: Prisma.Decimal | number) =>
  Math.round(Number(value) * 100);
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserAuthService,
  ) {}
  private async selection(
    dto: QuoteOrderDto,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const selected = await db.storeProduct.findFirst({
      where: {
        storeId: dto.storeId,
        productId: dto.productId,
        enabled: true,
        store: { enabled: true, isOpen: true },
        product: { enabled: true, type: 'ORDINARY' },
      },
      include: {
        store: true,
        product: { include: { category: true } },
        stocks: { where: { specId: dto.specId } },
      },
    });
    const spec = await db.productSpec.findFirst({
      where: { id: dto.specId, productId: dto.productId, enabled: true },
    });
    if (!selected || !spec)
      throw new BadRequestException('门店休息、商品已下架或规格不可用');
    if (
      !(dto.method === 'pickup'
        ? selected.pickupEnabled
        : selected.deliveryEnabled)
    )
      throw new BadRequestException('商品不支持此收花方式');
    const stock = selected.stocks[0];
    if (!stock || stock.available < dto.quantity)
      throw new ConflictException('库存不足，请重新选择');
    const productAmount = cents(spec.price) * dto.quantity;
    const deliveryFee =
      dto.method === 'delivery' ? cents(selected.store.deliveryFee) : 0;
    return {
      selected,
      spec,
      stock,
      productAmount,
      deliveryFee,
      payableAmount: productAmount + deliveryFee,
    };
  }
  async quote(userId: number, dto: QuoteOrderDto) {
    await this.users.currentUser(userId);
    const data = await this.selection(dto);
    return {
      productAmount: data.productAmount,
      deliveryFee: data.deliveryFee,
      discountAmount: 0,
      payableAmount: data.payableAmount,
    };
  }
  serialize(order: SavedOrder) {
    return {
      ...order,
      pickupCode:
        order.status === 'READY' && order.method === 'PICKUP'
          ? order.pickupCode
          : null,
      productAmount: cents(order.productAmount),
      discountAmount: cents(order.discountAmount),
      deliveryFee: cents(order.deliveryFee),
      payableAmount: cents(order.payableAmount),
      item: order.item && {
        ...order.item,
        unitPrice: cents(order.item.unitPrice),
        productAmount: cents(order.item.productAmount),
        discountAmount: cents(order.item.discountAmount),
      },
    };
  }
  private assertSame(order: SavedOrder, dto: CreateOrderDto) {
    const address = order.addressSnapshot as Prisma.JsonObject | null;
    if (
      order.type !== 'ORDINARY' ||
      (order.serviceSnapshot as Prisma.JsonObject)?.productId !==
        dto.productId ||
      order.storeId !== dto.storeId ||
      order.item?.specId !== dto.specId ||
      order.item?.quantity !== dto.quantity ||
      order.method !== (dto.method === 'pickup' ? 'PICKUP' : 'DELIVERY') ||
      order.contactName !== dto.contactName.trim() ||
      order.contactPhone !== dto.contactPhone ||
      (address?.detail ?? '') !==
        (dto.method === 'delivery' ? (dto.address?.trim() ?? '') : '') ||
      (order.remark ?? '') !== (dto.remark?.trim() ?? '') ||
      cents(order.payableAmount) !== dto.expectedAmount
    )
      throw new ConflictException('重复提交的内容已变化，请重新进入结算页');
    return this.serialize(order);
  }
  async create(userId: number, dto: CreateOrderDto) {
    await this.users.currentUser(userId);
    if (!dto.contactName.trim()) throw new BadRequestException('请填写联系人');
    if (dto.method === 'delivery' && !dto.address?.trim())
      throw new BadRequestException('请填写配送地址');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prior = await tx.order.findUnique({
          where: { userId_requestKey: { userId, requestKey: dto.requestKey } },
          include,
        });
        if (prior) return this.assertSame(prior, dto);
        const {
          selected,
          spec,
          stock,
          productAmount,
          deliveryFee,
          payableAmount,
        } = await this.selection(dto, tx);
        if (dto.expectedAmount !== payableAmount)
          throw new ConflictException('价格或配送费已变化，请刷新金额后确认');
        const reserved = await tx.storeStock.updateMany({
          where: {
            id: stock.id,
            available: { gte: dto.quantity },
            version: stock.version,
          },
          data: {
            available: { decrement: dto.quantity },
            reserved: { increment: dto.quantity },
            version: { increment: 1 },
          },
        });
        if (reserved.count !== 1)
          throw new ConflictException('库存已变化，请重新提交');
        const store = selected.store;
        const order = await tx.order.create({
          data: {
            orderNo: `ORD${randomUUID().replace(/-/g, '')}`,
            userId,
            requestKey: dto.requestKey,
            type: 'ORDINARY',
            storeId: store.id,
            method: dto.method === 'pickup' ? 'PICKUP' : 'DELIVERY',
            // TODO(payment): 接入支付后改为 PENDING_PAYMENT，并由支付成功回调确认订单。
            status: 'PENDING_ACCEPTANCE',
            paymentStatus: 'NOT_REQUIRED',
            contactName: dto.contactName.trim(),
            contactPhone: dto.contactPhone,
            ...(dto.method === 'delivery'
              ? { addressSnapshot: { detail: dto.address!.trim() } }
              : {}),
            storeSnapshot: {
              id: store.id,
              name: store.name,
              address: store.address,
              phone: store.phone,
              hours: store.businessHours,
            },
            serviceSnapshot: {
              productId: dto.productId,
              deliveryArea: store.deliveryArea,
              deliveryFee,
            },
            remark: dto.remark?.trim(),
            productAmount: productAmount / 100,
            deliveryFee: deliveryFee / 100,
            payableAmount: payableAmount / 100,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            item: {
              create: {
                specId: spec.id,
                productName: selected.product.name,
                categoryName: selected.product.category?.name,
                coverImage: selected.product.coverImage,
                specName: spec.name,
                unit: spec.unit,
                unitPrice: spec.price,
                quantity: dto.quantity,
                stemsPerUnit: spec.stemsPerUnit,
                productAmount: productAmount / 100,
              },
            },
            logs: {
              create: {
                actorType: 'USER',
                actorId: userId,
                action: 'CREATE',
                toStatus: 'PENDING_ACCEPTANCE',
                toPaymentStatus: 'NOT_REQUIRED',
                operationKey: `create:${userId}:${dto.requestKey}`,
                remark: '订单已创建，等待门店接单',
              },
            },
          },
          include,
        });
        await tx.inventoryLog.create({
          data: {
            stockId: stock.id,
            orderId: order.id,
            type: 'RESERVE',
            availableBefore: stock.available,
            availableAfter: stock.available - dto.quantity,
            reservedBefore: stock.reserved,
            reservedAfter: stock.reserved + dto.quantity,
            reason: '订单创建预留库存',
            operationKey: `reserve:${order.id}`,
          },
        });
        return this.serialize(order);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002')
      ) {
        const prior = await this.prisma.order.findUnique({
          where: { userId_requestKey: { userId, requestKey: dto.requestKey } },
          include,
        });
        if (prior) return this.assertSame(prior, dto);
      }
      throw error;
    }
  }
  async list(userId: number) {
    await this.users.currentUser(userId);
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return orders.map((order) => this.serialize(order));
  }
  async detail(userId: number, orderNo: string) {
    await this.users.currentUser(userId);
    const order = await this.prisma.order.findFirst({
      where: { userId, orderNo },
      include,
    });
    if (!order) throw new NotFoundException('订单不存在');
    return this.serialize(order);
  }
  async cancel(
    userId: number,
    orderNo: string,
    expired = false,
    operator?: { id: number; role: string; version?: number },
  ) {
    if (!expired && !operator) await this.users.currentUser(userId);
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { userId, orderNo },
        include,
      });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.status === 'CANCELLED' || order.status === 'CLOSED')
        return this.serialize(order);
      if (operator?.version !== undefined && operator.version !== order.version)
        throw new ConflictException('订单已变化，请刷新');
      const allowed = order.type === 'CUSTOM'
        ? ['PENDING_DISPATCH']
        : operator
        ? ['PENDING_ACCEPTANCE', 'ACCEPTED', 'READY']
        : ['PENDING_ACCEPTANCE'];
      if (!allowed.includes(order.status))
        throw new ConflictException('当前订单不能取消');
      const result = await tx.order.updateMany({
        where: { id: order.id, status: order.status, version: order.version },
        data: {
          status: expired ? 'CLOSED' : 'CANCELLED',
          paymentStatus: 'CLOSED',
          version: { increment: 1 },
          ...(expired ? { closedAt: new Date() } : { cancelledAt: new Date() }),
          cancelReason: expired ? '订单超时关闭' : '用户取消订单',
        },
      });
      if (result.count !== 1)
        throw new ConflictException('订单状态已变化，请刷新');
      const reservation = await tx.inventoryLog.findUnique({
        where: { operationKey: `reserve:${order.id}` },
      });
      if (order.type === 'ORDINARY' && (!reservation || !order.item))
        throw new ConflictException('订单库存预留记录缺失，请联系管理员');
      if (order.type === 'ORDINARY' && reservation && order.item) {
        const stock = await tx.storeStock.findUniqueOrThrow({
          where: { id: reservation.stockId },
        });
        const quantity = order.item.quantity;
        const released = await tx.storeStock.updateMany({
          where: {
            id: stock.id,
            version: stock.version,
            reserved: { gte: quantity },
          },
          data: {
            available: { increment: quantity },
            reserved: { decrement: quantity },
            version: { increment: 1 },
          },
        });
        if (released.count !== 1)
          throw new ConflictException('库存已变化，请重试');
        await tx.inventoryLog.create({
          data: {
            stockId: stock.id,
            orderId: order.id,
            type: 'RELEASE',
            availableBefore: stock.available,
            availableAfter: stock.available + quantity,
            reservedBefore: stock.reserved,
            reservedAfter: stock.reserved - quantity,
            reason: expired ? '订单超时释放库存' : '取消订单释放库存',
            operationKey: `release:${order.id}`,
          },
        });
      }
      await tx.orderLog.create({
        data: {
          orderId: order.id,
          actorType: expired
            ? 'SYSTEM'
            : operator
              ? operator.role === 'STORE_MANAGER'
                ? 'MANAGER'
                : 'ADMIN'
              : 'USER',
          actorId: expired ? null : (operator?.id ?? userId),
          action: expired ? 'EXPIRE' : 'CANCEL',
          fromStatus: order.status,
          toStatus: expired ? 'CLOSED' : 'CANCELLED',
          fromPaymentStatus: order.paymentStatus,
          toPaymentStatus: 'CLOSED',
          operationKey: `cancel:${order.id}`,
        },
      });
      return this.serialize(
        await tx.order.findUniqueOrThrow({ where: { id: order.id }, include }),
      );
    });
  }
  @Interval(60000)
  async closeExpired() {
    const orders = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', expiresAt: { lte: new Date() } },
      select: { userId: true, orderNo: true },
      take: 100,
    });
    for (const order of orders) {
      try {
        await this.cancel(order.userId, order.orderNo, true);
      } catch {
        /* 下轮重试并发冲突，不影响其他订单。 */
      }
    }
  }
}
