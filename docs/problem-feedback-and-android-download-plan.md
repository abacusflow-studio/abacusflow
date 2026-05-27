# 问题收集与 Android 扫码下载安装执行计划

## 1. 背景

AbacusFlow 刚上线，真实用户遇到的问题比内部假设更重要。当前 Web 和 Mobile 已经具备基础业务流程，但缺少一个足够直观的问题反馈入口；同时 Mobile 需要让门店用户能从 Web 端直接拿到 Android 安装包，降低首次安装和后续更新成本。

本计划覆盖两件事：

- 在 Web 和 Mobile 增加统一的问题收集能力。
- 在 Web 增加 Android 下载入口和二维码，让用户用手机扫码后直接打开下载页、下载 APK 并完成安装。

## 2. 目标

1. 用户在 Web 或 Mobile 任意主流程中，最多 2 次点击可以提交问题。
2. 反馈内容通过后端统一提交，MVP 直接邮件通知负责人，并保留后续持久化处理入口。
3. P1 再提供 Web 端查看、筛选、处理问题的运营后台。
4. Web 端提供公开的 Mobile 下载页，桌面 Web 展示二维码，手机扫码后进入同一下载页。
5. Android APK 能通过可重复的构建和发布流程生成、托管、下载，并提供版本号、更新时间、校验信息。

## 3. 非目标

- 第一版不做完整客服工单系统，不做聊天式 IM。
- 第一版不强制做截图自动上传；如没有对象存储，先做文字反馈和环境信息。
- 第一版不做 iOS 分发。
- Android 不能静默安装 APK，安装动作必须由用户在系统安装界面确认；本计划实现的是下载分发和安装引导。

## 4. 产品方案

### 4.1 问题收集入口

Web：

- 在管理后台 Header 增加“反馈”图标按钮。
- 在关键错误提示、提交失败 Toast 中增加“反馈此问题”动作。
- P1 新增“问题反馈”管理页，用于查看和处理反馈。

Mobile：

- 在“我的”页增加“问题反馈”入口。
- 在扫码、采购入库、销售出库、新品建档、草稿提交失败等页面增加行内“反馈问题”动作。
- 提交失败时自动带上当前页面、业务动作、错误摘要。

### 4.2 反馈表单字段

MVP 必填：

| 字段 | 说明 |
| --- | --- |
| 问题类型 | Bug、数据不对、操作不会用、功能建议、其他 |
| 问题描述 | 用户用自然语言描述问题 |
| 联系方式 | 默认带当前账号 email，可修改，可为空 |

MVP 自动采集：

| 字段 | Web | Mobile |
| --- | --- | --- |
| 来源端 | `WEB` | `MOBILE` |
| 当前页面 | `pathname` | Expo Router 路径 |
| 用户 ID | 当前登录用户 | 当前登录用户 |
| 客户端版本 | Web build/version | `CURRENT_VERSION` + Expo app version |
| 设备信息 | browser、OS、viewport | platform、device、OS version |
| 错误上下文 | 最近一次 API error，可脱敏 | 最近一次 API error，可脱敏 |
| 提交时间 | 后端生成 | 后端生成 |

MVP 提交通知：

- 用户提交后，由后端发送邮件到配置的收件人。
- 邮件标题建议：`[AbacusFlow反馈][来源端][问题类型] 问题摘要`。
- 邮件正文包含问题描述、用户联系方式、页面、客户端版本、设备信息、错误摘要。
- 用户填写的联系方式或账号 email 设置为 `Reply-To`，方便直接回复。

P1 增强：

- 附件上传：图片、截图、短视频。
- 自动截屏：Web 可用 `html2canvas` 或手动上传；Mobile 可先手动上传，后续再评估自动截屏。
- 重复问题合并。
- 问题处理通知。

### 4.3 Web 问题处理页

新增菜单：

- `问题反馈`

列表字段：

- 提交时间
- 来源端
- 问题类型
- 状态
- 提交用户
- 页面/模块
- 问题摘要
- 负责人

详情能力：

- 查看完整描述和客户端上下文。
- 修改状态：新问题、已确认、处理中、已解决、已关闭。
- 添加内部备注。
- 记录处理人和处理时间。

### 4.4 Android 下载入口

Web 公开页：

