package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 校验供应商、采购单/明细数量以及采购数量和金额聚合。 */
class PurchaseOrderValidator : PlannedMigrationValidator(MigrationTaskId.PURCHASE_ORDER)

/** 校验客户、销售单/明细数量以及销售数量和金额聚合。 */
class SaleOrderValidator : PlannedMigrationValidator(MigrationTaskId.SALE_ORDER)
