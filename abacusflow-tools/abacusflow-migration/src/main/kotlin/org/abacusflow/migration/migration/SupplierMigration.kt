package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移供应商，补 tenant_id。
 * supplier 在 purchase_order 之前迁移，因为 purchase_order 引用 supplier_id。
 */
class SupplierMigration : PlannedMigrationTask(MigrationTaskId.SUPPLIER, setOf(MigrationTaskId.TENANT))
