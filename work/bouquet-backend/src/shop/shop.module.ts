import { Controller, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const storeSelect = {
  id: true, name: true, address: true, phone: true, businessHours: true,
  isOpen: true, deliveryArea: true, deliveryFee: true,
} satisfies Prisma.StoreSelect;
const include = {
  product: { include: {
    category: true,
    specs: { where: { enabled: true }, orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
  } },
  stocks: { select: { specId: true, available: true } },
} satisfies Prisma.StoreProductInclude;

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}
  private serializeStore(store: Prisma.StoreGetPayload<{ select: typeof storeSelect }>) {
    return { ...store, deliveryFee: Math.round(Number(store.deliveryFee) * 100) };
  }
  async stores() {
    const stores = await this.prisma.store.findMany({
      where: { enabled: true }, select: storeSelect, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return stores.map((store) => this.serializeStore(store));
  }
  async store(id: number) {
    const store = await this.prisma.store.findFirst({ where: { id, enabled: true }, select: storeSelect });
    if (!store) throw new NotFoundException('门店不存在或已停用');
    return this.serializeStore(store);
  }
  private where(storeId: number): Prisma.StoreProductWhereInput {
    return {
      storeId, enabled: true, store: { enabled: true },
      OR: [{ pickupEnabled: true }, { deliveryEnabled: true }],
      product: { type: 'ORDINARY', enabled: true, specs: { some: { enabled: true } } },
    };
  }
  private serialize(item: Prisma.StoreProductGetPayload<{ include: typeof include }>) {
    const product = item.product;
    return {
      id: product.id, storeProductId: item.id, storeId: item.storeId,
      name: product.name, coverImage: product.coverImage,
      images: Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === 'string') : [],
      description: product.description ?? '',
      category: product.category?.enabled ? { id: product.category.id, name: product.category.name } : null,
      pickupEnabled: item.pickupEnabled, deliveryEnabled: item.deliveryEnabled,
      specs: product.specs.map((spec) => ({
        id: spec.id, name: spec.name, unit: spec.unit,
        price: Math.round(Number(spec.price) * 100),
        available: item.stocks.find((stock) => stock.specId === spec.id)?.available ?? 0,
      })),
    };
  }
  async products(storeId: number) {
    await this.store(storeId);
    const items = await this.prisma.storeProduct.findMany({
      where: this.where(storeId), include,
      orderBy: [{ product: { sortOrder: 'asc' } }, { id: 'asc' }],
    });
    return items.map((item) => this.serialize(item));
  }
  async product(storeId: number, productId: number) {
    await this.store(storeId);
    const item = await this.prisma.storeProduct.findFirst({ where: { ...this.where(storeId), productId }, include });
    if (!item) throw new NotFoundException('该门店暂未上架这款商品');
    return this.serialize(item);
  }
}

@Controller('shop/stores')
export class ShopController {
  constructor(private readonly shop: ShopService) {}
  @Get() stores() { return this.shop.stores(); }
  @Get(':storeId') store(@Param('storeId', ParseIntPipe) id: number) { return this.shop.store(id); }
  @Get(':storeId/products') products(@Param('storeId', ParseIntPipe) id: number) { return this.shop.products(id); }
  @Get(':storeId/products/:productId') product(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) { return this.shop.product(storeId, productId); }
}

@Module({ controllers: [ShopController], providers: [ShopService] })
export class ShopModule {}
