package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 校验分类树、产品数量、ID/条码集合和所有 category/tenant 引用完整性。 */
class ProductValidator : PlannedMigrationValidator(MigrationTaskId.PRODUCT)
