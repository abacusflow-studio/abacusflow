package org.abacusflow.tenant

/**
 * 租户成员资格状态枚举。
 *
 * 用于标识用户在某个租户下的成员关系状态，
 * 决定用户是否可以以该租户身份访问系统。
 */
enum class MembershipStatus {
    /** 正常活跃，用户可正常访问该租户的数据 */
    ACTIVE,

    /** 已暂停，用户在该租户的访问权限被临时冻结 */
    SUSPENDED,

    /** 待接受邀请，用户已被邀请但尚未确认加入 */
    PENDING_INVITATION,
}
