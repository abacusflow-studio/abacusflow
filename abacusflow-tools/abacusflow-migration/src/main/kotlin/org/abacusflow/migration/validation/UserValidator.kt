package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 比较用户总数、ID 集合摘要与关键字段空值/重复情况；抽样校验不能替代全量聚合。 */
class UserValidator : PlannedMigrationValidator(MigrationTaskId.USER)