- 路由建议：`/mobile`
- 不要求登录，方便扫码访问。
- 展示 Android 当前版本、更新时间、包大小、SHA-256、下载按钮。
- 桌面端展示二维码；手机端展示直接下载按钮。

Web 后台入口：

- Header 或 Footer 放“移动端下载”图标入口。
- 也可以在登录页加入“手机端下载”轻入口，方便未登录用户安装。

二维码内容：

- 指向公开下载页，而不是直接指向 APK 文件。
- 示例：`https://{web-domain}/mobile`

下载地址：

- MVP 可将 APK 托管在后端或 Web 静态目录，例如 `/downloads/android/abacusflow-latest.apk`。
- 推荐发布元数据文件：`/downloads/android/latest.json`。

`latest.json` 建议格式：

```json
{
"platform": "android",
"version": "1.0.0",
"versionCode": 1,
"buildProfile": "preview",
"fileName": "abacusflow-1.0.0-preview.apk",
"downloadUrl": "/downloads/android/abacusflow-1.0.0-preview.apk",
"sha256": "TODO",
"sizeBytes": 0,
"releasedAt": "2026-05-27T00:00:00+08:00",
"releaseNotes": ["首次内部 Android 安装包"]
}
```

安装说明：

- 点击下载 APK。
- 下载完成后打开安装包。
- 如果系统提示“不允许安装未知来源应用”，引导用户给当前浏览器开启一次安装权限。
- 安装完成后打开“小算盘”并登录。

## 5. 技术方案

### 5.1 后端领域模型

建议新增“用户反馈”上下文，先从领域模型和用例出发，再决定持久化形态。保持现有分层风格：

- Core：`abacusflow-core/abacusflow-feedback`
- Usecase：`abacusflow-usecase/abacusflow-usecase-feedback`
- Portal：`abacusflow-portal/abacusflow-portal-web/.../feedback`
- Notification Gateway：隐藏邮件服务实现
- Repository：P1 需要运营列表时再加入或启用
- OpenAPI：新增反馈接口，前端通过 `@abacusflow/core` 重新生成客户端

领域聚合：

| 对象 | 类型 | 职责 |
| --- | --- | --- |
| `Feedback` | Aggregate Root | 表达一条用户反馈及其生命周期 |
| `FeedbackContext` | Value Object | 来源端、页面、客户端版本、设备信息、错误摘要 |
| `Reporter` | Value Object | 提交用户和联系方式 |
| `FeedbackCategory` | Enum | Bug、数据不对、操作不会用、功能建议、其他 |
| `FeedbackStatus` | Enum | 新问题、已确认、处理中、已解决、已关闭 |
| `FeedbackSubmitted` | Domain Event | 反馈提交后触发邮件通知 |

核心行为：

- `submit(...)`：提交反馈，初始状态为 `NEW`。
- `confirm(...)`：确认问题有效，状态变为 `CONFIRMED`。
- `assignTo(...)`：分配负责人。
- `startHandling(...)`：开始处理，状态变为 `IN_PROGRESS`。
- `resolve(...)`：标记解决，记录解决时间和说明。
- `close(...)`：关闭反馈。
- `reopen(...)`：已关闭或已解决的问题重新打开。

MVP 邮件优先建议：

- P0 可以先不做反馈管理后台，只处理 `submit(...)` 用例。
- `SubmitFeedbackUseCase` 创建 `Feedback` 聚合后发布 `FeedbackSubmitted`，由通知处理器发邮件。
- 邮件发送能力定义为端口，例如 `FeedbackNotificationGateway.sendSubmitted(feedback)`。
- 邮件收件人通过环境变量配置，例如 `ABACUSFLOW_FEEDBACK_RECIPIENTS`，不要把个人邮箱写死在代码里。
- 纯前端 `mailto:` 只作为兜底，不作为主路径；它依赖用户设备邮箱配置，且容易丢失自动采集的上下文。

P1 持久化建议：

- 只需要一个 `feedback` 持久化对象即可，映射 `Feedback` 聚合。
- `FeedbackContext`、`Reporter` 可以展开为列，也可以用 JSON 字段保存，按查询需求决定。
- 内部备注和附件不在 MVP 里先建独立表；等 P1 真正需要多条备注、附件权限、附件生命周期时再扩展为独立模型。
- 不把表结构暴露给应用层；Usecase 只依赖 `FeedbackRepository`。

