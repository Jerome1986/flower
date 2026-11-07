/** 本人邀请记录，好友资料使用匿名展示。 */
export interface InviteRecord {
  /** 邀请记录编号。 */
  id: string
  /** 邀请人编号。 */
  inviterId: string
  /** 好友匿名展示名称。 */
  name: string
  /** 注册时间，ISO 格式。 */
  date: string
  /** 已发奖励名称或未发放提示。 */
  reward: string
}
