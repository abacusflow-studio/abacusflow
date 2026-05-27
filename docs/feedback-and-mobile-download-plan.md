# Web/Mobile 问题收集与 Android 下载执行计划

## 1. 目标

AbacusFlow 刚上线，最重要的是让真实用户能用最短路径反馈问题，同时让 Android 用户能从 Web 页面扫码下载 Mobile APK。

本计划覆盖两个目标：

1. **问题收集**
   - Web 和 Mobile 都提供明显、低成本的“问题反馈”入口。
   - 用户不用知道 GitHub、飞书、邮箱或开发流程，也能提交问题。
   - 后台能看到、分派、跟踪、关闭问题。

2. **Android 下载**
   - Web 上提供一个公开的 Mobile 下载页。
   - 用户手机扫码后能打开下载链接并安装 Android APK。
   - `.github` 能自动或半自动更新 APK 产物，避免每次手工找链接。

## 2. 产品原则

1. **入口要直观**
   - Web：全局固定“反馈”按钮，后台每个页面都能看到。
   - Mobile：`我的`页提供“问题反馈”，关键失败态也能直接进入反馈。

2. **表单要短**
   - 默认只需要：类型、描述、联系方式可选。
   - 自动带上：用户、端、版本、页面路径、时间、设备信息。

3. **反馈不是工单系统第一版**
   - 第一版先把问题收上来。
   - 不做复杂 SLA、客服聊天、附件云盘、消息推送。

4. **下载链接要稳定**
   - Web 页面不应依赖临时手工复制的 EAS build URL。
   - 优先使用稳定的 APK URL，再由页面生成二维码。

## 3. 当前代码基础

### 3.1 GitHub Actions

当前 `.github` 配置：

- `.github/workflows/release.yml`
  - tag 发布时构建后端 jar。
  - 构建并推送后端 Docker image 到 GHCR。
  - 创建 GitHub Release。

- `.github/workflows/cd.yml`
  - GitHub Release 发布后，通过 SSH 部署后端 Docker。

- `.github/workflows/pr-ci.yml`
  - 当前只跑后端 build。

结论：

- 目前没有 Web/Mobile CI。
- 目前没有 EAS Android APK 自动构建。
- 目前没有把 APK 产物发布到稳定下载位置。

### 3.2 Web

Web 结构：

- Next.js 15，生产环境 `output: "export"`。
- 管理页在 `apps/web/src/app/(admin)`。
- 全局后台壳在 `apps/web/src/app/(admin)/layout.tsx`。
- UI 基于 Ant Design。

适合落点：

- 在后台壳加全局“反馈”按钮。
- 新增公开下载页：`apps/web/src/app/mobile/page.tsx` 或 `apps/web/src/app/download/android/page.tsx`。
- 下载页使用 Ant Design 的 QRCode 或轻量二维码库。

### 3.3 Mobile

Mobile 结构：

- Expo Router。
- Tab 已调整为：`录入`、`流水`、`查询`、`我的`。
- `我的`页在 `apps/mobile/app/(tabs)/me.tsx`。
- EAS 已配置 preview Android APK：

```json
{
  "preview": {
    "distribution": "internal",
    "android": {
      "buildType": "apk"
    }
  }
}
```

适合落点：

- `我的`页新增“问题反馈”入口。
- 新增页面：`apps/mobile/app/feedback/index.tsx`。
- 在常见错误态中加入“反馈此问题”按钮。

## 4. 推荐总体架构

### 4.1 后端作为反馈数据源

问题反馈不要直接发 GitHub Issue。原因：

- 用户不应暴露在 GitHub 流程里。
- 反馈中可能包含联系方式、业务数据、设备信息。
- 后续要在后台做状态流转、筛选、统计。

推荐新增后端能力：

- OpenAPI tag：`feedback`
- 核心领域：`feedback`
- 数据表：`feedback_report`
- Web 管理页面：`/feedback`
- Mobile/Web 通过 `@abacusflow/core` 生成客户端调用。

### 4.2 Android 下载链接作为“发布元数据”

推荐把 Android 下载链接视为发布元数据，而不是写死在页面里。

MVP 推荐方案：

- `.github/workflows/mobile-preview.yml` 通过 EAS 构建 preview APK。
- workflow 把 APK 发布到一个稳定位置。
- Web 下载页读取稳定 URL 并生成二维码。

稳定 URL 可选：

1. **GitHub Release asset**
   - 优点：实现快，和现有 GitHub Release 流程接近。
   - 缺点：如果仓库是私有，普通用户可能无法下载。
   - 适合：仓库公开或早期内部测试。

2. **对象存储，例如 Cloudflare R2 / S3 / GCS**
   - 优点：真正面向用户，URL 稳定，可控。
   - 缺点：需要配置 bucket、凭证、权限。
   - 适合：正式给真实用户下载。

