import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserAuthGuard, type UserRequest } from '../user-auth/user-auth';
import { UserAuthModule } from '../user-auth/user-auth.module';
import { CreateOrderDto, QuoteOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';
import {
  ManageOrdersController,
  ManageOrdersService,
} from './orders-management';

@Controller('user/orders')
@UseGuards(UserAuthGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}
  @Post('quote') @HttpCode(200) quote(
    @Req() req: UserRequest,
    @Body() dto: QuoteOrderDto,
  ) {
    return this.service.quote(req.userId, dto);
  }
  @Post() create(@Req() req: UserRequest, @Body() dto: CreateOrderDto) {
    return this.service.create(req.userId, dto);
  }
  @Get() list(@Req() req: UserRequest) {
    return this.service.list(req.userId);
  }
  @Get(':orderNo') detail(
    @Req() req: UserRequest,
    @Param('orderNo') no: string,
  ) {
    return this.service.detail(req.userId, no);
  }
  @Post(':orderNo/cancel') @HttpCode(200) cancel(
    @Req() req: UserRequest,
    @Param('orderNo') no: string,
  ) {
    return this.service.cancel(req.userId, no);
  }
}
@Module({
  imports: [UserAuthModule],
  controllers: [OrdersController, ManageOrdersController],
  providers: [OrdersService, ManageOrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
