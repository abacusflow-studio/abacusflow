package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 先迁 product_category（父节点先于子节点），再迁 product，并补 tenant_id。
 * 两张表必须使用独立 checkpoint stream；需校验租户内 barcode/name 唯一约束冲突。
 */
class ProductMigration : PlannedMigrationTask(MigrationTaskId.PRODUCT, setOf(MigrationTaskId.TENANT))
