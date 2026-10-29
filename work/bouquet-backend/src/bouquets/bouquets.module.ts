import { Body, Controller, Get, HttpCode, Module, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard, type UserRequest } from '../user-auth/user-auth';
import { UserAuthModule } from '../user-auth/user-auth.module';
import { AdminAuthGuard, type AdminRequest } from '../common/guards/admin-auth.guard';
import { OrdersModule } from '../orders/orders.module';
import { BouquetsService } from './bouquets.service';
import { BouquetSettingsDto, CreateBouquetOrderDto, CustomOrderAction, CustomOrderQuery, QuoteBouquetDto } from './bouquets.dto';

@Controller('shop/bouquets')
export class BouquetsController {
  constructor(private readonly service: BouquetsService) {}
  @Get() list() { return this.service.list(); }
  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) { return this.service.detail(id); }
}
@Controller('user/custom-orders')
@UseGuards(UserAuthGuard)
export class CustomOrdersController {
  constructor(private readonly service: BouquetsService) {}
  @Post('quote') @HttpCode(200) quote(@Req() req: UserRequest, @Body() dto: QuoteBouquetDto) { return this.service.quote(req.userId, dto); }
  @Post() create(@Req() req: UserRequest, @Body() dto: CreateBouquetOrderDto) { return this.service.create(req.userId, dto); }
}
@Controller('admin/custom-orders')
@UseGuards(AdminAuthGuard)
export class CustomOrdersAdminController {
  constructor(private readonly service: BouquetsService) {}
  @Get() list(@Query() query: CustomOrderQuery, @Req() req: AdminRequest) { return this.service.manageList(query, req.admin); }
  @Get(':orderNo') detail(@Param('orderNo') no: string, @Req() req: AdminRequest) { return this.service.manageDetail(no, req.admin); }
  @Post(':orderNo/actions') @HttpCode(200) action(@Param('orderNo') no: string, @Body() dto: CustomOrderAction, @Req() req: AdminRequest) { return this.service.action(no, dto, req.admin); }
}
@Controller('admin/custom-settings')
@UseGuards(AdminAuthGuard)
export class CustomSettingsController {
  constructor(private readonly service: BouquetsService) {}
  @Get() get(@Req() req: AdminRequest) { return this.service.settings(req.admin); }
  @Put() save(@Body() dto: BouquetSettingsDto, @Req() req: AdminRequest) { return this.service.saveSettings(dto, req.admin); }
}
@Module({ imports: [UserAuthModule, OrdersModule], controllers: [BouquetsController, CustomOrdersController, CustomOrdersAdminController, CustomSettingsController], providers: [BouquetsService, AdminAuthGuard] })
export class BouquetsModule {}
