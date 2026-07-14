# AbacusFlow SaaS 架构演进路线图

## 一、最终架构结论

AbacusFlow 不应该一开始就采用：

* 一个客户一个数据库
* 一个客户一个 Schema
* 一开始就部署多个 Cell
* 一开始就进行分库分片

最终推荐架构是：

```text
默认客户
→ 共享 Cell
→ 共享数据库集群
→ 共享 Schema
→ 所有业务表使用 tenant_id
→ PostgreSQL RLS 二次隔离

大客户、合规客户
→ 独立 Cell
→ 独立数据库集群

不同国家和地区客户
→ 路由到对应区域的 Cell
```

最终形态：

```text
                         Control Plane
                用户、租户、成员、套餐、租户位置
                              │
                       Tenant Router
                              │
          ┌───────────────────┼──────────────────┐
          ▼                   ▼                  ▼
     US Shared Cell      EU Shared Cell     Dedicated Cell
     普通美国客户         欧洲客户            大型企业客户
          │                   │                  │
     PostgreSQL          PostgreSQL         PostgreSQL
     高可用集群           高可用集群          独立高可用集群
```

核心原则：

> 现在只建设一个 Cell，但数据模型和代码不能假设未来永远只有一个数据库。

---

# 二、当前只实施 P0

## P0 目标

将当前系统从：

```text
所有用户共享同一套业务数据
```

改造成：

```text
一个用户可以属于多个租户
每个请求只能操作当前租户
所有数据、文件、缓存、报表、任务都不能跨租户
```

P0 完成之前不能正式开放多商户注册。

---

# 三、P0 当前部署形态

现在只部署一个 Cell：

```text
Cell: cell-default-01
├── AbacusFlow API
├── Web 管理端
├── Mobile API
├── PostgreSQL
├── Redis
├── 对象存储
├── Cube
└── 定时任务
```

数据库内部暂时分成两个逻辑区域：

```text
PostgreSQL
├── platform Schema
│   ├── tenant
│   ├── tenant_membership
│   ├── tenant_membership_role
│   ├── tenant_invitation
│   ├── tenant_placement
│   └── permission
│
└── business Schema 或现有 public Schema
    ├── product
    ├── inventory
    ├── sale_order
    ├── purchase_order
    ├── customer
    ├── supplier
    └── depot
```

P0 阶段 `tenant_placement` 中所有租户都指向同一个 Cell：

```text
tenant_id  cell_id          storage_mode  status
1001       cell-default-01  SHARED        ACTIVE
1002       cell-default-01  SHARED        ACTIVE
1003       cell-default-01  SHARED        ACTIVE
```

现在它只是一个未来扩展点，不需要真正进行动态数据库路由。

---

# 四、P0 具体改造内容

## P0-A：数据库迁移体系

首先引入 Flyway。

不能继续只修改：

```text
script/initdb/01-schema.sql
```

需要建立正式版本迁移：

```text
V001__baseline.sql
V002__create_tenant_tables.sql
V003__add_tenant_id.sql
V004__migrate_user_roles.sql
V005__enable_rls.sql
```

迁移顺序：

```text
创建租户表
→ 创建默认租户
→ 业务表增加 nullable tenant_id
→ 回填已有数据
→ 修改唯一约束
→ 设置 tenant_id NOT NULL
→ 启用 RLS
→ 验证后删除旧 user_role
```

---

## P0-B：租户领域模型

新增模块：

```text
abacusflow-core/abacusflow-tenant
abacusflow-usecase/abacusflow-usecase-tenant
```

新增核心对象：

```text
Tenant
TenantMembership
TenantInvitation
TenantPlacement
TenantStatus
MembershipStatus
```

关系调整为：

```text
User
  │
  ▼
TenantMembership
  │
  ▼
TenantMembershipRole
  │
  ▼
Role
  │
  ▼
Permission
```

取消：

```text
User → Role
```

同一个用户可以：

