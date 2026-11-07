import type { AddressRegion } from '@/types/address'
import areaData from './area-data.json'
// 本地行政区划表随小程序打包，选址时无需联网解析或配置地图 Key。
const provinces = Object.entries(areaData.province_list)
const cities = Object.entries(areaData.city_list)
const counties = Object.entries(areaData.county_list)
// 自治区常用简称，仅用于地址开头的明确匹配。
const provinceAliases: Record<string, string> = {
  '150000': '内蒙古',
  '450000': '广西',
  '540000': '西藏',
  '640000': '宁夏',
  '650000': '新疆',
}
// 四个直辖市的城市字段统一使用直辖市名称。
const municipalities = ['110000', '120000', '310000', '500000']
// 仅接受地址开头唯一匹配的地区，不从街道或地点名称中间猜测行政区划。
const matchPrefix = (text: string, entries: [string, string][]) => {
  const matches = entries.filter(([, name]) => text.startsWith(name))
  const longest = Math.max(0, ...matches.map(([, name]) => name.length))
  const best = matches.filter(([, name]) => name.length === longest)
  return best.length === 1 ? best[0] : undefined
}
// 从微信原生选址的文字地址匹配省市区；未识别的字段留空供用户补充。
export const resolveLocalAddress = (address: string, name: string) => {
  // 待解析文本及结果；不使用上一次表单地区，避免跨城市选址残留。
  let rest = address.trim().replace(/^中国\s*/, '')
  const region: AddressRegion = { province: '', city: '', district: '', regionCode: '' }
  const provinceMatch =
    matchPrefix(rest, provinces) || matchPrefix(rest, Object.entries(provinceAliases))
  let provinceCode = provinceMatch?.[0] || ''
  if (provinceMatch) {
    region.province = areaData.province_list[provinceCode as keyof typeof areaData.province_list]
    rest = rest.slice(provinceMatch[1].length).trim()
  }
  // 按已识别省份限定城市；省份省略时，只接受全国唯一的完整城市名前缀。
  let cityCode = ''
  if (municipalities.includes(provinceCode)) {
    region.city = region.province
    if (rest.startsWith(region.city)) rest = rest.slice(region.city.length).trim()
  } else {
    const cityMatch = matchPrefix(
      rest,
      cities.filter(
        ([code, label]) =>
          (!provinceCode || code.startsWith(provinceCode.slice(0, 2))) &&
          !/^(省直辖县|自治区直辖县|县)$/.test(label),
      ),
    )
    if (cityMatch) {
      cityCode = cityMatch[0]
      provinceCode = cityCode.slice(0, 2) + '0000'
      region.province = areaData.province_list[provinceCode as keyof typeof areaData.province_list]
      region.city = cityMatch[1]
      rest = rest.slice(cityMatch[1].length).trim()
    }
  }
  // 区县必须在已确认城市或直辖市范围内匹配，避免同名区县误填。
  const districtMatch = region.city
    ? matchPrefix(
        rest,
        counties.filter(([code]) =>
          municipalities.includes(provinceCode)
            ? code.startsWith(provinceCode.slice(0, 2))
            : code.startsWith(cityCode.slice(0, 4)),
        ),
      )
    : undefined
  if (districtMatch) {
    region.district = districtMatch[1]
    region.regionCode = districtMatch[0]
    rest = rest.slice(districtMatch[1].length).trim()
  }
  // 不完整时完整保留地图地址；用户补齐地区时仍可核对原始地点。
  const complete = !!(region.province && region.city && region.district)
  const detail = locationDetail(complete ? rest : address, name, {
    province: '',
    city: '',
    district: '',
    regionCode: '',
  })
  return { region, detail, complete }
}
// 只去除已确认的行政区域前缀，保留街道、小区及地图地点名称。
export const locationDetail = (address: string, name: string, region: AddressRegion) => {
  // 按省、市、区顺序剥离匹配的前缀，不替换文字中间出现的地区名称。
  const stripRegion = (value: string) => {
    // 当前待继续剥离前缀的地址文本。
    let result = value.trim()
    // 每次仅尝试去除当前层级的完整行政区域名称。
    for (const part of [region.province, region.city, region.district]) {
      if (part && result.startsWith(part)) result = result.slice(part.length).trim()
    }
    return result
  }
  // 地图文字地址去除地区前缀后剩余的街道、小区信息。
  const street = stripRegion(address)
  // 地图地点名称去除地区前缀后的文本，用于补充街道中未包含的地点。
  const place = stripRegion(name)
  if (!place || street.includes(place)) return street
  if (!street || place.includes(street)) return place
  return `${street} ${place}`
}
