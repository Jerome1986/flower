# flower-web 小程序入口

## 必须先读取

先读取 [系统说明](../WORKSPACE.md) 和 [共享规则](../shared/AGENTS.md)，再按任务读取 shared/docs 的相应摘要。路径相对于本文件；从子目录执行工具时先定位仓库根。缺失或无权限时报告路径，不从旧文档或记忆替代。

## 本仓库事实与约束

- UniApp / Vue 3 / TypeScript / Pinia；页面以 src/pages.json 实际注册为准。
- 业务以当前 src 实现为准；work 中临时副本、构建产物和历史交接文档不作为当前功能依据。
- src/utils/http.ts 的 request 返回 code/message/data 包装，业务数据取 result.data。基址含 /api，API 文件不重复添加前缀。
- API 层和 src/types 对应后端实际字段；订单金额为整数分，展示转换与其他接口单位需逐字段核对。
- 购物车按用户隔离；保留同步落盘、确认快照和未知提交结果的重试保护。普通订单 items 与旧 item 兼容须同时考虑。
- 支付代码含 MP-WEIXIN 条件；H5 构建不能证明微信调起支付成功。客户端回调不替代后端订单状态。
- 适用时加载 software-development、typescript-development、uniapp-vue3-development、api-design；审查时加载 code-review。

## 验证

读取 package.json 和相关脚本后，按修改范围选择 pnpm run tsc、pnpm run build:mp-weixin、pnpm run check:core 或针对性脚本。lint 含自动修复，不能当只读检查。未执行的真机、支付和真实接口验收单独列出。

修改前后核对 Git 状态，不覆盖当前未提交工作。跨仓库需求按授权同步消费者与生产者；不自动提交或推送。
