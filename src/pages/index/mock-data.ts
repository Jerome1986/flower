// 门店履约方式。
export type Fulfillment = 'pickup' | 'delivery'
// 模拟门店结构。
export interface FlowerStore {
  id: string
  name: string
  address: string
  hours: string
  phone: string
  open: boolean
  deliveryArea: string
  deliveryFee: number
  stock: Record<string, number>
}
// 模拟商品结构。
export interface FlowerProduct {
  id: string
  type: 'A' | 'B'
  name: string
  image: string
  description: string
  specification: string
  unit: string
  price: number
  methods: Fulfillment[]
}
// 首页文案与活动配置。
export const homeContent = {
  title: '把日常，过成\n花开的样子',
  subtitle: '一束鲜花，刚刚好的心意',
  image: '/static/home/tulip.jpg',
  customImage: '/static/home/chenyu.jpg',
  couponTitle: '初次见面，送你一份花礼',
  couponAmount: 10,
  couponDays: 5,
  inviteCode: 'FLOWER2026',
  customDeliveryArea: '市区（模拟服务区域）',
  customDeliveryFee: 10,
}
// 模拟门店列表，库存按门店独立维护。
export const mockStores: FlowerStore[] = [
  {
    id: 'store-1',
    name: '花间 · 中心店',
    address: '花园路 18 号一层（模拟地址）',
    hours: '09:00–21:00',
    phone: '13800000001',
    open: true,
    deliveryArea: '中心城区',
    deliveryFee: 5,
    stock: { tulip: 18, rose: 12, sunflower: 8 },
  },
  {
    id: 'store-2',
    name: '花间 · 湖畔店',
    address: '湖滨路 66 号（模拟地址）',
    hours: '09:00–20:00',
    phone: '13800000002',
    open: true,
    deliveryArea: '湖畔片区',
    deliveryFee: 6,
    stock: { tulip: 0, rose: 6, sunflower: 10 },
  },
  {
    id: 'store-3',
    name: '花间 · 城南店',
    address: '南街 28 号（模拟地址）',
    hours: '10:00–20:00',
    phone: '13800000003',
    open: false,
    deliveryArea: '城南片区',
    deliveryFee: 5,
    stock: { tulip: 5, rose: 9, sunflower: 3 },
  },
]
// 门店散花模拟商品，售价为测试值。
export const mockFlowers: FlowerProduct[] = [
  {
    id: 'tulip',
    type: 'A',
    name: '郁金香',
    image: '/static/home/tulip.jpg',
    description: '温柔的色彩，让每一天都有一点春意。花色以门店实际供应为准。',
    specification: '5 支',
    unit: '份',
    price: 29.9,
    methods: ['pickup', 'delivery'],
  },
  {
    id: 'rose',
    type: 'A',
    name: '玫瑰',
    image: '/static/home/rose.jpg',
    description: '把喜欢藏进花里，送给自己，也送给想念的人。',
    specification: '8 支',
    unit: '份',
    price: 39.9,
    methods: ['pickup', 'delivery'],
  },
  {
    id: 'sunflower',
    type: 'A',
    name: '向日葵',
    image: '/static/home/sunflower.jpg',
    description: '向着阳光生长，为日常添一份明亮。',
    specification: '3 支',
    unit: '份',
    price: 19.9,
    methods: ['pickup'],
  },
]
// 平台成品花束，仅配送，不依赖门店库存。
export const mockBouquets: FlowerProduct[] = [
  {
    id: 'chenyu',
    type: 'B',
    name: '沉鱼',
    image: '/static/home/chenyu.jpg',
    description: '浅色包装与粉色花束，适合把温柔送给重要的人。固定成品款式，由平台安排制作配送。',
    specification: '默认规格',
    unit: '束',
    price: 199,
    methods: ['delivery'],
  },
  {
    id: 'luoyan',
    type: 'B',
    name: '落雁',
    image: '/static/home/luoyan.jpg',
    description: '丰富花色组成的一束心意。固定成品款式，由平台安排制作配送。',
    specification: '默认规格',
    unit: '束',
    price: 239,
    methods: ['delivery'],
  },
  {
    id: 'biyue',
    type: 'B',
    name: '闭月',
    image: '/static/home/biyue.jpg',
    description: '把特别的祝福交给鲜花。固定成品款式，由平台安排制作配送。',
    specification: '默认规格',
    unit: '束',
    price: 269,
    methods: ['delivery'],
  },
]
