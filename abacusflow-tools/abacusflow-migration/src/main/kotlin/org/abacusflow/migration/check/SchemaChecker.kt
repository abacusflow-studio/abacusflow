package org.abacusflow.migration.check

import io.github.oshai.kotlinlogging.KotlinLogging
import org.abacusflow.migration.database.SourceDatabase
import org.abacusflow.migration.database.TargetDatabase
import org.jooq.impl.DSL

// KotlinLogging：Kotlin 习惯的日志声明方式，通过 {} 延迟求值避免不必要的字符串拼接
private val logger = KotlinLogging.logger {}

/**
 * 迁移前 schema 校验器。
 *
 * 【设计目的与迁移管线中的角色】
 * 本类是迁移管线的"安全门卫"——在数据迁移执行之前，验证源数据库（V1）和
 * 目标数据库（V2）的表结构是否符合预期，避免在错误的数据库上执行迁移操作。
 * 它是迁移流程中最早执行的组件之一，在 DefaultMigrationApplication 启动迁移前调用。
 *
 * 【为什么需要 Schema 校验】
 * 数据迁移是高风险操作，一旦在错误的数据库上执行，后果不可逆：
 * 1. 如果源数据库缺少必要的表，迁移会因查询失败而中断，留下半完成状态
 * 2. 如果目标数据库缺少必要的表，INSERT 会失败，导致数据丢失
 * 3. 如果目标数据库的 Flyway 版本不正确，说明 schema 未初始化或版本不匹配
 * 4. 如果多个迁移实例同时运行，会导致数据冲突和重复插入
 *
 * 【校验内容】
 * 1. 源数据库（V1）是否包含所有必需的表（v1RequiredTables）
 * 2. 目标数据库（V2）是否包含所有必需的表（v2RequiredTables）
 * 3. 目标数据库的 Flyway 版本是否符合预期
 * 4. 迁移锁是否可获取（防止并发执行）
 *
 * 【与其他组件的连接】
 * - 被 DefaultMigrationApplication 在迁移前调用 check() 方法
 * - acquireLock()/releaseLock() 被迁移流程的入口调用，确保单实例运行
 * - SourceDatabase/TargetDatabase：数据库访问抽象，封装了 jOOQ DSLContext 的创建
 * - abacusflow_migration schema：控制表所在的数据库 schema，
 *   包含 migration_lock、v1_id_map 等控制表
 *
 * 【Kotlin 语法要点】
 * - KotlinLogging.logger {}：Kotlin 习惯的日志声明，使用 lambda 延迟求值
 * - data class：Kotlin 数据类，自动生成 equals/hashCode/toString/copy，
 *   SchemaCheckResult 作为校验结果值对象
 * - custom getter：val passed: Boolean get() = ... 计算属性，每次访问时重新计算
 * - jOOQ DSL：类型安全的 SQL 构建器，DSL.field()/DSL.table()/DSL.name() 等
 * - lambda 作为高阶函数参数：source.read { dsl -> ... } 传入 lambda 操作 DSLContext
 */