```text
A 企业：OWNER
B 企业：READER
C 企业：不是成员
```

Auth0 只负责用户身份认证，不作为 AbacusFlow 租户数据的唯一来源。

---

## P0-C：登录和租户上下文

登录流程调整为：

```text
Auth0 登录
→ 查找或创建全局 User
→ 查询 TenantMembership
```

返回三种状态：

```text
没有租户
→ NEEDS_ONBOARDING

只有一个租户
→ 自动选中

有多个租户
→ SELECT_TENANT
```

业务请求携带：

```http
X-Tenant-Id: 1001
```

后端必须验证：

```text
当前用户是否是租户 1001 的有效成员
```

新增：

```text
TenantContextFilter
CurrentTenantProvider
TenantAccessService
TenantWriteGuard
```

业务 Usecase 统一获取：

```kotlin
val tenantId = currentTenantProvider.requireTenantId()
```

业务请求 JSON 不允许自由传入 `tenantId`。

---

## P0-D：所有业务表增加 tenant_id

需要增加：

```text
role
product_category
product
inventory
inventory_unit
purchase_order
purchase_order_item
sale_order
sale_order_item
customer
supplier
depot
feedback
```

暂时不增加：

```text
user_account
user_external_identity
permission
```

唯一约束改为租户范围：

```sql
unique (tenant_id, barcode)
unique (tenant_id, product_id)
unique (tenant_id, serial_number)
unique (tenant_id, role_name)
```

常用索引以 `tenant_id` 开头：

```sql
create index idx_product_tenant_name
on product (tenant_id, name);

create index idx_sale_order_tenant_status_date
on sale_order (tenant_id, status, order_date desc);

create index idx_inventory_tenant_product
on inventory (tenant_id, product_id);
```

---

## P0-E：Repository 和 jOOQ 租户隔离

当前：

```kotlin
findById(id)
findByName(name)
```

修改为：

```kotlin
findByIdAndTenantId(id, tenantId)
findByTenantIdAndName(tenantId, name)
existsByTenantIdAndBarcode(tenantId, barcode)
```

jOOQ 查询必须从固定租户条件开始：

```kotlin
val conditions = mutableListOf(
    PRODUCT.TENANT_ID.eq(tenantId)
)
```

关联资源也要验证同一租户：

```text
订单和客户属于同一租户
订单项和商品属于同一租户
库存和仓库属于同一租户
采购项和商品属于同一租户
```

访问其他租户资源统一返回 `404`，不暴露资源是否存在。

---

## P0-F：PostgreSQL RLS

P0 中加入 RLS，而不是等到后期。

应用层租户条件是第一道防线，RLS 是数据库层第二道防线。

例如：

```sql
alter table product enable row level security;
alter table product force row level security;

create policy product_tenant_policy
on product
using (
    tenant_id =
    nullif(current_setting('app.tenant_id', true), '')::bigint
)
with check (
    tenant_id =
    nullif(current_setting('app.tenant_id', true), '')::bigint
);
```

事务开始后设置：

```sql
select set_config('app.tenant_id', '1001', true);
```

即使代码误写：

```sql
select * from product;
```

数据库也只能返回当前租户的数据。

生产应用数据库账号必须：

```text
不是超级用户
不是表所有者
没有 BYPASSRLS
没有 TRUNCATE 和 DDL 权限
```

---

## P0-G：库存并发和事务

库存扣减仍然运行在单个租户、单个数据库事务中。

Usecase：

```text
@Transactional
→ 获取当前 tenantId
→ 检查租户允许写入
→ 锁定库存行
→ 检查库存
→ 扣减库存
→ 创建销售单
→ COMMIT
```

JPA：

```kotlin
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query(
    """
    select i from Inventory i
    where i.tenantId = :tenantId
      and i.productId = :productId
    """
)
fun findForUpdate(
    tenantId: Long,
    productId: Long
): Inventory?
```

数据库生成：

