# App Routes

`src/app` 是 Expo Router 的路由层。这里的 `.tsx` 文件应保持很薄，只负责 URL、Tab、Stack 标题和跳转入口。

普通 route 文件从 feature 入口导出页面，例如：

```ts
export { DepotCreateScreen as default } from "@features/depots";
```

这样阅读路径是 `route -> feature index -> screen`，不会从 route 直接钻到内部 `screens` 文件。

## Layouts

| File | Role |
| --- | --- |
| `_layout.tsx` | 根 Stack 布局，挂载 `AuthGate`，配置所有非 Tab 页面标题。 |
| `(tabs)/_layout.tsx` | 底部 Tab 布局，配置录入、流水、查询、资料、我的。 |
| `oauth/callback.tsx` | Auth0 回调落点，完成后回到首页。 |

## Route To Screen

| Route file | Feature screen |
| --- | --- |
| `(tabs)/index.tsx` | `features/entry/screens/entry-home-screen.tsx` |
| `(tabs)/records.tsx` | `features/records/screens/records-screen.tsx` |
| `(tabs)/lookup.tsx` | `features/lookup/screens/lookup-screen.tsx` |
| `(tabs)/depots.tsx` | `features/depots/screens/depot-list-screen.tsx` |
| `(tabs)/drafts.tsx` | `features/drafts/screens/drafts-screen.tsx` |
| `(tabs)/me.tsx` | `features/profile/screens/me-screen.tsx` |
| `entry/purchase.tsx` | `features/entry/screens/purchase-entry-screen.tsx` |
| `entry/sale.tsx` | `features/entry/screens/sale-entry-screen.tsx` |
| `entry/product.tsx` | `features/entry/screens/product-entry-screen.tsx` |
| `scan/index.tsx` | `features/scan/screens/scan-screen.tsx` |
| `depot/add.tsx` | `features/depots/screens/depot-create-screen.tsx` |
| `depot/[id].tsx` | `features/depots/screens/depot-detail-screen.tsx` |
| `depot/edit/[id].tsx` | `features/depots/screens/depot-edit-screen.tsx` |
| `product/[id].tsx` | `features/products/screens/product-detail-screen.tsx` |
| `product/edit/[id].tsx` | `features/products/screens/product-edit-screen.tsx` |
| `inventory/[id].tsx` | `features/inventory/screens/inventory-detail-screen.tsx` |
| `partner/customer/index.tsx` | `features/partners/screens/customer-list-screen.tsx` |
| `partner/customer/add.tsx` | `features/partners/screens/customer-create-screen.tsx` |
| `partner/customer/[id].tsx` | `features/partners/screens/customer-detail-screen.tsx` |
| `partner/customer/edit/[id].tsx` | `features/partners/screens/customer-edit-screen.tsx` |
| `partner/supplier/index.tsx` | `features/partners/screens/supplier-list-screen.tsx` |
| `partner/supplier/add.tsx` | `features/partners/screens/supplier-create-screen.tsx` |
| `partner/supplier/[id].tsx` | `features/partners/screens/supplier-detail-screen.tsx` |
| `partner/supplier/edit/[id].tsx` | `features/partners/screens/supplier-edit-screen.tsx` |
| `feedback/index.tsx` | `features/feedback/screens/feedback-screen.tsx` |

## Rule For New Routes

1. Put the real screen in `src/features/<feature>/screens`.
2. Export it from `src/features/<feature>/index.ts`.
3. Add a one-line route shell in `src/app`.
4. Add the route title in `src/app/_layout.tsx` if it is a Stack screen.
5. Update this README.
