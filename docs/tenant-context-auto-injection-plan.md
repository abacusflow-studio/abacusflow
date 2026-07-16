# Plan: 消除 CurrentTenantProvider 手动调用，实现租户上下文自动注入

## Context

Hibernate `@Filter` + `TenantFilterAspect` 已实现 JPA 查询的自动租户隔离，但 usecase 层仍有 29 处 `currentTenantProvider.requireTenantId()` 调用：

| 用途 | 调用次数 | 能否自动注入？ |
|---|---|---|
| 创建新实体（设置 tenantId 值） | 9 处 | ✅ 实体构造器默认参数 |
| jOOQ 查询（手动 WHERE 条件） | 17 处 | ✅ RLS ExecuteListener |
| Portal 层外部服务（CubeToken/FileStorage） | 2 处 | ❌ 保留 |
| 读取上下文（UserAuthService） | 1 处 | ❌ 保留 |

**目标**：消除 26 处手动调用（9 + 17），仅保留 3 处合理调用。

## 核心设计

### 方案 1：实体构造器默认参数（解决 9 处实体创建）

当前每个 Command Service 都写：
```kotlin
val tenantId = currentTenantProvider.requireTenantId()
Product(name = ..., tenantId = tenantId)
```

改为：实体 `tenantId` 参数加默认值，从 ThreadLocal 自动解析：
```kotlin
// Product.kt — tenantId 参数加默认值
override val tenantId: Long = TenantContextHolder.currentTenantId()
```

Command Service 简化为：
```kotlin
Product(name = ...)  // tenantId 自动从上下文获取
```

**关键**：`val` 不变（保持不可变性），参数仍在（可显式传入用于测试），只是加了默认值。

### 方案 2：jOOQ ExecuteListener + @Transactional(readOnly=true)（解决 17 处 jOOQ 查询）

当前 7 个 Query Service 缺少 `@Transactional`，导致：
- Hibernate Filter 未启用（JPA findById 可能跨租户）
- PostgreSQL RLS 未设置（jOOQ 查询仅靠手动条件）

修复：
1. 所有 Query Service 加 `@Transactional(readOnly = true)`
2. 添加 jOOQ `ExecuteListener`，在每条 jOOQ 查询执行前自动 `set_config('app.tenant_id', ...)`
3. 删除 jOOQ 查询中的手动 `TENANT_ID.eq(tenantId)` 条件

## 实施步骤

### Step 1：提取 `TenantContextHolder`（无 Spring 依赖的 ThreadLocal）

**新建** `abacusflow-infra/abacusflow-commons/.../tenant/TenantContextHolder.kt`

```kotlin
object TenantContextHolder {
    private val tenantIdHolder = ThreadLocal<Long?>()

    fun currentTenantId(): Long =
        tenantIdHolder.get() ?: throw IllegalStateException("No tenant context")

    fun currentTenantIdOrNull(): Long? = tenantIdHolder.get()

    fun setTenantId(tenantId: Long) { tenantIdHolder.set(tenantId) }
    fun clear() { tenantIdHolder.remove() }
}
```

**修改** `CurrentTenantProvider.kt` — 委托给 TenantContextHolder：
```kotlin
@Component
class CurrentTenantProvider {
    fun getCurrentTenantId(): Long? = TenantContextHolder.currentTenantIdOrNull()
    fun requireTenantId(): Long = TenantContextHolder.currentTenantId()
    fun setTenantId(tenantId: Long) = TenantContextHolder.setTenantId(tenantId)
    fun clear() = TenantContextHolder.clear()
}
```

**为何需要两层**：`TenantContextHolder` 是纯 JVM object（无 Spring 依赖），可以被 core 层实体引用；`CurrentTenantProvider` 是 Spring Bean，用于 DI 注入场景。二者共享同一个 ThreadLocal，零风险不一致。

### Step 2：实体构造器 `tenantId` 加默认值

对 13 个 TenantScopedEntity 实现，将 `override val tenantId: Long` 改为 `override val tenantId: Long = TenantContextHolder.currentTenantId()`

