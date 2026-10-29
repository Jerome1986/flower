# 定制鲜花业务流程与接口交接

本轮采用固定成品花束选规格：浏览 → 详情选规格/数量 → 填写收货信息 → 报价 → 创建订单 → 查看结果/详情。仅平台配送，不选门店，不包含自由选花材、人工报价、预约配送、优惠券、真实支付。以下是前端对接约定，不能视为后端已实现或已通过真实联调。

## 数据来源

列表、详情、报价、下单和订单详情统一使用真实后端 API，不使用本地模拟数据。旧版演示订单缓存会在小程序启动时清理。

## 页面与后端职责

| 步骤 | 前端行为 | 后端职责 |
| --- | --- | --- |
| 列表 | 展示上架花束、最低规格起价 | 只返回可展示的商品；无商品返回空数组 |
| 详情 | 展示规格价格、数量限制与配送说明 | 返回当前花束、规格、限购和平台服务配置；下架/不存在拒绝读取 |
| 确认订单 | 可选真实地址簿或手填；未登录引导登录 | 地址簿独立于花束接口；花束请求接收完整地址字符串 |
| 报价 | 地址修改立即清空报价；确认地址后主动刷新 | 校验规格属于花束、数量合法、商品可售；按当前价格计费 |
| 下单 | 校验姓名、电话，锁定提交快照，禁用重复按钮 | 再次校验并计价，在事务中创建订单及快照，按用户和请求键保证幂等 |
| 查看订单 | 创建成功后按订单号读取最新订单 | 用户只能读取本人订单；定制单不进入门店管理订单 |

列表与详情公开访问；真实报价、创建、用户订单查询要求 Bearer Token。平台服务关闭应拒绝报价和创建。报价不代表已预订、已支付或已安排配送。测试创建为 `PENDING_PAYMENT` / `UNPAID`；真实支付及支付后的派单、配送、完成流程由后续业务实现，前端不伪造状态推进。

## 接口与字段

路径相对 `VITE_API_BASE_URL`。成功包裹为 `{ "code": 200, "message": "成功", "data": ... }`，创建可使用 HTTP 201，但包裹 code 仍为 200。ID 为正整数，金额为整数分，日期为 ISO 8601 字符串。响应类型见 `src/types/bouquet.ts`、`src/types/order-api.ts`。

| 方法和路径 | 请求 | data |
| --- | --- | --- |
| GET `/shop/bouquets` | 无；当前不分页 | `BouquetResponse[]` |
| GET `/shop/bouquets/:id` | 数字花束 ID | `BouquetResponse` |
| POST `/user/custom-orders/quote` | `BouquetSelection` | `OrderQuote` |
| POST `/user/custom-orders` | `BouquetSubmission` | `OrderResponse` |
| GET `/user/orders` | 沿用已有约定 | 本人普通及定制订单数组 |
| GET `/user/orders/:orderNo` | 订单号 | 本人的 `OrderResponse` |

### 商品返回示例

列表 data 为以下对象的数组，详情 data 为该对象。图片使用 HTTP(S) URL 或后端站内路径。

```json
{
  "id": 1,
  "name": "温柔玫瑰",
  "coverImage": "/uploads/rose.jpg",
  "images": ["/uploads/rose.jpg"],
  "description": "把温柔与爱意，送给心里的那个人",
  "deliveryFee": 1000,
  "businessHours": "09:00–18:00",
  "servicePhone": "",
  "maxQuantity": 5,
  "specs": [
    { "id": 11, "name": "经典款", "unit": "束", "price": 9900 },
    { "id": 12, "name": "丰盈款", "unit": "束", "price": 15900 }
  ]
}
```

以上字段均应返回，图片和规格允许空数组；无规格时前端禁用购买。详情配送费为参考值，最终以报价为准。当前协议不包含规格库存字段 `available`，限购不等于库存承诺。

### 报价

