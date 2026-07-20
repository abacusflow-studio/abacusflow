## Context

`product_category.parent_id` 和领域实体 `ProductCategory.parent` 已允许空值，但 `CreateProductCategoryInput.parentId` 仍为必填。为满足该契约，`V002` 给默认租户插入名称为“根节点”的真实分类，Web 又通过这个中文名称识别不可编辑、不可删除的系统节点。运行时租户 provisioning 没有创建同类记录，因此种子租户和新租户行为不一致。

这个根记录没有独立业务含义：产品不应把它当作分类，用户也不应管理它。分类关系本质上是一片由多个 `parent_id IS NULL` 顶级分类组成的森林；Web 可以在展示层把这片森林包在一个无 ID 的虚拟根下。

当前 change 发生在尚未要求保留共享数据库历史的开发基线上，使用者会重建数据库。首次共享或生产部署后不得再修改 V001/V002，而应使用新的 forward-only migration。

## Goals / Non-Goals

**Goals:**

- 数据库只保存真实产品分类，不保存系统根占位记录。
- 新租户和种子租户都允许从零分类开始，且不需要产品目录 provisioning step。
- 支持创建多个顶级分类和任意合法子分类。
- 在领域/应用层阻止跨租户父子关系、自引用和祖先环。
- 让 PUT 更新可以明确区分“移动到顶级”和目标父分类。
- 统一租户内分类名称唯一规则，并减少 PostgreSQL 专用 schema 语法。
- Web 以虚拟根展示分类森林，但绝不把虚拟根 ID 发送给 API。

**Non-Goals:**

- 引入 nested set、materialized path、closure table 或递归数据库触发器。
- 为分类增加手工排序、拖拽排序或批量移动能力。
- 自动创建“未分类”分类，或允许产品不关联真实分类。
- 在本开发基线中迁移已经引用旧根记录的生产数据。
- 把虚拟根加入 OpenAPI 返回模型。

## Decisions

### Represent top-level categories with a null parent

真实顶级分类保存为 `parent_id = NULL`。查询接口只返回真实分类，`ProductCategoryTO.parentId` 已经能够表达空父级。

不采用“每租户创建一条根记录”，因为它会引入初始化顺序、特殊删除保护、名称哨兵和无业务意义的外键目标。不采用数据库 trigger，因为分类树完整性属于领域规则，并且 trigger 会降低数据库兼容性。

### Keep the virtual root entirely in the Web presentation layer

Web 可显示“全部分类”作为树容器，但该节点：

- 没有数据库 ID；
- 不出现在 API 响应或分类下拉框的真实选项中；
- 不能被编辑、删除或作为产品的 `categoryId`；
- 选择它创建分类时，Web 向创建 API 发送空 `parentId`。

前端不得再通过 `name === "根节点"` 推断系统语义。真实顶级分类由 `parentId == null` 识别。

### Make create parent optional and make PUT parent explicit-nullable

`CreateProductCategoryInput.parentId` 改为可选 nullable：省略或发送 null 都表示创建顶级分类。

现有更新接口使用 HTTP PUT，因此改为完整目标状态契约：`name` 和 `parentId` 都是 required 属性，其中 `parentId` 允许 null。这样：

```text
parentId = null       -> 移动为顶级分类
parentId = <real id>  -> 移动到指定父分类
```

不继续使用当前“null 表示不修改”的 Kotlin 语义，因为它无法表达移动到顶级。也不增加 `moveToRoot` 布尔字段，避免出现它与 `parentId` 冲突的非法组合。生成客户端必须显式提交更新后的完整名称和父级。

### Validate hierarchy in the domain and application layers

应用服务先通过租户过滤后的 repository 解析目标父分类；不存在或属于其他租户时完整拒绝命令。领域方法 `moveTo(parent: ProductCategory?)` 负责：

- 允许 null 父级；
- 拒绝自己作为父级；
- 拒绝不同 `tenantId`；
- 沿目标父级的祖先链向上检查，拒绝任何包含当前分类的移动。

该检查在事务内遍历 JPA 关系，不使用 PostgreSQL recursive CTE 或 trigger。数据库自引用外键继续作为基础引用完整性约束。

### Align name uniqueness with existing application behavior

当前 command service 已通过 `existsByName` 实际执行“租户内名称全局唯一”，因此 schema 统一为：

```sql
UNIQUE (tenant_id, name)
```

删除 `UNIQUE (tenant_id, parent_id, name)` 和 PostgreSQL partial index `WHERE parent_id IS NULL`。这比“同级唯一”更严格，但没有改变当前正常应用路径行为，同时消除 NULL 唯一语义和 partial index 的方言差异。更新名称时应排除当前分类 ID。

### Protect deletion explicitly

删除分类前，应用服务同时检查：

- 没有直接子分类；
- 没有产品引用。

失败时返回明确的领域错误，而不是依赖数据库外键异常。删除叶子分类继续由数据库外键提供最后一道完整性保护。

### Remove the seed root instead of adding tenant provisioning work

`V002` 删除默认租户的根分类 INSERT。`TenantCommandServiceImpl.createTenant` 不增加产品模块依赖；新租户在首次创建真实分类前保持零分类是合法状态。

## Risks / Trade-offs

- [API contract change] 生成客户端的 create/update 类型会变化 → 同步更新 OpenAPI、重新生成客户端并在同一提交更新 Web 调用点。
- [PUT null ambiguity] 旧客户端可能省略 `parentId` → 将其设为 required + nullable，并用契约测试验证生成类型要求显式提交。
- [Hierarchy cycle] 只检查 self 不足以阻止多级环 → 沿新父级祖先链检查当前分类，并增加两级以上回归测试。
- [Cross-tenant ID probing] 调用者可能提交其他租户分类 ID → 依赖当前 Hibernate Filter + RLS 查询不到该 ID，并在领域层再次比较 tenantId。
- [Concurrent duplicate names] 仅应用检查存在竞态 → 保留便携的数据库 `UNIQUE (tenant_id, name)` 并将冲突映射为明确响应。
- [Existing root references] 已有数据库可能有产品或分类引用旧根 → 当前方案只允许重建开发数据库；若部署状态改变，停止实施并设计独立 forward migration 与数据清理策略。
- [Empty catalog UX] 新租户没有任何分类时产品不能创建 → 产品页面提示先创建真实顶级分类，不自动制造“未分类”数据。

## Migration Plan

1. 实施前再次确认 V001/V002 尚未进入需要保留历史的共享环境。
2. 调整领域、repository 和 use case，使可空父级、完整 PUT、循环/租户/删除校验先落地并通过测试。
3. 更新 OpenAPI 并重新生成共享客户端，再更新 Web 虚拟根和表单提交。
4. 修改 V001 唯一约束、删除 partial index，并从 V002 删除根分类种子。
5. 删除并重建数据库，验证 Flyway 基线后默认租户的 `product_category` 行数为 0。
6. 执行后端模块、OpenAPI、Web 和跨租户回归测试。

当前开发环境回滚方式是恢复代码和 V001/V002 后再次重建数据库，不提供 down migration。如果实施前发现迁移已共享部署，则本计划不可直接执行，必须保留旧 migration 并创建下一个 forward-only 版本。

## Open Questions

无阻塞问题。虚拟根展示文案默认使用“全部分类”；它是 UI 文案，可以独立国际化，不属于 API 或数据库契约。
