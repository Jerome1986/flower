# 前端分步对接与接口交接

更新：2026-10-11。地址及销售统计后端已实现并接入前端；地址 65 次、统计 105 项真实 HTTP/MySQL 验证通过，前端 21 组回归通过。营销、花束及微信真机验收仍待完成。

## 阶段状态

| 步骤           | 前端交付                                                                                      | 接口状态                | 验收与下一步                                                                              |
| -------------- | --------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| 1 普通订单     | 入口校验、异步登录返回、用户/店长订单、提交幂等重试、取货码核销、并发及账户隔离               | 沿用现有接口            | 隔离回归通过；需真实服务跑完自取、配送、取消、库存及权限验收                              |
| 2 地址         | 真实增删改查/默认地址、省市区分字段、结算回填与默认值保护                                     | 已接入 /user/addresses  | 后端 27 项测试、65 次真实 SQL/HTTP 检查、前端 19 组回归通过；真机待验收                   |
| 3 店长统计     | 可管理门店、今日/近 7 天/本月筛选、个人页摘要、异常赠花及未知支数提示                         | 已接入 GET /admin/sales | 13 项统计单测、105 项真实 HTTP/SQL 断言、前端回归与双端构建通过；真机及营销赠花闭环待验收 |
| 4 优惠券与邀请 | 卡包状态/服务端规则、新人花礼、服务端邀请码/分享/记录、独立邀请人数和奖励数、预备选券报价流程 | 全部预留                | 前端就绪，待营销协议；用券与绑定开关保持关闭                                              |
| 5 成品花束     | 独立商品服务、规格选择、独立定制结算与报价、地址回填、创建后进入统一用户订单详情              | 全部预留                | 前端就绪，待花束及定制订单协议；购买开关保持关闭                                          |

当前普通订单创建后直接进入待接单流程；支付接入点已在后端创建订单处标记 TODO。正式微信登录/支付仍待后续接入。

## 接口接入规则

调用结构：页面（或页面目录内的业务辅助函数）→ api → request。已有接口的 URL、HTTP 方法及无券订单请求体不变。

目录约定：
- `src/api/` 统一定义接口，使用带注释的 `export const xxxApi = (...) => { return request<T>({ method, url, data }) }`；不处理弹窗、页面状态和展示数据。
- `src/pages/<页面>/` 保存所属业务的辅助函数，例如地址的 `address-actions.ts`、订单的 `order-data.ts`、门店的 `shop-data.ts`、统计的 `sales-summary.ts`。多页面需要时复用所属目录的同一份函数。
- 纯转发函数已移除，页面直接导入对应 API；需要校验、数据转换或组合操作时调用页面辅助函数。
- `src/types/` 保存类型；`src/utils/` 保存 HTTP、错误识别等不属于具体页面的通用能力。未接入的接口继续明确拒绝，不构造未知请求地址。

- 未接入模块的 api 文件通过 pendingIntegration 拒绝，错误码 INTEGRATION_PENDING；不会发出猜测请求，也不会返回伪造空数组或成功结果。
- 页面区分加载、未登录、暂未开放、加载失败和真实空数据。网络请求工具处理真实 API 错误；未接入状态由页面展示。
- 除从 address.ts、sales.ts 导出的已实现地址及统计类型外，src/types/integration.ts 是**前端需求模型，不是后端协议**。你提供协议后，在 api 定义实际请求/响应，对应页面目录内的辅助函数完成字段/单位/图片地址映射，页面继续使用前端模型。
- 用户身份取 Token 与后端返回角色。useResource 使旧请求失效，并在账户变化时清空数据；结算单独保护报价版本和提交快照。
- API 金额沿用已有订单协议的整数分；商品、优惠券展示和 SalesSummary 金额使用元，由服务层转换。日期/ID 也由服务层转换，不能把本地演示 ID 传给真实 API。
- 不迁移旧本地演示地址/券/订单到服务器。原有 legacy 文件保留以避免覆盖既有工作，但运行时页面不再引用；回归检查会遍历所有注册页面的 import 图阻止重新引入。