请求字段全部必填：`bouquetId`、`specId` 为正整数，`quantity` 为 1 至 `maxQuantity` 的整数，`address` 为去除首尾空白后非空、最多 500 字符的完整地址。

```json
{ "bouquetId": 1, "specId": 11, "quantity": 2, "address": "某街道 1 号" }
```

```json
{ "code": 200, "message": "成功", "data": { "productAmount": 19800, "discountAmount": 0, "deliveryFee": 1000, "payableAmount": 20800 } }
```

商品金额 = 当前规格单价 × 数量；无优惠，`discountAmount=0`；应付 = 商品金额 + 配送费。真实配送费用由后端配置决定，不能信任客户端金额。

### 创建订单

在报价字段基础上增加 `requestKey`、`contactName`、`contactPhone`、`remark`、`expectedAmount`。姓名去空白后 1–64 字符；手机号为 1 开头 11 位；备注最多 500 字符，不填写时传空字符串。`expectedAmount` 为本次报价应付整数分。请求不含门店 ID、用户 ID 或客户端指定状态。

```json
{
  "bouquetId": 1, "specId": 11, "quantity": 2,
  "address": "某街道 1 号",
  "requestKey": "client-generated-unique-key",
  "contactName": "收花人", "contactPhone": "13800000000",
  "remark": "送达前请电话联系", "expectedAmount": 20800
}
```

创建及详情的 data 示例（统一包裹同上）：

```json
{
  "version": 1,
  "logs": [{ "action": "CREATED", "createdAt": "2026-10-14T02:00:00.000Z", "remark": null }],
  "orderNo": "CUSTOM202610140001", "userId": 123, "storeId": null,
  "type": "CUSTOM", "method": "DELIVERY",
  "status": "PENDING_PAYMENT", "paymentStatus": "UNPAID",
  "createdAt": "2026-10-14T02:00:00.000Z", "pickupCode": null,
  "contactName": "收花人", "contactPhone": "13800000000",
  "remark": "送达前请电话联系",
  "productAmount": 19800, "discountAmount": 0, "deliveryFee": 1000, "payableAmount": 20800,
  "storeSnapshot": null,
  "serviceSnapshot": { "servicePhone": "", "businessHours": "09:00–18:00" },
  "addressSnapshot": { "detail": "某街道 1 号" },
  "item": { "specId": 11, "productName": "温柔玫瑰", "coverImage": "/uploads/rose.jpg", "specName": "经典款", "unit": "束", "quantity": 2 }
}
```

商品、收货信息、金额及服务信息须保存下单快照，不能因商品后续修改而改变历史订单。`storeId`、`storeSnapshot`、`pickupCode` 为 null；用户身份由 Token 决定。

## 幂等、错误与后续联调

- 唯一约束建议为用户 ID + `requestKey`。相同键和请求返回原订单；相同键不同请求拒绝；并发重试不能重复创建。应先判断已成功请求，再处理当前商品可售和价格变化，以保证成功订单可重放。
- 网络中断或 5xx 时，前端保留原始请求键、联系人、地址及金额，重试使用同一快照。明确的业务 4xx 拒绝后解锁并重新加载；401 由真实登录流程处理。
- 价格变化返回明确失败信息，前端刷新报价，用户再次确认后提交。旧报价响应不得覆盖新地址报价。
- 建议错误：400 参数或配送范围无效；401 未登录/身份失效；404 商品或本人订单不存在；409 商品不可售、金额变化或幂等参数冲突。错误包裹示例：HTTP 409，`{ "code": 409, "message": "金额已变化，请重新报价", "data": null }`。真实实现需保持 HTTP 错误状态，不能仅用 HTTP 200 表达失败。
- 联调需覆盖下架、规格变更、数量限制、价格变动、重复并发创建及跨用户查询。

验证命令：`pnpm check:integration`、`pnpm tsc`、`pnpm build:h5`、`pnpm build:mp-weixin`。微信开发者工具及真机还需检查图片、键盘与底部安全区。