建议：

- 先用 GitHub Release asset 或 EAS internal link 跑通。
- 如果用户不是团队内部成员，尽快切到对象存储。

## 5. 反馈功能设计

### 5.1 反馈类型

第一版类型：

| 类型 | 用途 |
| --- | --- |
| bug | 功能不可用、报错、数据不对 |
| ux | 不好用、找不到、操作麻烦 |
| data | 商品、库存、订单等业务数据疑问 |
| idea | 功能建议 |
| other | 其他 |

严重程度：

| 严重程度 | 含义 |
| --- | --- |
| blocker | 完全无法继续使用 |
| high | 影响核心流程，但可绕过 |
| normal | 普通问题 |
| low | 小建议或体验问题 |

### 5.2 表单字段

用户填写：

- `type`：反馈类型，必填。
- `severity`：严重程度，默认 `normal`。
- `title`：一句话标题，可选；为空时后端从描述截取。
- `description`：问题描述，必填。
- `contact`：联系方式，可选。
- `allowContact`：是否允许联系，默认 true。

系统自动收集：

- `source`：`web` / `mobile`。
- `pagePath`：当前路径或路由。
- `appVersion`：Web/Mobile 版本。
- `platform`：浏览器、Android、iOS、Web。
- `deviceInfo`：浏览器 UA 或手机系统版本/设备型号。
- `userId`：当前登录用户 ID，如可取。
- `createdAt`。

暂不收集：

- 密码、token、完整请求头。
- 大段业务数据。
- 自动截图。

### 5.3 状态流转

后端状态：

| 状态 | 含义 |
| --- | --- |
| new | 新提交 |
| triaged | 已确认 |
| in_progress | 处理中 |
| fixed | 已修复 |
| closed | 已关闭 |
| duplicate | 重复问题 |
| wont_fix | 暂不处理 |

第一版 Web 后台只需要：

- 列表
- 详情
- 更新状态
- 备注

## 6. 后端实施计划

### 6.1 OpenAPI

在 `abacusflow-portal/abacusflow-portal-web/src/main/resources/static/openapi.yaml` 增加：

- tag：`feedback`
- `POST /feedback-reports`
- `GET /feedback-reports`
- `GET /feedback-reports/{id}`
- `PATCH /feedback-reports/{id}/status`

请求模型：

```yaml
CreateFeedbackReportInput:
  type: object
  required: [type, description, source]
  properties:
    type:
      type: string
      enum: [bug, ux, data, idea, other]
    severity:
      type: string
      enum: [blocker, high, normal, low]
      default: normal
    title:
      type: string
      maxLength: 120
    description:
      type: string
      minLength: 4
      maxLength: 3000
    source:
      type: string
      enum: [web, mobile]
    contact:
      type: string
      maxLength: 120
    allowContact:
      type: boolean
    pagePath:
      type: string
      maxLength: 512
    appVersion:
      type: string
      maxLength: 64
    platform:
      type: string
      maxLength: 64
    deviceInfo:
      type: object
      additionalProperties: true
```

### 6.2 数据模型

新增表 `feedback_report`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint | 主键 |
| type | varchar | 反馈类型 |
| severity | varchar | 严重程度 |
| status | varchar | 状态 |
| title | varchar(120) | 标题 |
| description | text | 描述 |
| source | varchar | web/mobile |
| contact | varchar(120) | 联系方式 |
| allow_contact | boolean | 是否允许联系 |
| page_path | varchar(512) | 页面路径 |
| app_version | varchar(64) | 版本 |
| platform | varchar(64) | 平台 |
| device_info | jsonb/text | 设备信息 |
| reporter_user_id | bigint nullable | 提交人 |
| assignee_user_id | bigint nullable | 负责人 |
| admin_note | text nullable | 内部备注 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |
| closed_at | timestamp nullable | 关闭时间 |

索引：

- `(status, created_at desc)`
- `(source, created_at desc)`
- `(reporter_user_id, created_at desc)`
- `(severity, status)`

### 6.3 权限

MVP：

- 登录用户可 `POST /feedback-reports`。
- 管理员可查看列表、详情、改状态。

登录问题反馈：

- 第一版可以在登录页提供邮箱/二维码备用入口。
- 第二版再加匿名 `POST /public/feedback-reports`，并做限流、验证码或 honeypot。

### 6.4 通知

MVP：

- 后台列表查看。

增强：

- 新反馈提交后发邮件/飞书/Discord/Webhook。
- 严重程度为 `blocker/high` 时提醒。

## 7. Web 实施计划

### 7.1 全局反馈入口

位置：

- `apps/web/src/app/(admin)/layout.tsx`

形式：

- Header 右侧加“反馈”按钮，或右下角固定浮动按钮。
- 点击打开 `FeedbackModal`。

组件：