### 已有接口（保留）

| 用途                             | 方法与路径（相对 VITE_API_BASE_URL）                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 测试登录、当前用户               | POST /user/test-login；GET /user/me                                                                          |
| 门店列表、详情                   | GET /shop/stores；GET /shop/stores/:id                                                                       |
| 门店商品列表、详情               | GET /shop/stores/:storeId/products；GET /shop/stores/:storeId/products/:id                                   |
| 普通报价、创建                   | POST /user/orders/quote；POST /user/orders                                                                   |
| 用户订单列表、详情、取消         | GET /user/orders；GET /user/orders/:orderNo；POST /user/orders/:orderNo/cancel                               |
| 可管理门店、管理订单、详情、操作 | GET /admin/orders/stores；GET /admin/orders；GET /admin/orders/:orderNo；POST /admin/orders/:orderNo/actions |

已有统一响应按项目约定使用 code/message/data，成功 code 为 200。配置参考 .env.example；未修改后端地址；统计联调只创建自动清理的专用测试订单，不触碰现有业务订单。

## 待补接口清单（建议按此顺序提供）

### A. 地址（已实现并完成服务层联调）

后端：同级 flower-api/src/addresses，复用现有 UserAddress 表，无需数据库迁移。前端：src/api/addresses.ts → src/pages/addresses/address-actions.ts。具体类型已迁入 src/types/address.ts，不再是待确认的需求模型。

| 操作     | 方法与路径                       | 成功返回 data               |
| -------- | -------------------------------- | --------------------------- |
| 列表     | GET /user/addresses              | AddressResponse[]           |
| 新增     | POST /user/addresses             | AddressResponse（HTTP 201） |
| 完整编辑 | PUT /user/addresses/:id          | AddressResponse             |
| 删除     | DELETE /user/addresses/:id       | { id: number }              |
| 默认     | POST /user/addresses/:id/default | AddressResponse             |

请求必填 name、phone、province、city、district、detail、isDefault；regionCode 为可选字符串。姓名/省市区最多 64 字符，详细地址最多 500 字符，手机号为 1 开头 11 位。服务端统一去首尾空白；isDefault 必须为布尔值。响应额外含数字 id，regionCode 可为 null；不返回用户归属。

页面使用独立省、市、区输入，服务层将它们组合成展示 region 并把 id 转成字符串。完整编辑不发送展示 region 或 userId；地区改变时清除原行政编码，避免保留不匹配的编码。地址数据不再写入本地演示缓存。

非空地址簿必须有且仅有一个默认地址：首条自动默认；改为默认会取消其他默认；取消当前默认或删除它时由后端补位（优先其他默认，其次其他最早 id；只剩一条时继续默认）。所有写操作锁定当前用户行并在事务内完成，跨用户操作返回 404，停用/失效账户返回 401。

结算默认地址仅在联系人姓名与地址均未填写时自动回填；手动输入不覆盖，账户切换清空；地址请求失败时仍可手动填写配送地址。默认地址、删除结果均以服务器重新查询为准。

验证：后端 27 项地址测试通过；独立临时用户下 65 次真实 HTTP/MySQL 验证通过（含并发默认竞争），测试用户/地址已清理；当前运行后端路由已加载（无 Token 返回 401）。前端 19 组隔离回归通过。无数据库迁移，无自动上传历史本地地址；真机待验收。

### B. 销售统计（已实现并完成服务层联调）

后端：同级 flower-api/src/sales；接口说明见该目录 README.md。前端：src/api/sales.ts → src/pages/store-stats/sales-summary.ts；实际协议及页面模型已迁至 src/types/sales.ts。

