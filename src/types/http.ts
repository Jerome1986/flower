/** 请求选项。 */
export type RequestOptions = UniApp.RequestOptions

/** 请求或微信能力调用失败时可用于业务判断的字段。 */
export interface RequestFailure {
  /** HTTP 状态码；网络失败或微信回调无状态码时归一为 0。 */
  statusCode: number
  /** 微信能力返回的错误说明，取消支付通过该字段识别。 */
  errMsg?: string
}

/** 响应数据。 */
export type Data<T> = {
  /** 业务编码 */
  code: number
  /** 响应提示信息 */
  message: string
  /** 响应业务数据 */
  data: T
}
