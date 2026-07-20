## Why

产品分类当前把“根节点”作为 `product_category` 真实记录保存，只为满足必填 `parentId` 和前端树形展示；这导致新租户缺少根记录、前端依赖中文名称识别系统节点，并把租户创建与产品目录初始化错误地耦合。数据库应只保存真实业务分类，树的总根应由客户端虚拟展示。

## What Changes

- **BREAKING** 删除 `V002` 中默认租户的持久化“根节点”分类，不再为任何租户创建系统根分类记录。
- 将产品分类创建契约的 `parentId` 改为可选：空值创建顶级分类，非空值创建指定父分类下的子分类。
- 后端使用 `parent_id IS NULL` 表示真实顶级分类，并验证父分类属于当前租户、分类移动不会形成环。
- 前端使用无数据库 ID 的虚拟“全部分类”容器展示一个统一树根，不再通过名称“根节点”识别或保护特殊记录。
- 产品只能引用真实分类；虚拟根不得出现在产品分类选择值或 API 请求中。
- 将分类名称唯一规则统一为租户内唯一 `UNIQUE (tenant_id, name)`，移除依赖 PostgreSQL partial index 的顶级分类特殊唯一约束。
- 删除租户 provisioning 对产品分类根节点的任何需求，使新租户可以合法拥有零个分类。

## Capabilities

### New Capabilities

- `product-category-hierarchy`: 定义无持久化根节点的租户级产品分类森林、可选父分类契约、层级完整性和虚拟根展示行为。

### Modified Capabilities

无。当前 `openspec/specs/` 中没有已发布的产品分类能力规格。

## Impact

- 产品分类领域模型、仓储查询和 command/query use case。
- `CreateProductCategoryInput`、OpenAPI schema、生成的 TypeScript/Kotlin 客户端。
- Web 产品分类树、创建/编辑表单及产品分类选择器。
- `V001__init_schema.sql` 的唯一约束/索引和 `V002__init_data.sql` 的种子数据。
- 产品分类、跨租户隔离、循环检测、删除保护、OpenAPI 和 Web 行为测试。
- 当前开发基线由使用者重建数据库，不提供旧“根节点”记录的原位迁移；首次共享环境部署后应改用新的 forward-only Flyway migration。