- 请求：GET /admin/sales?storeId=正整数&period=today|week|month，复用管理端 Bearer Token 与成功响应 code/message/data。
- 权限：店长仅当前负责门店、旧门店管理员仅本店、平台管理员可查询指定门店；后端重新查权限，不信任客户端。门店列表沿用 GET /admin/orders/stores。
- 用户已确认：北京时间按完成时间统计实收；商品原价减优惠，不含配送费；退款处理中/失败保留，整单退款成功从原完成期间扣除；所有测试单和定制单排除。
- 今日/近七天（含今日）/本月均使用北京时间自然日半开区间。返回 start、end、timezone；服务器部署时区不影响边界。
- amount、deliveryAmount、receivedAmount、average、giftAmount API 返回分，pages/store-stats/sales-summary.ts 转元。salesCount 为计入实收的完成订单数（含零元确认）；average 使用该分母。
- count、pending、states 按期间创建订单计算，completed 按期间完成事实计算，页面已分别标清。pending 为期间下单中当前待接单/备货/自取配送的笔数，不是全部历史待办。
- 赠花按 completedAt + fulfilledStoreId 和 OrderItem 历史赠花快照，排除现金券和额外付费数量；giftAmount 是商品价值，不是报销金额。giftStems 缺少历史支数时返回 null，giftUnknownStemsCount 提示缺失笔数。
- 已送出赠花退款后保留，giftExceptionCount 标记退款或取消异常。营销接口尚未接通，活动下单写入 giftQuantity/giftStems 快照仍需后续闭环联调。
- 无数据返回真实零，失败清空旧金额并展示重试；切店、切日期和切账户丢弃过期响应。“我的”使用首个可管理门店展示今日摘要，统计页可切店。

验收：13 项时间/参数单测、105 项真实 HTTP/JWT/MySQL 断言通过，专用随机门店/用户/商品/订单已清理；前端 21 组回归、类型检查及微信小程序/H5 构建通过。后台全量 Jest 180 通过、1 个既有 AppController 默认文案断言失败。微信真机展示、真实营销赠花闭环及报销结算仍待验收；当前统计不计算报销。

### C. 优惠券、新人花礼、邀请

入口：src/api/marketing.ts → src/pages/invite/invitation-actions.ts；结算适配：src/pages/checkout/checkout-actions.ts。

| 操作         | 预留 API 入口          | 前端所需返回/输入                                                                          |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------------ |
| 卡包和规则   | getWalletApi           | coupons（沿用 Coupon 展示类型）、rules                                                     |
| 新人花礼状态 | getNewcomerGiftApi     | coupon 或 null、claimable、description                                                     |
| 新人花礼领取 | claimNewcomerGiftApi   | 最新花礼状态；若自动发放，映射 claimable=false                                             |
| 订单可用券   | getAvailableCouponsApi | 当前门店/商品/规格/数量/收花方式对应的 Coupon[]                                            |
| 含券报价     | quoteCouponOrderApi    | OrderSelection + 独立 couponId → 分为单位的 OrderQuote                                     |
| 含券下单     | submitCouponOrderApi   | 原订单提交快照 + 独立 couponId → OrderResponse                                             |
| 邀请信息     | getInvitationApi       | code、shareTitle、sharePath、shareImage（可选）、rules、invitedCount、rewardCount、records |
| 邀请绑定     | bindInvitationApi      | 邀请码；成功确认后才清除暂存来源                                                           |

需确认券有效期、状态枚举、适用范围、占用/释放、重复领券、首次注册判定及邀请绑定时机。前端不生成邀请码、不发券、不核销。

启用顺序：先提供卡包和活动协议；再接可用券+报价+提交全部三项，联调通过后把 pages/checkout/coupon-config.ts 的 couponCheckoutEnabled 改为 true。该开关关闭时普通无券请求完全沿用现有接口。含券提交快照在不确定的网络失败重试时保持券 ID、请求键和金额不变。

邀请来源保存于 flower-pending-invite-code，仅记录首次来源，不表示有效邀请。确认绑定协议/时机后开启 invitationBindingEnabled；当前预留为登录成功后绑定，失败保留来源且不阻断登录。如果后端要求登录/注册请求内携带邀请码，只调整登录/营销适配流程，不启用单独绑定。不要在协议未确定前开启。

### D. 花束与定制订单