### 5.2 用例与 API 设计

新增 OpenAPI tag：`feedback`

接口：

| Method | Path | 说明 |
| --- | --- | --- |
| `POST` | `/feedback` | 用户提交反馈，并触发邮件通知 |

P1 再扩展：

| Method | Path | 说明 |
| --- | --- | --- |
| `GET` | `/feedback` | 分页查询反馈 |
| `GET` | `/feedback/{id}` | 查看反馈详情 |
| `PATCH` | `/feedback/{id}` | 调用领域行为，更新状态、负责人、分类或解决说明 |
| `POST` | `/feedback/{id}/comments` | 添加内部备注 |
| `POST` | `/feedback/{id}/attachments` | 上传附件 |

权限建议：

- `feedback:create`：所有已登录用户。
- `feedback:read`：P1 管理页需要时再加入，管理员、运营、产品负责人。
- `feedback:update`：P1 管理页需要时再加入，管理员、运营、产品负责人。
- `feedback:comment`：P1 需要内部备注时再加入。

### 5.3 Web 实现

相关位置：

- 管理后台布局：`abacusflow-apps/apps/web/src/app/(admin)/layout.tsx`
- 组件库：`abacusflow-apps/packages/ui-web/src`
- API 客户端：`abacusflow-apps/packages/core`

任务：

1. 新增 Feedback Modal 组件。
2. 在后台 Header 增加反馈按钮。
3. 在 API 错误处理或 Toast 场景中支持带上下文打开反馈弹窗。
4. 新增 `/mobile` 公开下载页。
5. 增加二维码渲染能力。可用 `qrcode` npm 包，或后端生成静态二维码。
6. 增加 Android 下载元数据读取逻辑。
7. P1 新增 `/feedback` 管理页。

### 5.4 Mobile 实现

相关位置：

- 我的页：`abacusflow-apps/apps/mobile/app/(tabs)/me.tsx`
- 录入首页：`abacusflow-apps/apps/mobile/app/(tabs)/index.tsx`
- 采购入库：`abacusflow-apps/apps/mobile/app/entry/purchase.tsx`
- 销售出库：`abacusflow-apps/apps/mobile/app/entry/sale.tsx`
- 新品建档：`abacusflow-apps/apps/mobile/app/entry/product.tsx`
- 当前配置：`abacusflow-apps/apps/mobile/config/app-config.ts`

任务：

1. 新增 `/feedback` 或 modal route。
2. 在“我的”页增加“问题反馈”入口。
3. 在录入失败、扫码失败、提交失败状态增加“反馈问题”入口。
4. 自动采集 route、app version、platform、设备信息。
5. 调用统一 `/feedback` API 提交。
6. 网络失败时本地暂存反馈草稿，恢复网络后允许重试。

### 5.5 Android 构建与发布

当前 Mobile 已有 EAS preview APK 配置：

- `npm run eas:preview:android -w abacusflow-mobile`
- `abacusflow-apps/apps/mobile/eas.json` 中 preview 配置为 `android.buildType = apk`

发布流程：

1. 更新 `abacusflow-apps/apps/mobile/app.json` 的 `expo.version`。
2. 执行 Android preview build，生成 APK。
3. 下载构建产物并重命名为 `abacusflow-{version}-preview.apk`。
4. 计算 SHA-256 和文件大小。
5. 上传 APK 到静态托管目录或对象存储。
6. 更新 `latest.json`。
7. 验证 `/mobile` 下载页展示正确版本。
8. 手机扫码下载并安装验证。

部署位置建议：

- 简单方案：放到 `abacusflow-portal/abacusflow-portal-web/src/main/resources/static/downloads/android/`，随后端一起发布。
- 更推荐：放对象存储或 CDN，后端只维护 `latest.json`，避免 APK 让应用镜像变大。

## 6. 执行阶段

### P0：可用闭环

1. 实现 `Feedback` 聚合、提交用例、邮件通知端口和后端 API。
2. 更新 OpenAPI，生成 TypeScript 客户端。
3. Web 加反馈弹窗和提交能力。
4. Mobile 加反馈入口和提交能力。
5. 配置反馈收件邮箱并验证提交后能收到完整邮件。
6. Web 加 `/mobile` 下载页和二维码。
7. 发布第一版 Android preview APK，验证扫码下载和安装。

