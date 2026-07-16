package org.abacusflow.tenant

/**
 * 租户状态枚举。
 *
 * 用于标识租户的生命周期状态，控制租户是否可正常使用系统。
 */
enum class TenantStatus {
    /** 正常活跃，租户可正常访问和操作 */
    ACTIVE,

    /** 已暂停，租户被临时停用（如欠费、违规），不可访问业务数据 */
    SUSPENDED,

    /** 已注销，租户被永久停用，数据保留但不可恢复访问 */
    DEPROVISIONED,
}
