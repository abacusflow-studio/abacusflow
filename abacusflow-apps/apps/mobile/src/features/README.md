# Feature Screens

`features` 是 mobile 的业务层。每个 `screens/*.tsx` 都是一个完整页面，负责自己的状态、API 调用、表单提交和路由跳转。

每个 feature 目录有一个 `index.ts`，它是这个 feature 的公开出口。`src/app` 路由只能从这里导入 screen，不直接引用内部 `screens/*`。

## Screen Types

| Type                  | Meaning                                                    |
| --------------------- | ---------------------------------------------------------- |
| `*-list-screen.tsx`   | 列表页，通常使用 `ListScreen` 模板。                       |
| `*-detail-screen.tsx` | 详情页，通常使用 `DetailScreen` 模板。                     |
| `*-create-screen.tsx` | 新增页，通常使用 `FormScreen` 模板。                       |
| `*-edit-screen.tsx`   | 编辑页，通常先加载详情，再使用 `FormScreen` 模板。         |
| `*-entry-screen.tsx`  | 现场录入流程，通常是定制页面，包含草稿、扫码、选择、提交。 |

## Feature Map

| Feature     | Screen                        | Role                                                                          |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------- |
| `entry`     | `entry-home-screen.tsx`       | 录入 Tab 首页，进入入库、出库、新品建档、草稿。                               |
| `entry`     | `purchase-entry-screen.tsx`   | 入库现场流程：选供应商、扫/选产品、维护入库明细、保存草稿、提交采购单。       |
| `entry`     | `sale-entry-screen.tsx`       | 出库现场流程：选客户、选产品、按产品筛库存单元、扫 SN、保存草稿、提交销售单。 |
| `entry`     | `product-entry-screen.tsx`    | 新品建档流程：扫码带入条码、填写产品信息、选择类别、保存草稿、创建产品。      |
| `drafts`    | `drafts-screen.tsx`           | 草稿列表，按草稿类型恢复到对应录入流程。                                      |
| `records`   | `records-screen.tsx`          | 入库/出库流水聚合列表。                                                       |
| `lookup`    | `lookup-screen.tsx`           | 查询中心，支持产品、库存、单据关键词和扫码查询。                              |
| `scan`      | `scan-screen.tsx`             | 通用扫码中转页，根据扫码结果跳到入库、出库、新品或查询。                      |
| `profile`   | `me-screen.tsx`               | 我的页面，展示用户信息和资料管理入口。                                        |
| `feedback`  | `feedback-screen.tsx`         | 问题反馈表单，支持图片上传。                                                  |
| `depots`    | `depot-list-screen.tsx`       | 储存点列表和新增入口。                                                        |
| `depots`    | `depot-detail-screen.tsx`     | 储存点详情、编辑、删除。                                                      |
| `depots`    | `depot-create-screen.tsx`     | 新增储存点。                                                                  |
| `depots`    | `depot-edit-screen.tsx`       | 编辑储存点。                                                                  |
| `products`  | `product-detail-screen.tsx`   | 产品详情、编辑、删除。                                                        |
| `products`  | `product-edit-screen.tsx`     | 编辑产品基础信息。                                                            |
| `inventory` | `inventory-detail-screen.tsx` | 库存详情和安全库存/最大库存设置。                                             |
| `partners`  | `customer-list-screen.tsx`    | 客户列表和新增入口。                                                          |
| `partners`  | `customer-detail-screen.tsx`  | 客户详情、编辑、删除。                                                        |
| `partners`  | `customer-create-screen.tsx`  | 新增客户。                                                                    |
| `partners`  | `customer-edit-screen.tsx`    | 编辑客户。                                                                    |
| `partners`  | `supplier-list-screen.tsx`    | 供应商列表和新增入口。                                                        |
| `partners`  | `supplier-detail-screen.tsx`  | 供应商详情、编辑、删除。                                                      |
| `partners`  | `supplier-create-screen.tsx`  | 新增供应商。                                                                  |
| `partners`  | `supplier-edit-screen.tsx`    | 编辑供应商。                                                                  |
| `auth`      | `services/auth-service.ts`    | Mobile Auth0 / dev mock auth 客户端，不是页面组件。                           |

## Where To Put New Code

- 新业务页面：`src/features/<feature>/screens/<name>-screen.tsx`
- feature 对外出口：`src/features/<feature>/index.ts`
- 某个业务页面专用小组件：`src/features/<feature>/components/<name>.tsx`
- 某个业务页面专用 hook：`src/features/<feature>/hooks/<name>.ts`
- 多个业务共用 UI：`src/components/ui` 或 `src/components/layout`
- 多个业务共用数据逻辑：优先放 `src/lib` 或共享 package，不塞进 screen。