```sql
select *
from inventory
where tenant_id = ?
  and product_id = ?
for update;
```

商品资料等低冲突修改继续使用：

```kotlin
@Version
```

库存扣减等高冲突操作使用：

```text
悲观锁或原子 UPDATE
```

---

## P0-H：外围数据隔离

不仅业务表需要隔离。

### 缓存

错误：

```text
product:100
```

正确：

```text
tenant:1001:product:100
```

### 领域事件

必须包含：

```json
{
  "eventId": "...",
  "tenantId": 1001,
  "eventType": "SaleOrderCompleted",
  "aggregateId": "..."
}
```

### 文件存储

改成：

```text
tenants/{tenantId}/feedback/{uuid}
```

使用私有 Bucket 和短期签名 URL。

### Cube

后端签发包含 `tenantId` 的短期 Cube Token，Cube 强制追加租户过滤条件。

### 定时任务

平台任务按租户逐个处理：

```text
获取活跃租户
→ 设置 TenantContext
→ 处理该租户订单
→ 清理 TenantContext
```

不能使用超级数据库账号绕过全部 RLS 后直接混合处理。

---

## P0-I：Web 和移动端

增加：

```text
/onboarding
/tenant/select
/settings/organization
/settings/members
```

顶部增加当前企业：

```text
Bruce 商贸
    ▼
切换企业
企业设置
成员管理
```

API 客户端自动添加：

```http
X-Tenant-Id
```

切换租户后必须清理：

```text
商品缓存
库存缓存
订单缓存
查询缓存
移动端本地数据
```

---

# 五、P0 实施顺序

不要一次修改全部模块，按以下顺序推进：

```text
1. 引入 Flyway
2. 创建 Tenant、Membership、Placement
3. 修改认证和 TenantContext
4. 修改角色模型
5. Product 模块作为第一个试点
6. Partner 和 Depot
7. Inventory
8. PurchaseOrder 和 SaleOrder
9. Feedback、文件、缓存、事件
10. Cube
11. Web 和移动端
12. RLS
13. 全链路跨租户测试
14. 删除旧 user_role
```

---

# 六、P0 完成标准

只有全部通过才能开放多商户：

```text
租户 A 无法读取租户 B 的资源
租户 A 无法修改或删除租户 B 的资源
两个租户可以使用相同商品条码
同一用户可以切换多个租户
不传 X-Tenant-Id 时拒绝业务请求
伪造租户 ID 时返回 403
访问其他租户资源 ID 时返回 404
数据库 RLS 能阻止漏写租户条件的 SQL
Cube 只显示当前租户
文件不能跨租户访问
缓存不会串租户
事件和定时任务不会串租户
库存并发扣减不会超卖
```

---

# 七、P1：自助 SaaS 产品能力

## 什么时候进入 P1？

满足以下条件后：

```text
P0 已稳定
准备允许外部商户自行注册
开始有真实团队成员共同使用
```

## P1 建设内容

```text
创建企业引导
邀请成员
成员接受邀请
成员禁用和移除
默认角色
多租户切换
企业资料设置
审计日志
套餐和额度模型
```

增加：

```text
plan
tenant_subscription
usage_counter
feature_entitlement
```

先实现套餐限制，不急着接支付：

```text
免费版：2 个成员、1 个仓库、100 个商品
基础版：10 个成员、3 个仓库、5000 个商品
专业版：更高额度
```

---

# 八、P2：生产高可用

## 什么时候进入 P2？

出现以下任一情况：

```text
开始有付费客户
业务不能接受数据库单机故障
需要明确 SLA
需要可靠备份和恢复
单次停机已经会产生实际损失
```

## P2 建设内容

数据库升级为高可用集群：

```text
稳定写入口
      │
      ▼
PostgreSQL 主库
      │
      └── WAL 复制
             ▼
        PostgreSQL 备库
```

优先使用云托管 PostgreSQL：

```text
主库
备库
自动故障切换
稳定 Endpoint
自动备份
PITR
```

