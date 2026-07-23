package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 校验供应商数量、名称唯一性和租户归属。 */
class SupplierValidator : PlannedMigrationValidator(MigrationTaskId.SUPPLIER)

/** 校验采购单数量、状态分布、供应商引用完整性。 */
class PurchaseOrderValidator : PlannedMigrationValidator(MigrationTaskId.PURCHASE_ORDER)

/** 校验采购明细数量、金额聚合和产品引用完整性。 */
class PurchaseOrderItemValidator : PlannedMigrationValidator(MigrationTaskId.PURCHASE_ORDER_ITEM)

/** 校验客户数量、名称唯一性和租户归属。 */
class CustomerValidator : PlannedMigrationValidator(MigrationTaskId.CUSTOMER)

/** 校验销售单数量、状态分布、客户引用完整性。 */
class SaleOrderValidator : PlannedMigrationValidator(MigrationTaskId.SALE_ORDER)

/** 校验销售明细数量、金额聚合和库存单元引用完整性。 */
class SaleOrderItemValidator : PlannedMigrationValidator(MigrationTaskId.SALE_ORDER_ITEM)
