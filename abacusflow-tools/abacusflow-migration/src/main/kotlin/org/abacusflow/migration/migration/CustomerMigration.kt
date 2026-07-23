package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移客户，补 tenant_id。
 * customer 在 sale_order 之前迁移，因为 sale_order 引用 customer_id。
 */
class CustomerMigration : PlannedMigrationTask(MigrationTaskId.CUSTOMER, setOf(MigrationTaskId.TENANT))