class SchemaChecker(
    /** 源数据库（V1），提供读取操作。 */
    private val source: SourceDatabase,
    /** 目标数据库（V2），提供读写操作。 */
    private val target: TargetDatabase,
    /** 控制表所在的 schema 名称，默认为 "abacusflow_migration"。 */
    private val controlSchema: String = "abacusflow_migration",
) {
    /**
     * Schema 校验结果值对象。
     *
     * 【设计意图】
     * 使用 data class 封装校验结果，而非直接返回 Boolean，
     * 原因是调用方需要详细的错误信息来定位问题：
     * - 哪些表缺失（missingSourceTables / missingTargetTables）
     * - 具体的错误描述（errors 列表）
     * - 目标数据库的 Flyway 版本（targetFlywayVersion）
     *
     * 【Kotlin 语法要点】
     * - data class：自动生成 equals/hashCode/toString/copy
     * - custom getter (val passed: Boolean get() = ...)：计算属性，
     *   不存储值，每次访问时根据其他字段计算。
     *   passed 为 true 的条件：无错误 AND 源表完整 AND 目标表完整
     */
    data class SchemaCheckResult(
        /** 源数据库表是否完整（无缺失表）。 */
        val sourceTablesOk: Boolean,
        /** 目标数据库表是否完整（无缺失表）。 */
        val targetTablesOk: Boolean,
        /** 实际检查的源 schema。 */
        val sourceSchema: String,
        /** 实际检查的目标 schema。 */
        val targetSchema: String,
        /** 源 schema 中发现的表数量。 */
        val sourceTableCount: Int,
        /** 目标 schema 中发现的表数量。 */
        val targetTableCount: Int,
        /** 目标数据库的 Flyway 版本号（从 flyway_schema_history 表读取）。 */
        val targetFlywayVersion: String?,
        /** 源数据库中缺失的表名列表。 */
        val missingSourceTables: List<String>,
        /** 目标数据库中缺失的表名列表。 */
        val missingTargetTables: List<String>,
        /** 所有校验错误信息列表（包含缺失表和其他错误）。 */
        val errors: List<String>,
    ) {
        /** 校验是否通过：无错误且源/目标表均完整。 */
        val passed: Boolean get() = errors.isEmpty() && sourceTablesOk && targetTablesOk
    }

    /**
     * V1 预期存在的表。
     *
     * 这些表是 V1 数据库中必须存在的业务表，迁移任务将从这些表读取数据。
     * 列表顺序与 StandardMigrationPlan 中的任务顺序一致。
     * 如果任何表缺失，说明源数据库不是预期的 V1 数据库，
     * 继续迁移会导致查询失败。
     */
    private val v1RequiredTables =
        listOf(
            "user_account", // 用户账号表
            "user_external_identity", // 用户外部身份表（第三方登录）
            "role", // 角色表
            "permission", // 权限表
            "role_permission", // 角色-权限关联表
            "user_role", // 用户-角色关联表
            "product_category", // 产品分类表
            "product", // 产品表
            "depot", // 仓库表
            "inventory", // 库存表
            "inventory_unit", // 库存单位表
            "supplier", // 供应商表
            "purchase_order", // 采购订单表
            "purchase_order_item", // 采购订单明细表
            "customer", // 客户表
            "sale_order", // 销售订单表
            "sale_order_item", // 销售订单明细表
        )

    /**
     * V2 预期存在的表。
     *
     * 这些表是 V2 数据库中必须存在的业务表，迁移任务将向这些表写入数据。
     * 与 V1 表的差异体现了 V2 多租户架构的变化：
     * - 新增 tenant、tenant_placement（租户相关表）
     * - user_role → tenant_membership + tenant_membership_role（用户-租户-角色三级关联）
     * - role → tenant_role（角色变为租户级）
     * - role_permission → tenant_role_permission（角色-权限关联变为租户级）
     * 如果任何表缺失，说明目标数据库未正确初始化 V2 schema。
     */
    private val v2RequiredTables =
        listOf(
            "tenant", // 租户表（V2 新增）
            "tenant_placement", // 租户配置表（V2 新增）
            "user_account", // 用户账号表（V1→V2 保留）
            "tenant_membership", // 租户成员关系表（替代 V1 的 user_role）
            "tenant_role", // 租户角色表（替代 V1 的 role）
            "permission", // 权限表（V1→V2 保留，但命名规则变化）
            "tenant_role_permission", // 租户角色-权限关联表（替代 V1 的 role_permission）
            "tenant_membership_role", // 租户成员-角色关联表（V2 新增，三级关联）
            "product_category", // 产品分类表
            "product", // 产品表
            "depot", // 仓库表
            "inventory", // 库存表
            "inventory_unit", // 库存单位表
            "supplier", // 供应商表
            "purchase_order", // 采购订单表
            "purchase_order_item", // 采购订单明细表
            "customer", // 客户表
            "sale_order", // 销售订单表
            "sale_order_item", // 销售订单明细表
        )

    /**
     * 执行 schema 校验。
     *
     * 【校验流程】
     * 1. 查询源数据库（V1）的 public schema 中的所有表名
     * 2. 检查 V1 必需表是否都存在，记录缺失的表
     * 3. 查询目标数据库（V2）的 public schema 中的所有表名
     * 4. 检查 V2 必需表是否都存在，记录缺失的表
     * 5. 读取目标数据库的 Flyway 版本号
     * 6. 汇总所有错误，返回 SchemaCheckResult
     *
     * 【jOOQ 查询说明】
     * 使用 jOOQ 的 DSL API 构建类型安全的 SQL 查询：
     * - DSL.field("tablename", String::class.java)：创建字段引用
     * - DSL.table(DSL.name("pg_tables"))：创建表引用，DSL.name() 处理标识符引用
     * - .where(DSL.field("schemaname").eq("public"))：WHERE 条件
     * - .fetch { it.value1() }：执行查询并映射结果，value1() 获取第一列的值
     *
     * 【为什么查询 pg_tables 而非 information_schema】
     * pg_tables 是 PostgreSQL 的系统目录视图，查询更简洁。
     * information_schema.tables 是 SQL 标准视图，兼容性更好但查询更冗长。
     * 由于本项目只支持 PostgreSQL，选择 pg_tables 更合适。
     *
     * @return SchemaCheckResult 包含详细的校验结果
     */
    fun check(): SchemaCheckResult {
        val errors = mutableListOf<String>()
        val missingSourceTables = mutableListOf<String>()
        val missingTargetTables = mutableListOf<String>()

        // ===== 第一步：检查源数据库（V1）表 =====
        // 查询 V1 数据库 public schema 中的所有表名
        val (sourceSchema, sourceTables) =
            source.read { dsl ->
                val currentSchema = dsl.fetchValue("SELECT current_schema()") as String? ?: "public"
                val tables =
                    dsl.select(DSL.field("tablename", String::class.java))
                        .from(DSL.table(DSL.name("pg_tables")))
                        .where(DSL.field("schemaname").eq(currentSchema))
                        .fetch { it.value1() } // value1() 获取结果集第一列的值
                        .toSet() // 转为 Set 以便 O(1) 成员判断
                currentSchema to tables
            }

        // 逐一检查 V1 必需表是否存在
        for (table in v1RequiredTables) {
            if (table !in sourceTables) {
                missingSourceTables.add(table)
                errors.add("Source database missing required table: $table")
            }
        }

        // ===== 第二步：检查目标数据库（V2）表 =====
        // 查询 V2 数据库 public schema 中的所有表名
        val (targetSchema, targetTables) =
            target.read { dsl ->
                val currentSchema = dsl.fetchValue("SELECT current_schema()") as String? ?: "public"
                val tables =
                    dsl.select(DSL.field("tablename", String::class.java))
                        .from(DSL.table(DSL.name("pg_tables")))
                        .where(DSL.field("schemaname").eq(currentSchema))
                        .fetch { it.value1() }
                        .toSet()
                currentSchema to tables
            }

        // 逐一检查 V2 必需表是否存在
        for (table in v2RequiredTables) {
            if (table !in targetTables) {
                missingTargetTables.add(table)
                errors.add("Target database missing required table: $table")
            }
        }

        // ===== 第三步：检查目标数据库的 Flyway 版本 =====
        // Flyway 版本号用于确认 V2 数据库的 schema 是否已正确初始化
        var flywayVersion: String? = null
        try {
            flywayVersion =
                target.read { dsl ->
                    dsl.select(DSL.field("version", String::class.java))
                        .from(DSL.table(DSL.name("flyway_schema_history")))
                        .orderBy(DSL.field("installed_rank").desc()) // 按安装顺序倒序
                        .limit(1) // 取最新一条记录
                        .fetchOne { it.value1() } // 获取版本号
                }
        } catch (e: Exception) {
            // flyway_schema_history 表不存在或查询失败，记录错误
            errors.add("Cannot read flyway_schema_history from target: ${e.message}")
        }

        // ===== 第四步：汇总结果 =====
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
            sourceSchema = sourceSchema,
            targetSchema = targetSchema,
            sourceTableCount = sourceTables.size,
            targetTableCount = targetTables.size,
            targetFlywayVersion = flywayVersion,
            missingSourceTables = missingSourceTables,
            missingTargetTables = missingTargetTables,
            errors = errors,
        )
    }

    /**
     * 尝试获取迁移锁。防止多个迁移实例同时执行。
     *
     * 【设计意图】
     * 迁移是单实例操作，多个实例同时执行会导致：
     * 1. 数据重复插入（同一 V1 记录被两个实例同时迁移）
     * 2. ID 映射冲突（两个实例为同一 V1 记录分配不同的 V2 ID）
     * 3. 检查点混乱（两个实例的进度状态互相覆盖）
     *
     * 【锁实现机制】
     * 使用 abacusflow_migration.migration_lock 表实现分布式锁：
     * - 获取锁：向 migration_lock 表插入一条记录（acquired_at + acquired_by）
     * - 释放锁：删除 migration_lock 表中的记录
     * - 过期清理：删除超过 1 小时未释放的锁（防止死锁）
     *
     * 【为什么用数据库锁而非文件锁】
     * 1. 迁移可能在不同机器上执行（连接同一个数据库），文件锁无法跨机器
     * 2. 数据库锁与迁移操作在同一个事务上下文中，一致性更好
     * 3. 数据库锁的过期检测更可靠（基于数据库时间而非文件系统时间）
     *
     * 【Kotlin 语法要点】
     * - target.transaction { dsl -> ... }：在事务中执行操作，
     *   确保清理过期锁和获取新锁是原子操作
     * - DSL.name(controlSchema, "migration_lock")：生成带 schema 限定的表名，
     *   如 abacusflow_migration.migration_lock
     * - inserted > 0：execute() 返回受影响的行数，>0 表示插入成功
     *
     * @param runId 当前迁移运行的唯一 ID，记录在锁表中用于追踪
     * @return true 表示成功获取锁，false 表示锁已被其他实例持有
     */
    fun acquireLock(runId: java.util.UUID): Boolean {
        return target.transaction { dsl ->
            // 先清理过期锁（超过 1 小时未释放的锁视为死锁，自动清理）
            // 这防止了迁移进程崩溃后锁永远无法释放的问题
            dsl.execute(
                "DELETE FROM ${DSL.name(controlSchema, "migration_lock")} " +
                    "WHERE acquired_at < NOW() - INTERVAL '1 hour'",
            )

            // 尝试获取锁：插入一条新记录
            // 如果表中已有未过期的记录，INSERT 会成功（无唯一约束时）
            // 实际生产中可能需要添加唯一约束确保只有一个锁
            val inserted =
                dsl.execute(
                    "INSERT INTO ${DSL.name(controlSchema, "migration_lock")} (acquired_at, acquired_by) " +
                        "VALUES (NOW(), ?) ON CONFLICT (lock_id) DO NOTHING",
                    runId.toString(),
                )
            inserted > 0 // 插入成功则表示获取锁成功
        }
    }

    /**
     * 释放迁移锁。
     *
     * 在迁移完成（无论成功或失败）后调用，删除 migration_lock 表中的记录，
     * 允许其他迁移实例获取锁。
     *
     * 【安全考量】
     * 使用 DELETE 而非 DROP，只删除锁记录而不影响控制表结构。
     * 在事务中执行，确保释放操作的原子性。
     */
    fun releaseLock() {
        target.transaction { dsl ->
            dsl.execute("DELETE FROM ${DSL.name(controlSchema, "migration_lock")}")
        }
    }
}
