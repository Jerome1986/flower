const fs = require('fs')
const path = require('path')
const source = path.resolve(__dirname, '../../flower-api')
const target = path.resolve(__dirname, '../work/bouquet-backend')
const files = ['prisma/schema.prisma','src/app.module.ts','src/product/product.dto.ts','src/product/product.service.ts','src/shop/shop.module.ts','src/store-product/store-product.service.ts','src/orders/orders.service.ts','src/orders/orders.module.ts']
for (const file of files) {
  const dest = path.join(target, file)
  fs.mkdirSync(path.dirname(dest), {recursive:true})
  fs.copyFileSync(path.join(source,file), dest)
}
function edit(file, fn) {
  const dest = path.join(target,file)
  fs.writeFileSync(dest, fn(fs.readFileSync(dest,'utf8').replace(/\r\n/g,'\n')))
}
edit('prisma/schema.prisma', s => s.replace('model Product {', 'model Product {\n  /// 普通门店商品或平台成品花束，创建后不可切换。\n  type          OrderType        @default(ORDINARY)'))
edit('src/product/product.dto.ts', s => s.replace('  IsInt,','  IsInt,\n  IsIn,').replace('export class ProductQueryDto {', "export class ProductQueryDto {\n  @IsOptional() @IsIn(['ORDINARY', 'CUSTOM']) type?: 'ORDINARY' | 'CUSTOM';").replace('export class SaveProductDto {', "export class SaveProductDto {\n  @IsOptional() @IsIn(['ORDINARY', 'CUSTOM']) type?: 'ORDINARY' | 'CUSTOM';"))
edit('src/product/product.service.ts', s => s.replace('enabled: query.enabled,','enabled: query.enabled,\n      type: query.type,').replace("if (id !== undefined && !old) throw new NotFoundException('商品不存在');", "if (id !== undefined && !old) throw new NotFoundException('商品不存在');\n        if (old && dto.type && old.type !== dto.type)\n          throw new BadRequestException('商品类型创建后不能修改，请新建商品');"))
edit('src/shop/shop.module.ts', s => s.replace('product: { enabled: true, specs:', "product: { type: 'ORDINARY', enabled: true, specs:"))
edit('src/store-product/store-product.service.ts', s => s.replace('const where: Prisma.ProductWhereInput = {', "const where: Prisma.ProductWhereInput = {\n      type: 'ORDINARY',").replace('if (!product?.enabled || !product.specs.length)', "if (!product?.enabled || product.type !== 'ORDINARY' || !product.specs.length)"))
edit('src/orders/orders.service.ts', s => s.replace('product: { enabled: true },', "product: { enabled: true, type: 'ORDINARY' },").replace('(order.serviceSnapshot as Prisma.JsonObject)?.productId !==', "order.type !== 'ORDINARY' ||\n      (order.serviceSnapshot as Prisma.JsonObject)?.productId !==").replace("const allowed = operator\n        ?", "const allowed = order.type === 'CUSTOM'\n        ? ['PENDING_DISPATCH']\n        : operator\n        ?").replace('if (!reservation || !order.item)', "if (order.type === 'ORDINARY' && (!reservation || !order.item))").replace('if (reservation && order.item) {', "if (order.type === 'ORDINARY' && reservation && order.item) {"))
edit('src/orders/orders.module.ts', s => s.replace('providers: [OrdersService, ManageOrdersService],','providers: [OrdersService, ManageOrdersService],\n  exports: [OrdersService],'))
edit('src/app.module.ts', s => "import { BouquetsModule } from './bouquets/bouquets.module';\n" + s.replace('    OrdersModule,', '    OrdersModule,\n    BouquetsModule,'))
fs.mkdirSync(path.join(target,'prisma/migrations/20261014090000_product_type'), {recursive:true})
fs.writeFileSync(path.join(target,'prisma/migrations/20261014090000_product_type/migration.sql'), "-- Existing products remain ordinary; custom products are explicitly created by platform admins.\nALTER TABLE `product` ADD COLUMN `type` ENUM('ORDINARY', 'CUSTOM') NOT NULL DEFAULT 'ORDINARY';\n")
fs.writeFileSync(path.join(target,'base-hashes.json'), JSON.stringify(Object.fromEntries(files.map(f => [f,require('crypto').createHash('sha256').update(fs.readFileSync(path.join(source,f))).digest('hex')])), null, 2))
