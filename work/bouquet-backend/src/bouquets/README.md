# 平台成品花束接口

所有路由前缀 `/api`，沿用 `{ code: 200, data, message }` 响应，金额统一整数分。

| 方法 | 路由 | 身份 | 用途 |
| --- | --- | --- | --- |
| GET | /shop/bouquets | 公开 | 已启用 CUSTOM 商品和启用规格 |
| GET | /shop/bouquets/:id | 公开 | 花束详情、配送区域/费用、营业时间、客服电话 |
| POST | /user/custom-orders/quote | 用户 | 平台配送报价 |
| POST | /user/custom-orders | 用户 | 幂等创建定制订单 |
| GET | /user/orders | 用户 | 普通及定制订单，只返回本人数据 |
| GET | /user/orders/:orderNo | 用户 | 本人订单详情 |
| POST | /user/orders/:orderNo/cancel | 用户 | 取消待派单定制订单 |
| GET / PUT | /admin/custom-settings | 平台管理员 | 定制服务开关、配送区域/费、营业时间、客服电话和配送人员说明 |
| GET | /admin/custom-orders | 平台管理员 | 分页列表，page/pageSize/status |
| GET | /admin/custom-orders/:orderNo | 平台管理员 | 详情及派单历史 |
| POST | /admin/custom-orders/:orderNo/actions | 平台管理员 | dispatch/deliver/complete/cancel，必传 version；派单还需 partnerName/partnerPhone |

报价请求：`{ bouquetId: 10, specId: 20, quantity: 1, address: "市区花园路" }`。
提交在此基础上增加 `requestKey`（16–64 位字母数字或横线）、`contactName`、`contactPhone`、`remark`（可选）、`expectedAmount`（分）。
报价响应：`{ productAmount, discountAmount: 0, deliveryFee, payableAmount }`；提交响应复用普通订单结构。
列表/详情规格价格为分；`maxQuantity: 999` 是单笔参数上限，不是库存或每日限单。无门店 ID，不扣门店库存，不接收优惠券字段。

商品沿用 `/admin/products` 的创建、编辑、上下架能力，新增 `type: CUSTOM`；原商品默认 ORDINARY。类型创建后不能修改，避免门店选品或历史订单串业务。创建花束需要真实名称、图片、规格和价格，本次不自动写入虚构商品。
平台设置 PUT 请求包含 `customEnabled`、`deliveryArea`、`deliveryFee`（分）、`businessHours`、`servicePhone`、`deliveryStaff`。平台关闭或未配置配送区域时拒绝新查询/下单；原订单仍可查询和处理。配送范围为人工配置说明，不作地址地理校验。

定制订单状态：PENDING_DISPATCH → DISPATCHED → DELIVERING → COMPLETED。待派单或已派单可由平台取消，用户只能取消待派单订单。派单历史仅后台可见，用户看到平台客服电话。门店管理员和店长无定制接口权限。

## 当前支付边界

与项目当前普通订单一致，创建的是测试订单：NOT_REQUIRED / PENDING_DISPATCH，不调用微信支付、不写 PAID。正金额订单前端标注“支付待接入”。此模式不代表正式收款完成。正式收款仍需独立支付接口、回调验签和退款流程。

## 数据库升级与配置

先执行 `prisma migrate deploy` 应用 `20261014090000_product_type`，再执行 `prisma generate` 并重启服务。迁移仅新增商品类型列，现有商品保持 ORDINARY。
通过商品管理接口创建 `type: CUSTOM` 的沉鱼、落雁、闭月并设置真实售价/图片；通过平台设置接口填写配送信息并启用。前端空列表表示尚未上架，不回退演示数据。
