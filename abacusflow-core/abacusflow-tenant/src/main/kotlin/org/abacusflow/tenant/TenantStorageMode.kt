package org.abacusflow.tenant

/**
 * 租户存储模式枚举。
 *
 * 用于 SaaS 架构演进中，标识租户数据的物理存储方式。
 * 当前阶段（P0）所有租户使用 SHARED_CELL 模式，未来可按需迁移至独立数据库。
 */
enum class TenantStorageMode {
    /** 共享 Cell 模式——多租户共享同一数据库实例，通过 RLS（行级安全策略）隔离数据 */
    SHARED_CELL,

    /** 独立数据库模式——租户拥有专属数据库实例，数据物理隔离，适用于大客户或合规要求场景 */
    DEDICATED_DATABASE,
}
