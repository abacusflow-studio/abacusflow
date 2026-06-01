# Shared Components

`src/components` 只放跨功能复用的组件。业务页面不要放在这里。

## Layout Templates

| File | Role | Typical caller |
| --- | --- | --- |
| `layout/list-screen.tsx` | 通用列表页模板：搜索、刷新、加载更多、新增入口、空状态、错误重试。 | 储存点、客户、供应商列表 |
| `layout/detail-screen.tsx` | 通用详情页模板：标题、状态标签、字段卡片、编辑/删除按钮。 | 产品、储存点、客户、供应商、库存详情 |
| `layout/form-screen.tsx` | 通用表单页模板：文本、数字、选择、开关、多行文本、图片上传。 | 基础资料新增/编辑、反馈 |

## UI Components

| File | Role | Typical caller |
| --- | --- | --- |
| `ui/barcode-scanner.tsx` | 相机扫码弹层，统一处理扫码授权、扫码视图、关闭按钮。 | 入库、出库、新品建档、查询、通用扫码页 |

## Placement Rule

- 被两个以上 feature 复用，才放 `components`。
- 只服务一个 feature 的小组件，放到 `src/features/<feature>/components`。
- 带业务 API、路由参数、草稿恢复的组件不是 shared component，应放在 `features/*/screens` 或 feature 内部组件。

