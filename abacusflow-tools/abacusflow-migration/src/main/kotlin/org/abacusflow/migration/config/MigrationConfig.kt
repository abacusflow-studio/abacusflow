package org.abacusflow.migration.config

/**
 * 顶层迁移配置，对应 YAML 配置文件的完整结构。
 *
 * 【设计目的与系统角色】
 * 本类是迁移工具的配置根对象，承载所有运行参数。它由 [YamlConfigLoader] 从 YAML 文件
 * 反序列化而来，然后传递给迁移引擎的各个组件。
 *
 * 【设计选择：不依赖 Spring ConfigurationProperties】
 * 迁移工具是独立的 CLI 应用，不运行在 Spring Boot 容器中，因此：
 * - 不使用 @ConfigurationProperties 注解；
 * - 不依赖 Spring 的属性绑定机制；
 * - 配置文件结构由此 data class 的字段定义稳定，变更时需考虑向后兼容。
 * 这样做的好处是：迁移工具可以独立打包、独立运行，无需引入 Spring 框架的启动开销。
 *
 * 【Kotlin 语法：data class 与默认参数值】
 * - `data class` 自动生成 equals/hashCode/toString/copy/componentN；
 * - `migration: MigrationOptions = MigrationOptions()` 使用 Kotlin 默认参数值，
 *   YAML 文件中可以省略 migration 节点，Jackson 会使用默认值实例化。
 *   这比 Java Builder 模式更简洁，同时保持向后兼容——新增字段只需给默认值即可。
 *
 * @param source    V1 源库连接配置
 * @param target    V2 目标库连接配置
 * @param migration 迁移运行参数（含批大小、控制 schema、默认租户等）
 */
data class MigrationConfig(
    val source: DatabaseConfig,
    val target: DatabaseConfig,
    val migration: MigrationOptions = MigrationOptions(),
)

/**
 * 迁移运行参数，控制批处理行为和控制表存放位置。
 *
 * 【设计目的】
 * 迁移大量数据时需要分批处理，避免一次性加载全表导致 OOM。
 * 这些参数直接影响内存使用和迁移速度的平衡。
 *
 * 【参数说明】
 * @param batchSize      每批写入目标库的记录数。值越大吞吐越高，但内存占用和单次事务时间也越长。
 *                       默认 1000，适合大多数场景。
 * @param fetchSize      JDBC 游标拉取的行数。PostgreSQL 默认会将全表结果加载到内存，
 *                       设置 fetchSize 后改用游标模式逐批拉取，避免 OOM。
 *                       前提条件：autoCommit 必须为 false，且查询不能在事务外执行。
 *                       默认 1000，与 batchSize 匹配。
 * @param controlSchema  迁移控制表（checkpoint、error、run）存放的 schema。
 *                       默认 "abacusflow_migration"，与业务数据隔离，避免污染 V2 的业务 schema。
 *                       迁移前需确保该 schema 已在目标库中创建。
 * @param defaultTenant  V2 系统的默认租户配置。V1 数据没有租户概念，
 *                       迁移时需要将所有 V1 数据归属到默认租户下。
 * @param failFast       遇到错误时是否立即中止整个迁移。true = 快速失败（默认），
 *                       false = 记录错误继续迁移后续记录。生产环境建议 true，
 *                       数据修复场景可设 false 以收集所有错误。
 */
data class MigrationOptions(
    val batchSize: Int = 1_000,
    val fetchSize: Int = 1_000,
    val controlSchema: String = "abacusflow_migration",
    val defaultTenant: DefaultTenantConfig = DefaultTenantConfig(),
    val failFast: Boolean = true,
)

/**
 * V2 系统的默认租户配置。
 *
 * 【设计目的】
 * V1（旧系统）没有多租户概念，所有数据属于单一租户。V2（新系统 AbacusFlow）
 * 采用多租户架构，每条业务数据必须关联一个租户 ID。迁移时需要将 V1 数据
 * 全部归属到"默认租户"下，确保 V2 的行级安全策略（RLS）能正常工作。
 *
 * 【参数说明】
 * @param id           默认租户的 ID，必须在 V2 系统的 tenant 表中已存在。默认 1。
 * @param name         默认租户的机器标识名，默认 "default"
 * @param displayName  默认租户的显示名称，默认 "默认租户"
 */
data class DefaultTenantConfig(
    val id: Long = 1,
    val name: String = "default",
    val displayName: String = "默认租户",
)