- `apps/web/src/components/feedback-button.tsx`
- `apps/web/src/components/feedback-modal.tsx`

表单设计：

- 类型 segmented/radio。
- 严重程度 select。
- 描述 textarea。
- 联系方式 input。
- 自动展示当前页面路径和版本，不让用户填写。

成功反馈：

- 提交中禁用按钮。
- 成功后显示“已收到，我们会优先查看”。
- 失败时保留已输入内容。

### 7.2 反馈管理页

新增：

- `apps/web/src/app/(admin)/feedback/page.tsx`

功能：

- 表格：类型、严重程度、状态、来源、标题、提交人、时间。
- 筛选：状态、来源、严重程度。
- 详情 Drawer：描述、页面路径、设备信息、联系方式。
- 操作：改状态、写内部备注。

导航：

- `NAV_ITEMS` 增加“问题反馈”。
- `ROUTE_META` 增加 `/feedback`。

### 7.3 Android 下载页

新增公开页面：

- `apps/web/src/app/mobile/page.tsx`

页面内容：

- 标题：小算盘 Mobile
- Android 下载按钮
- 二维码
- 当前版本/更新时间
- 安装说明
- 安全提示：首次安装 APK 需要允许浏览器安装未知来源应用。

下载链接来源：

MVP：

- `NEXT_PUBLIC_ANDROID_APK_URL`
- `NEXT_PUBLIC_ANDROID_APK_VERSION`

更稳方案：

- Web 页面 fetch 后端公开接口：`GET /app-releases/android/latest`
- 后端返回：

```json
{
  "version": "1.0.0",
  "downloadUrl": "https://...",
  "buildNumber": "42",
  "publishedAt": "2026-05-27T00:00:00Z",
  "sha256": "..."
}
```

建议路线：

- 第一版用稳定 release asset URL 写到 Web env。
- 第二版做后端 `app_release` 元数据接口。

## 8. Mobile 实施计划

### 8.1 入口

位置：

- `apps/mobile/app/(tabs)/me.tsx`

新增菜单项：

- `问题反馈`

路由：

- `apps/mobile/app/feedback/index.tsx`

### 8.2 表单

字段：

- 类型
- 严重程度
- 描述
- 联系方式

自动收集：

- app version：`CURRENT_VERSION` 或 Expo Constants。
- platform：`ios/android`。
- route：当前路由。
- device：系统版本、设备型号，能拿多少拿多少。

交互：

- 提交按钮固定底部。
- 提交中禁用。
- 成功后 haptic feedback 一次。
- 网络失败时提示“稍后重试”，保留内容。

### 8.3 错误态快捷反馈

优先接入位置：

- 登录失败页。
- API 请求失败的空状态。
- 扫码失败/相机权限失败页。

做法：

- “反馈此问题”按钮带入默认描述，例如：
  - 页面路径
  - 错误消息
  - 操作上下文

## 9. `.github` 配置更新计划

### 9.1 PR CI 扩展

更新：

- `.github/workflows/pr-ci.yml`

新增 jobs：

1. `backend-build`
   - 保留现有后端 build。

2. `web-build`
   - `cd abacusflow-apps`
   - `npm ci`
   - `npm run lint -w abacusflow-web`
   - `npm run build -w abacusflow-web`

3. `mobile-check`
   - `cd abacusflow-apps`
   - `npm ci`
   - `npm run lint -w abacusflow-mobile`
   - `npm run typecheck -w abacusflow-mobile`

注意：

- Mobile 不在 PR 里跑 EAS build，成本太高。
- OpenAPI 变更会通过 Web build 的 `generate:core` 提前暴露客户端类型问题。

### 9.2 Android Preview APK workflow

新增：

- `.github/workflows/mobile-preview.yml`

触发：

- `workflow_dispatch`
- 可选：push tag `mobile-v*`

需要 GitHub secrets：

- `EXPO_TOKEN`
- 如果上传对象存储，还需要：
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - 或对应 S3/GCS secrets。

核心步骤：

