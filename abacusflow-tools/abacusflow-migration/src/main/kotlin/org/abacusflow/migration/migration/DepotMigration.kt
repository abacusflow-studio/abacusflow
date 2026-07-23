package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移仓库（depot），补 tenant_id。
 * depot 在 inventory 之前迁移，因为 inventory_unit 引用 depot_id。
 */
class DepotMigration : PlannedMigrationTask(MigrationTaskId.DEPOT, setOf(MigrationTaskId.TENANT))