同时完成：

```text
API 多实例
负载均衡
数据库主备
每日备份
时间点恢复 PITR
恢复演练
慢 SQL 监控
锁等待监控
复制延迟监控
连接池监控
Flyway 分批迁移
```

这时仍然只有一个 Cell。

---

# 九、P3：单个 Cell 内的性能治理

## 什么时候进入 P3？

出现：

```text
数据库查询延迟持续上升
读请求明显占用主库资源
数据库连接开始接近上限
订单或日志表历史数据非常大
VACUUM、建索引、备份越来越慢
```

注意：先优化 SQL 和索引，不是立即分库。

## P3 建设内容

### 读扩展

```text
写事务、库存、刚写完的查询
→ 主库

历史报表、趋势分析、Cube
→ 只读副本
```

不要把所有 `SELECT` 自动转到只读库。

### 连接管理

```text
PgBouncer
连接池总量预算
事务超时
SQL 超时
连接泄漏检测
```

### 大表治理

优先按时间分区：

```text
sale_order
sale_order_item
purchase_order
purchase_order_item
inventory_change_log
audit_log
domain_event
```

例如：

```text
sale_order
├── sale_order_2027_01
├── sale_order_2027_02
└── sale_order_2027_03
```

应用仍然查询：

```text
sale_order
```

由 PostgreSQL 自动路由和分区裁剪。

同时完成：

```text
游标分页
历史归档
冷热数据分离
VACUUM 调优
索引审查
```

---

# 十、P4：多 Cell 和数据库分片

## 什么时候进入 P4？

出现以下任一情况才真正分库：

```text
单个主库写入能力接近极限
CPU 或 IOPS 长期高位
WAL 和复制延迟持续增加
某个大租户拖慢其他租户
单个数据库恢复时间超过 RTO
一个数据库故障影响所有客户不可接受
出现欧洲、美国等数据驻留要求
```

参考信号，不是绝对阈值：

```text
主库 CPU 长期超过约 70%～80%
数据库写入 P95/P99 持续恶化
一个租户占用 20%～30% 以上资源
备份或恢复超出业务允许时间
```

## P4 目标架构

这时将 Control Plane 真正独立：

```text
Control Plane
├── tenant
├── tenant_membership
├── tenant_placement
├── cell
├── subscription
└── region
```

业务 Cell：

```text
Cell US-01
├── API
├── PostgreSQL 高可用集群
├── Redis
├── Queue
└── Object Storage

Cell US-02
├── API
├── PostgreSQL 高可用集群
├── Redis
├── Queue
└── Object Storage
```

租户路由：

```text
tenant 1001 → cell-us-01
tenant 1002 → cell-us-01
tenant 2001 → cell-us-02
```

此时：

```text
一个 Cell
≈ 一个数据库分片
≈ 一个高可用数据库集群
```

这是 AbacusFlow 的架构约定，不是概念上的必然关系。

---

## P4 API 工作方式

不是一套 API 动态维护所有数据库连接。

而是：

```text
同一份 AbacusFlow 代码
部署成多个 Cell
每个 Cell 只连接自己的数据库
```

请求流程：

```text
用户请求 tenant 1001
→ 网关查询 tenant_placement
→ 转发到 cell-us-01
→ Cell 验证租户属于自己
→ 使用固定 DataSource
→ 执行本地事务
```

普通业务请求必须保持：

```text
一个请求
→ 一个租户
→ 一个 Cell
→ 一个数据库集群
```

禁止普通在线交易跨 Cell。

全平台统计通过：

```text
各 Cell 发布事件
→ 数据仓库
→ 全局分析
```

而不是一个事务查询多个数据库。

---

# 十一、P5：独立数据库和区域化部署

## 什么时候进入 P5？

出现：

```text
大型企业要求物理隔离
客户要求独立备份和恢复
单个租户数据量远大于其他客户
客户要求独立 SLA
客户有数据驻留或合规要求
需要私有化交付
```