### P1：运营处理

1. 增加反馈持久化和查询能力。
2. Web 增加反馈列表和详情页。
3. 支持状态流转、负责人、内部备注。
4. 在 Web/Mobile 的 API 错误提示中支持“一键反馈此问题”。
5. 加入反馈提交成功后的确认提示。

### P2：体验增强

1. 附件上传。
2. 自动采集最近 5 条前端错误摘要。
3. 反馈重复合并和搜索。
4. Android 下载页支持历史版本、更新日志。
5. Mobile 检测新版本并提示去 `/mobile` 下载更新。

## 7. 验收标准

问题收集：

- Web 后台任意页面都能打开反馈弹窗并提交成功。
- Mobile “我的”页能提交反馈。
- Mobile 采购、销售、扫码失败时能带上下文提交反馈。
- 后端能发送邮件到 `ABACUSFLOW_FEEDBACK_RECIPIENTS` 配置的收件人。
- 邮件能看到用户、页面、客户端版本、设备信息和错误摘要。
- 用户联系方式能作为 `Reply-To`，便于直接回复。
- P1 后端能按来源端、状态、类型分页查询反馈。
- P1 无权限用户不能查看和处理反馈列表。

Android 下载：

- Web `/mobile` 页面在未登录状态可访问。
- 桌面端能看到二维码，手机扫码后进入下载页。
- 手机端点击下载按钮能下载 APK。
- 下载完成后能由 Android 系统安装界面完成安装。
- 页面展示的版本、更新时间、SHA-256 与实际 APK 一致。
- 新 APK 发布后，只更新 `latest.json` 和文件即可让下载页生效。

工程质量：

- MVP 后端测试覆盖提交反馈和邮件通知端口调用。
- P1 后端测试覆盖 Feedback command/query 基本逻辑。
- Web `npm run lint -w abacusflow-web` 通过。
- Mobile `npm run typecheck -w abacusflow-mobile` 和 `npm run lint -w abacusflow-mobile` 通过。
- Android 真机安装、登录、提交反馈跑通。

## 8. 风险与决策点

1. APK 托管方式
   - 如果跟随后端镜像发布，流程简单但镜像会变大。
   - 如果放对象存储/CDN，发布更轻，但需要额外配置存储和权限。

2. 附件上传
   - 没有对象存储前不建议阻塞 MVP。
   - 先用文字反馈和自动上下文，已经能覆盖大部分上线初期问题。

3. Android 未知来源安装
   - 浏览器下载 APK 后，用户仍需在系统设置中授权安装。
   - 下载页需要把这一步写清楚，避免用户以为下载后会自动安装。

4. 敏感信息
   - 自动采集错误上下文时必须脱敏 token、Authorization header、手机号等字段。
   - 附件上线前需要确认隐私提示和存储保留周期。

## 9. 建议排期

| 阶段 | 工作量 | 产出 |
| --- | --- | --- |
| 第 1 天 | 后端提交用例/API/邮件通知/OpenAPI | 可提交反馈并收到邮件 |
| 第 2 天 | Web 反馈弹窗 + Mobile 反馈入口 | 双端能收集问题 |
| 第 3 天 | Android 下载页 + QR + APK 发布流程 | 手机扫码下载安装 |
| 第 4 天 | 联调、真机验收、补测试 | 上线候选版本 |
| P1 | Web 反馈管理页 + 持久化查询 | 能查看和处理问题 |

## 10. 文件索引

- Web 管理后台布局：`abacusflow-apps/apps/web/src/app/(admin)/layout.tsx`
- Web 全局样式：`abacusflow-apps/apps/web/src/app/globals.css`
- Web 组件：`abacusflow-apps/packages/ui-web/src`
- Mobile 我的页：`abacusflow-apps/apps/mobile/app/(tabs)/me.tsx`
- Mobile 录入首页：`abacusflow-apps/apps/mobile/app/(tabs)/index.tsx`
- Mobile EAS 配置：`abacusflow-apps/apps/mobile/eas.json`
- Mobile Expo 配置：`abacusflow-apps/apps/mobile/app.json`
- OpenAPI：`abacusflow-portal/abacusflow-portal-web/src/main/resources/static/openapi.yaml`
- 前端生成客户端：`abacusflow-apps/packages/core`
