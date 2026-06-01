# Mobile Source Map

`src` 按“路由壳、业务功能、通用组件、基础设施”分层。

```text
src/
  app/          Expo Router 路由壳。这里决定 URL、Tab、Stack 标题。
  features/     业务功能。页面状态、API 调用、表单提交、业务交互放这里。
  components/   跨业务复用的页面模板和 UI 原子组件。
  providers/    App 级 Provider，比如 AuthGate。
  hooks/        跨功能复用 hooks。
  lib/          本地存储、草稿等客户端基础设施。
  constants/    路由、主题、运行时配置。
```

## Reading Rule

- `src/app/**/*.tsx`: 不写业务，只从 `src/features/<feature>/index.ts` re-export screen，或配置导航。
- `src/features/**/screens/*.tsx`: 一个文件就是一个业务页面。
- `src/features/**/index.ts`: 这个 feature 对外暴露哪些 screen。
- `src/components/layout/*.tsx`: 页面模板，给多个业务页面复用。
- `src/components/ui/*.tsx`: 小型 UI/设备能力组件。

如果不知道一个页面从哪里来，先看 `src/app/README.md` 的 route-to-screen 表。
