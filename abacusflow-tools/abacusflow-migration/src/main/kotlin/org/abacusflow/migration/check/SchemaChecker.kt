package org.abacusflow.migration.check

import io.github.oshai.kotlinlogging.KotlinLogging
import org.abacusflow.migration.database.SourceDatabase
import org.abacusflow.migration.database.TargetDatabase
import org.jooq.impl.DSL

private val logger = KotlinLogging.logger {}

/**
 * 迁移前 schema 校验器。
 * 验证 source/target 数据库的表结构和 Flyway 版本，避免操作错误数据库。
 */
class SchemaChecker(
    private val source: SourceDatabase,
    private val target: TargetDatabase,
    private val controlSchema: String = "abacusflow_migration",
) {
    data class SchemaCheckResult(
        val sourceTablesOk: Boolean,
        val targetTablesOk: Boolean,
        val targetFlywayVersion: String?,
        val missingSourceTables: List<String>,
        val missingTargetTables: List<String>,
        val errors: List<String>,
    ) {
        val passed: Boolean get() = errors.isEmpty() && sourceTablesOk && targetTablesOk
    }

    /** V1 预期存在的表。 */
    private val v1RequiredTables =
        listOf(
            "user_account",
            "user_external_identity",
            "role",
            "permission",
            "role_permission",
            "user_role",
            "product_category",
            "product",
            "depot",
            "inventory",
            "inventory_unit",
            "supplier",
            "purchase_order",
            "purchase_order_item",
            "customer",
            "sale_order",
            "sale_order_item",
        )

    /** V2 预期存在的表。 */
    private val v2RequiredTables =
        listOf(
            "tenant",
            "tenant_placement",
            "user_account",
            "tenant_membership",
            "tenant_role",
            "permission",
            "tenant_role_permission",
            "tenant_membership_role",
            "product_category",
            "product",
            "depot",
            "inventory",
            "inventory_unit",
            "supplier",
            "purchase_order",
            "purchase_order_item",
            "customer",
            "sale_order",
            "sale_order_item",
        )

    fun check(): SchemaCheckResult {
        val errors = mutableListOf<String>()
        val missingSourceTables = mutableListOf<String>()
        val missingTargetTables = mutableListOf<String>()

        // Check source tables
        val sourceTables =
            source.read { dsl ->
                dsl.select(DSL.field("tablename", String::class.java))
                    .from(DSL.table(DSL.name("pg_tables")))
                    .where(DSL.field("schemaname").eq("public"))
                    .fetch { it.value1() }
                    .toSet()
            }

        for (table in v1RequiredTables) {
            if (table !in sourceTables) {
                missingSourceTables.add(table)
                errors.add("Source database missing required table: $table")
            }
        }

        // Check target tables
        val targetTables =
            target.read { dsl ->
                dsl.select(DSL.field("tablename", String::class.java))
                    .from(DSL.table(DSL.name("pg_tables")))
                    .where(DSL.field("schemaname").eq("public"))
                    .fetch { it.value1() }
                    .toSet()
            }

        for (table in v2RequiredTables) {
            if (table !in targetTables) {
                missingTargetTables.add(table)
                errors.add("Target database missing required table: $table")
            }
        }

        // Check target Flyway version
        var flywayVersion: String? = null
        try {
            flywayVersion =
                target.read { dsl ->
                    dsl.select(DSL.field("version", String::class.java))
                        .from(DSL.table(DSL.name("flyway_schema_history")))
                        .orderBy(DSL.field("installed_rank").desc())
                        .limit(1)
                        .fetchOne { it.value1() }
                }
        } catch (e: Exception) {
            errors.add("Cannot read flyway_schema_history from target: ${e.message}")
        }

        if (errors.isNotEmpty()) {
            logger.error { "Schema check failed: ${errors.size} error(s)" }
        } else {
            logger.info {
                "Schema check passed. Source: ${sourceTables.size} tables, " +
                    "Target: ${targetTables.size} tables, Flyway: $flywayVersion"
            }
        }

        return SchemaCheckResult(
            sourceTablesOk = missingSourceTables.isEmpty(),
            targetTablesOk = missingTargetTables.isEmpty(),
            targetFlywayVersion = flywayVersion,
            missingSourceTables = missingSourceTables,
            missingTargetTables = missingTargetTables,
            errors = errors,
        )
    }

    /**
     * 尝试获取迁移锁。防止多个迁移实例同时执行。
     * 使用 abacusflow_migration.migration_lock 表实现。
     */
    fun acquireLock(runId: java.util.UUID): Boolean {
        return target.transaction { dsl ->
            // 先清理过期锁（超过 1 小时未释放）
            dsl.execute(
                "DELETE FROM ${DSL.name(controlSchema, "migration_lock")} " +
                    "WHERE acquired_at < NOW() - INTERVAL '1 hour'",
            )

            // 尝试获取锁
            val inserted =
                dsl.execute(
                    "INSERT INTO ${DSL.name(controlSchema, "migration_lock")} (acquired_at, acquired_by) " +
                        "VALUES (NOW(), ?)",
                    runId.toString(),
                )
            inserted > 0
        }
    }

    /** 释放迁移锁。 */
    fun releaseLock() {
        target.transaction { dsl ->
            dsl.execute("DELETE FROM ${DSL.name(controlSchema, "migration_lock")}")
        }
    }
}