入口：src/api/bouquets.ts → src/pages/custom-checkout/bouquet-checkout.ts；独立页面：src/pages/custom-checkout/index.vue。

| 操作       | 前端服务                     | 所需信息                                                                                                             |
| ---------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 列表/详情  | getBouquets / getBouquet(id) | Bouquet：id、name、image、images、description、展示价（元）、规格列表（id/name/unit/price/available）、配送区域/费用 |
| 配送报价   | quoteCustom(selection)       | bouquetId、specId、quantity、address → CustomQuote（分）                                                             |
| 创建测试单 | submitCustom(input)          | 上述选项 + requestKey、contactName、contactPhone、remark、expectedAmount（分）→ 可映射 OrderResponse 的结果          |

不传虚构门店 ID，不调用普通订单创建接口。联系人手动编辑与地址选择均可用；地址改变立即清空旧报价，点击“确认地址并刷新金额”后才可提交。

必须确认定制订单由已有用户订单接口读取、状态能映射现有用户详情、且店长接口不包含定制订单。商品、报价、提交及查询全部联调通过后开启 pages/custom-checkout/bouquet-checkout.ts 的 customCheckoutEnabled。此开关关闭时，即使直接访问独立结算 URL 也不会报价或下单。

### E. 正式微信登录与支付（后续）

api/production-access.ts 中 loginWithWechatApi(code)、payOrderApi(orderNo) 仅预留，始终拒绝为暂未开放。需要另补微信登录/手机号授权协议、支付参数与查询订单支付状态协议后开展正式对接；本轮不会把客户端支付回调当成服务端收款确认。

## 验证结果与后续验收

- pnpm tsc：通过。
- pnpm check:integration：21 组隔离回归通过；pnpm check:preview 保留为兼容命令。
- pnpm build:mp-weixin、pnpm build:h5：通过（最终复核见本轮交付）。存在依赖循环访问 finally 的工具链警告，不阻止构建。
- git diff --check：通过。
- 浏览器自动预览因当前环境的浏览器工具沙箱初始化失败未完成；微信开发者工具与真机界面未验证。

前端回归执行真实页面脚本和服务映射，API 使用隔离的异步测试替身。前端回归不会访问真实网络、修改设备缓存或创建服务器订单。主要覆盖：自取/配送完整状态流转、结果页读取、取消、错误核销码、幂等重复/网络重试、报价乱序、失败金额失效、账户切换、401 合并跳转和旧会话 401、库存/门店关闭、版本冲突刷新、地址保存失败保留/选择回填/不覆盖手填、统计门店与时间乱序、用券乱序及金额、邀请来源保留、定制接口独立性、待开放页面和运行时禁止引用旧模拟模块。

尚未验证：真实服务库存原子扣减、幂等持久性、订单跨用户/跨店越权（地址隔离和统计门店权限已验证）、真实取消库存回补、统计微信真机展示、微信网络域名/图片加载、原生地址事件与分享、真机交互。不能用前端隔离测试代替这些验收。

地址（A）和销售统计（B）已完成接口与服务层联调。下一步进入营销（C），随后花束（D）；需要继续确认营销发放、绑定与报价提交协议，未接通前保持入口关闭。

### 提供接口时的最小格式

1. 功能名称、HTTP 方法、完整路径及鉴权要求。
2. Query/Body 请求例子、必填/可选字段、ID 类型、金额单位、日期/时区。
3. 正常响应、空数据响应、主要错误响应（包括 HTTP 状态码与业务 code）。
4. 分页方式（如有）、重复提交规则、关联接口及必须满足的业务口径。

所有源代码修改仍在工作区；未自动提交、部署或重启运行中的服务。

后端全量回归：180 项通过，1 项原有 AppController 模板测试失败（期待 Hello World!，实现返回 jfx），与地址及统计改动无关。后端构建通过。地址协议详见同级 flower-api/src/addresses/README.md。

本轮真实统计验收使用独立随机端口的 Nest 进程，结束后关闭。最后检查本机 localhost:3000 未连接；日常页面联调需先在 flower-api 启动后端服务。
