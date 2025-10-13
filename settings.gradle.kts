plugins {
}

rootProject.name = "abacusflow"

// ------------------------------------
// 基础设施层 infra
// ------------------------------------
val infraModules =
    listOf(
        "abacusflow-db",
        "abacusflow-commons",
    )
infraModules.forEach {
    include(
        "abacusflow-infra:$it",
    )
    findProject(":abacusflow-infra:$it")?.name = it
}

// ------------------------------------
// 领域核心层 core
// ------------------------------------
val coreModules =
    listOf(
        "abacusflow-user",
        "abacusflow-product",
        "abacusflow-inventory",
        "abacusflow-transaction",
        "abacusflow-partner",
        "abacusflow-depot",
    )
coreModules.forEach {
    include(
        "abacusflow-core:$it",
    )
    findProject(":abacusflow-core:$it")?.name = it
}

// ------------------------------------
// 服务层 usecase
// ------------------------------------
val usecaseModules =
    listOf(
        "abacusflow-usecase-commons",
        "abacusflow-usecase-inventory",
        "abacusflow-usecase-partner",
        "abacusflow-usecase-product",
        "abacusflow-usecase-transaction",
        "abacusflow-usecase-user",
        "abacusflow-usecase-depot",
    )
usecaseModules.forEach {
    include(
        "abacusflow-usecase:$it",
    )
    findProject(":abacusflow-usecase:$it")?.name = it
}

// ------------------------------------
// 接入层 portal
// ------------------------------------
val portalModules =
    listOf(
        "abacusflow-portal-web",
    )
portalModules.forEach {
    include(
        "abacusflow-portal:$it",
    )
    findProject(":abacusflow-portal:$it")?.name = it
}

// ------------------------------------
// 辅助工具层 tools
// ------------------------------------
val toolsModules =
    listOf(
        "abacusflow-monitor",
    )
toolsModules.forEach {
    include(
        "abacusflow-tools:$it",
    )
    findProject(":abacusflow-tools:$it")?.name = it
}

// ------------------------------------
// 应用服务启动层（聚合主程序）
// ------------------------------------
include("abacusflow-server")

// ------------------------------------
// 页面 app
// ------------------------------------
include("abacusflow-apps")

//val appModules =
//    listOf(
//        "abacusflow-webapp",
//        "abacusflow-miniprogram",
//        "abacusflow-nativeapp",
//    )
//appModules.forEach {
//    include(
//        "abacusflow-app:$it",
//    )
//    findProject(":abacusflow-app:$it")?.name = it
//}