**实体列表**（12 个文件，InventoryUnit 含子类）：
- `Product.kt`, `ProductCategory.kt`
- `Inventory.kt`, `InventoryUnit.kt`（含 InstanceInventoryUnit / BatchInventoryUnit）
- `Customer.kt`, `Supplier.kt`
- `Depot.kt`
- `SaleOrder.kt`, `SaleOrderItem.kt`
- `PurchaseOrder.kt`, `PurchaseOrderItem.kt`
- `Feedback.kt`

**不改**：`Role.kt`（Role 通过 TenantCommandService 创建，由 TenantMembership 关联，暂不改以降低风险）

**注意 InventoryUnit 子类**：
```kotlin
abstract class InventoryUnit(
    ...,
    override val tenantId: Long = TenantContextHolder.currentTenantId(),
) : TenantScopedEntity

class BatchInventoryUnit(
    ...,
    tenantId: Long = TenantContextHolder.currentTenantId(),
) : InventoryUnit(..., tenantId = tenantId)
```

### Step 3：Command Service 删除 `currentTenantProvider.requireTenantId()`

**9 个文件**，每个做相同模式修改：

```kotlin
// 改造前
class DepotCommandServiceImpl(
    private val depotRepository: DepotRepository,
    private val currentTenantProvider: CurrentTenantProvider,
) {
    fun createDepot(input: ...): DepotTO {
        val tenantId = currentTenantProvider.requireTenantId()
        val depot = Depot(name = ..., tenantId = tenantId)
        ...
    }
}

// 改造后 — tenantId 自动解析
class DepotCommandServiceImpl(
    private val depotRepository: DepotRepository,
) {
    fun createDepot(input: ...): DepotTO {
        val depot = Depot(name = ...)  // tenantId 从 TenantContextHolder 自动获取
        ...
    }
}
```

**特殊处理**：
- `PurchaseOrderCommandServiceImpl` / `SaleOrderCommandServiceImpl`：删除 `mapInputOrderItemToOrderItem` 的 `tenantId` 参数，`PurchaseOrderItem()` / `SaleOrderItem()` 也自动解析
- `DepotCommandServiceImpl`：`existsByName` 已由 Hibernate Filter 自动隔离，`requireTenantId()` 确认仅用于构造 Depot，可安全删除

### Step 4：Query Service 加 `@Transactional(readOnly = true)`

**7 个文件**（FeedbackQueryServiceImpl 已有）：
- `ProductQueryServiceImpl.kt`
- `CustomerQueryServiceImpl.kt`
- `SupplierQueryServiceImpl.kt`
- `InventoryQueryServiceImpl.kt`
- `InventoryUnitQueryServiceImpl.kt`
- `PurchaseOrderQueryServiceImpl.kt`
- `SaleOrderQueryServiceImpl.kt`

这确保 `TenantFilterAspect` 在每个查询前启用 Hibernate Filter 和 PostgreSQL RLS。

### Step 5：创建 jOOQ `ExecuteListener`（RLS 自动设置）

**新建** `abacusflow-usecase/abacusflow-usecase-commons/.../jooq/TenantRlsExecuteListener.kt`

```kotlin
class TenantRlsExecuteListener : DefaultExecuteListener() {
    override fun executeStart(ctx: ExecuteContext) {
        val tenantId = TenantContextHolder.currentTenantIdOrNull() ?: return
        ctx.connection().createStatement()
            .execute("SELECT set_config('app.tenant_id', '$tenantId', true)")
    }
}
```

**新建** `abacusflow-usecase/abacusflow-usecase-commons/.../jooq/JooqTenantConfig.kt`

```kotlin
@Configuration
class JooqTenantConfig {
    @Bean
    fun tenantRlsExecuteListenerProvider() = ExecuteListenerProvider { TenantRlsExecuteListener() }
}
```

Spring Boot jOOQ 自动配置会拾取 `ExecuteListenerProvider` Bean 并应用到 `DSLContext`。

**为何选 ExecuteListener 而非 VisitListener**：
- ExecuteListener 利用现有 PostgreSQL RLS 基础设施（V010 迁移已建好），极简
- VisitListener 需要解析 SQL AST 注入条件，复杂且易出错
- RLS 是数据库级防线，与应用层 Filter 形成双重保障
- 性能无显著差异（PostgreSQL 优化 RLS 条件与显式 WHERE 等效）

