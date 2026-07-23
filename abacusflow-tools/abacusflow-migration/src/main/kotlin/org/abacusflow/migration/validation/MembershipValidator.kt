package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 校验每个应迁用户恰有一条默认租户 membership，且不存在孤儿 user/tenant 引用。 */
class MembershipValidator : PlannedMigrationValidator(MigrationTaskId.MEMBERSHIP)
