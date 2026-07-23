package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 校验角色数量、业务键唯一性和默认租户归属。 */
class RoleValidator : PlannedMigrationValidator(MigrationTaskId.ROLE)

/** 校验权限 code/name 映射完整、scope 合法，且没有静默丢弃的旧权限。 */
class PermissionValidator : PlannedMigrationValidator(MigrationTaskId.PERMISSION)

/** 校验角色权限关联数量及孤儿记录，并按业务键比对关联集合。 */
class RolePermissionValidator : PlannedMigrationValidator(MigrationTaskId.ROLE_PERMISSION)