## P5 建设内容

增加存储模式：

```kotlin
enum class TenantStorageMode {
    SHARED_CELL,
    DEDICATED_DATABASE
}
```

普通客户：

```text
tenant 1001
→ shared-cell-us-01
```

大客户：

```text
tenant 9001
→ dedicated-cell-enterprise-01
```

即使独立数据库，业务表仍然保留：

```text
tenant_id
```

这样共享库和独立库使用完全相同的：

```text
实体模型
Flyway
业务代码
事件格式
RLS 策略
迁移工具
```

---

# 十二、租户迁移能力

P4/P5 需要支持：

```text
共享 Cell
→ 其他共享 Cell
→ 独立数据库
→ 其他区域 Cell
```

迁移流程：

```text
1. 创建目标数据库结构
2. status = COPYING
3. 复制 tenant_id 对应的全量数据
4. 通过 Outbox 或 CDC 同步增量
5. status = WRITE_BLOCKED
6. 网关和 Usecase 阻止新的写请求
7. 等待正在执行的事务结束
8. 同步最后增量
9. 校验数据
10. 修改 tenant_placement.cell_id
11. placement_version + 1
12. 清理路由缓存
13. 新请求进入目标 Cell
14. 旧数据保留观察期
15. 稳定后删除旧副本
```

冻结写入不是长期持有数据库锁，而是应用级写屏障：

```kotlin
tenantWriteGuard.requireWritable(tenantId)
```

迁移期间：

```text
GET 可以继续
POST、PUT、PATCH、DELETE 返回暂时不可写
```

---

# 十三、最终成熟形态

```text
Auth0
  │
  ▼
Global Gateway
  │
  ▼
Control Plane
  │
  ├── TenantMembership
  ├── Subscription
  ├── Region
  └── TenantPlacement
          │
          ▼
┌────────────────────────────────────────────┐
│                                            │
▼                                            ▼
US Shared Cell                          EU Shared Cell
普通美国客户                             欧洲客户
│                                            │
PostgreSQL HA                            PostgreSQL HA
RLS + tenant_id                         RLS + tenant_id
按时间分区                               按时间分区
│                                            │
└───────────────────┬────────────────────────┘
                    ▼
             Dedicated Cell
             大型或合规客户
             独立数据库集群
```

---

# 十四、明确不做的事情

P0 当前不要做：

```text
多个 Cell 实际部署
数据库分片
一个客户一个数据库
一个客户一个 Schema
读写分离
订单表分区
跨区域灾备
在线租户迁移
复杂用量计费
复杂角色编辑器
Auth0 Organizations 深度绑定
```

但是 P0 必须预留：

```text
TenantPlacement
cellId
storageMode
tenantId
领域事件 tenantId
缓存 tenantId
文件 tenantId
CurrentTenantProvider
TenantWriteGuard
```

这叫：

> 预留清晰的演进边界，而不是提前实现全部复杂基础设施。

---

# 十五、最终阶段判断表

| 阶段 | 解决的问题          | 进入条件               |
| -- | -------------- | ------------------ |
| P0 | 安全多租户          | 现在立即实施             |
| P1 | 自助注册、成员、套餐     | 准备面向外部商户           |
| P2 | 高可用和灾备         | 开始有付费客户或 SLA       |
| P3 | 单 Cell 查询和大表性能 | 查询、连接、维护开始出现压力     |
| P4 | 分库、分片、多 Cell   | 主库写入、故障范围、数据驻留成为瓶颈 |
| P5 | 独立数据库、全球区域化    | 大客户、合规、物理隔离要求      |

最终目标不是从第一天就部署终极架构，而是：

```text
今天：
一个安全的共享 Cell

未来：
任何租户可以迁移到其他 Cell

更远未来：
任何大客户可以迁移到独立数据库

整个过程中：
业务模型、API 和核心代码不需要推倒重写
```