### Step 6：Query Service 删除手动 tenantId 条件

**8 个文件**，删除 `currentTenantProvider` 依赖和所有 `TENANT_ID.eq(tenantId)` 条件：

```kotlin
// 改造前
val tenantId = currentTenantProvider.requireTenantId()
val condition = buildList<Condition> {
    add(PRODUCT.TENANT_ID.eq(tenantId))  // ← 删除
    productName?.let { add(PRODUCT.NAME.containsIgnoreCase(it)) }
}

// 改造后 — RLS 自动过滤
val condition = buildList<Condition> {
    productName?.let { add(PRODUCT.NAME.containsIgnoreCase(it)) }
}
```

**特殊处理**：
- `findAllChildrenCategories()` 辅助方法：删除 `tenantId` 参数和 `PRODUCT_CATEGORY.TENANT_ID.eq(tenantId)` 条件
- `getSaleOrder()` / `getPurchaseOrder()`：删除 `SALE_ORDER.ID.eq(id).and(SALE_ORDER.TENANT_ID.eq(tenantId))` 中的 tenantId 部分，只保留 `SALE_ORDER.ID.eq(id)`

### Step 7：添加 `withTenant` 工具函数（可选增强）

**新建** `abacusflow-infra/abacusflow-commons/.../tenant/TenantContext.kt`

```kotlin
inline fun <T> withTenant(tenantId: Long, block: () -> T): T {
    TenantContextHolder.setTenantId(tenantId)
    try { return block() }
    finally { TenantContextHolder.clear() }
}
```

Scheduler 简化：
```kotlin
tenants.forEach { tenant ->
    try {
        withTenant(tenant.id) {
            autoCompleteEligibleOrderStatus(tenant.id)
        }
    } catch (e: Exception) { logger.error(...) }
}
```

## 不改的文件

| 文件 | 原因 |
|---|---|
| `CubeTokenController.kt` | 传 tenantId 给外部 Cube.js 服务 |
| `FileController.kt` | 传 tenantId 给文件存储服务 |
| `UserAuthenticationServiceImpl.kt` | 读取上下文（getCurrentTenantId），非过滤 |
| `TenantContextFilter.kt` | 设置 ThreadLocal 的入口，保持用 CurrentTenantProvider |
| `TenantFilterAspect.kt` | 已正确，保持用 CurrentTenantProvider |
| `Role.kt` | Role 通过 TenantCommandService 创建，暂不改动 |
| `InventoryUnitRepository` native query | native query 不受 Hibernate Filter 影响，保持手动 tenantId |

## 文件变更汇总

**新建（3）**：
- `abacusflow-infra/abacusflow-commons/.../TenantContextHolder.kt`
- `abacusflow-usecase/abacusflow-usecase-commons/.../jooq/TenantRlsExecuteListener.kt`
- `abacusflow-usecase/abacusflow-usecase-commons/.../jooq/JooqTenantConfig.kt`

**修改（22）**：
- 实体层 12 个文件（tenantId 默认参数）
- Command Service 9 个文件（删除 requireTenantId）
- Query Service 7 个文件（加 @Transactional + 删除手动条件）
- `CurrentTenantProvider.kt`（委托给 TenantContextHolder）

## 实施顺序

1. Step 1（TenantContextHolder）— 基础设施，无行为变更
2. Step 2（实体默认参数）— 仅增加默认值，现有调用不受影响
3. Step 3（Command Service 清理）— 删除 requireTenantId
4. Step 4（Query Service 加 @Transactional）— 修复 Hibernate Filter 缺口
5. Step 5（jOOQ ExecuteListener）— 新增 RLS 自动设置
6. Step 6（Query Service 清理）— 删除手动 tenantId 条件
7. Step 7（withTenant 工具）— 可选增强

每步独立提交，便于回滚。

## 验证

1. `./gradlew build` 编译通过
2. 以不同租户身份请求 API，确认只能看到自己租户数据
3. 创建新实体时不传 tenantId，确认自动填充
4. 尝试访问其他租户资源 ID，确认返回 404
5. 运行 jOOQ 分页查询，确认 RLS 自动过滤
6. 运行定时任务，确认按租户逐个处理
7. 运行现有测试套件