```yaml
name: Mobile Preview

on:
  workflow_dispatch:

jobs:
  android-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: abacusflow-apps/package-lock.json

      - run: npm ci
        working-directory: abacusflow-apps

      - run: npm run typecheck -w abacusflow-mobile
        working-directory: abacusflow-apps

      - run: npx eas build --platform android --profile preview --non-interactive --wait --json --environment preview
        working-directory: abacusflow-apps/apps/mobile
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

产物发布策略：

1. **GitHub Release asset MVP**
   - 使用固定 prerelease tag：`mobile-preview`
   - 上传/覆盖 `abacusflow-mobile-preview.apk`
   - Web 下载 URL 指向这个固定 asset。

2. **对象存储正式方案**
   - 下载 EAS artifact。
   - 上传到 `mobile/android/abacusflow-latest.apk`。
   - 同时上传 `mobile/android/latest.json`。
   - Web 读取 `latest.json` 或直接使用稳定 APK URL。

### 9.3 Release workflow 调整

当前 `release.yml` 只发布后端 Docker。建议短期不要把 mobile preview 合进去。

原因：

- 后端 release 是 tag 驱动。
- Mobile preview 是面向测试用户，可能更高频。
- APK 构建耗时长，失败也不应阻塞后端 Docker release。

后续正式发布可加：

- `mobile-production.yml`
- 触发 tag：`mobile-v*`
- Android production 产 AAB 并 submit 到 Google Play。

## 10. 环境变量与配置

### 10.1 Web

新增：

```env
NEXT_PUBLIC_ANDROID_APK_URL=https://...
NEXT_PUBLIC_ANDROID_APK_VERSION=1.0.0
```

如果改为后端发布元数据接口：

```env
NEXT_PUBLIC_MOBILE_RELEASE_MANIFEST_URL=https://abacusflow-server.../app-releases/android/latest
```

### 10.2 Mobile

继续使用：

```env
EXPO_PUBLIC_API_BASE_URL=https://abacusflow-server-latest.onrender.com
EXPO_PUBLIC_APP_VERSION=1.0.0
```

EAS 注意：

- EAS Build 要在 EAS 服务器侧配置 `EXPO_PUBLIC_*`。
- 不要误以为 GitHub Actions env 会自动进入 EAS 远程构建。
- CI 里使用 `eas build --environment preview`，并在 EAS dashboard/CLI 里维护 preview 环境变量。

## 11. 分阶段实施

### Phase 0：确认发布策略

负责人需要确认：

- 仓库是否公开。
- Android APK 是否可以放 GitHub Release。
- 是否已有 R2/S3/GCS 这类公开对象存储。
- Web 下载页是否允许未登录访问。

建议默认：

- Web 下载页未登录可访问。
- APK 先用 GitHub Release asset。
- 如果 GitHub 下载对用户不友好，再切对象存储。

### Phase 1：反馈 MVP

后端：

- 新增 feedback OpenAPI。
- 新增 feedback 表和 CRUD usecase。
- 支持创建、列表、详情、改状态。

Web：

- 全局反馈按钮 + Modal。
- `/feedback` 管理页。

Mobile：

- `我的`页新增问题反馈。
- 新增反馈提交页。

验证：

- Web 提交后后台可见。
- Mobile 提交后后台可见。
- 失败时表单内容不丢。

### Phase 2：Android 下载页

Web：

- 新增 `/mobile` 下载页。
- 显示 QR 和下载按钮。

GitHub：

- 新增 `mobile-preview.yml`。
- 构建 APK。
- 发布到稳定 URL。

验证：

- 手机扫 Web 页面二维码能打开下载 URL。
- Android 能安装 APK。
- APK 打开后指向正确后端和 Auth0 配置。

### Phase 3：反馈增强

增强项：

- 上传截图。
- 自动带错误上下文。
- Webhook 通知。
- 后台状态统计。
- 从反馈一键创建 GitHub Issue。

### Phase 4：正式分发

增强项：

- Google Play Internal Testing。
- APK/AAB 版本号自动递增。
- Web 下载页根据平台展示 Android/iOS。

## 12. 验收标准

### 12.1 问题反馈

- Web 后台任意页面 1 次点击可打开反馈。
- Mobile `我的`页 1 次点击进入反馈。
- 必填只有类型和描述。
- 提交成功后用户看到明确成功状态。
- 管理员能在 Web 看到反馈列表和详情。
- 管理员能修改状态。
- 自动记录来源、版本、路径、用户。

### 12.2 Android 下载

- Web `/mobile` 页面未登录可访问。
- 页面有下载按钮和二维码。
- Android 手机扫码后能拿到 APK 下载链接。
- APK 可安装并打开。
- APK 中 API/Auth0 环境正确。
- GitHub workflow 能重新生成并发布 APK。

### 12.3 CI/CD

- PR 会检查 backend、web、mobile type/lint/build 中的关键项。
- mobile preview build 不阻塞后端 release。
- APK 发布 URL 稳定，不需要每次手工改 Web 代码。

## 13. 不建议第一版做的事

- 不要直接让用户提交 GitHub Issue。
- 不要第一版做复杂客服会话。
- 不要强制上传截图。
- 不要把 APK 链接写死成某一次 EAS build 的临时链接。
- 不要把 mobile preview EAS build 塞进现有后端 Docker release job。

## 14. 参考资料

- Expo Internal Distribution: https://docs.expo.dev/build/internal-distribution/
- Expo Android APK builds: https://docs.expo.dev/build-reference/apk/
- Expo EAS environment variables: https://docs.expo.dev/eas/environment-variables/
- Expo EAS env usage: https://docs.expo.dev/eas/environment-variables/usage/
