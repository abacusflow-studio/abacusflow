# AbacusFlow Mobile

AbacusFlow Mobile 是面向现场录入的 Expo 应用。当前主功能围绕四个底部 Tab：

- `录入`: 入库、出库、新品建档、草稿续填。
- `流水`: 查看最近入库/出库流水。
- `查询`: 扫码或关键词查询产品、库存、单据。
- `我的`: 账号信息、客户/供应商/储存点资料、问题反馈。

## Directory Layout

```text
apps/mobile/
  app.json
  package.json
  tsconfig.json
  metro.config.js

  src/
    app/                 Expo Router 路由壳，只负责 URL 和导航标题
    features/            按业务功能拆分的页面实现
    components/
      ui/                小型通用 UI 组件
      layout/            页面级布局组件
    hooks/               跨功能复用 hooks
    constants/           路由、主题、运行时配置
    lib/                 存储、草稿等基础设施
    providers/           App/Auth provider

  assets/                app 图标、启动图、favicon 等仍在使用的资源
  bak/                   已从活跃信息架构移出的备份代码
```

`src/app/` 下的页面文件应保持很薄，通常只 re-export `src/features/*/screens/*`。新增业务页面时，先放到对应 feature，再在 `src/app/` 建路由壳。

## Feature Map

- `src/features/entry`: 现场录入流程，包含入库、出库、新品建档和首页入口。
- `src/features/drafts`: 未提交草稿列表和恢复入口。
- `src/features/records`: 入库/出库流水列表。
- `src/features/lookup`: 扫码查询和关键词查询。
- `src/features/profile`: 我的页面。
- `src/features/depots`: 储存点列表、详情、创建、编辑。
- `src/features/partners`: 客户和供应商资料。
- `src/features/products`: 产品详情和编辑。
- `src/features/inventory`: 库存详情和库存预警设置。
- `src/features/feedback`: 问题反馈。
- `src/features/scan`: 通用扫码跳转页。
- `src/features/auth`: Auth0 登录服务。

## Backup Policy

`bak/` 保存暂时不用但可能需要参考的代码：

- `bak/legacy-management`: 旧的隐藏管理入口、旧订单新增/详情页面、旧订单表单。
- `bak/template`: Expo 默认模板组件、示例 modal、未使用 React logo 资源。

`bak/` 已从 TypeScript 和 ESLint 中排除。恢复代码时先移回 `src/features` 或 `src/components`，再接入 `src/app` 路由。

## Commands

```bash
npm run start
npm run typecheck
npm run lint
npm run eas:preview:android
```
