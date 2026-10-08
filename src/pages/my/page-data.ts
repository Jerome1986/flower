// 订单入口兼容门店订单与平台定制订单。
export const orderEntries = [
  { id: 'unpaid', label: '待付款', icon: 'wallet' },
  { id: 'processing', label: '待接单 / 制作', icon: 'list' },
  { id: 'fulfillment', label: '待自取 / 配送', icon: 'shop' },
  { id: 'completed', label: '已完成', icon: 'checkbox' },
]

export const serviceEntries = [
  {
    id: 'addresses',
    label: '地址管理',
    description: '管理收货地址，让心意准确送达',
    icon: 'location',
  },
  { id: 'support', label: '联系客服', description: '订单、配送与售后问题', icon: 'headphones' },
]
