plugins {
    id("abacusflow-base")
}

dependencies {
    implementation(project(":abacusflow-infra:abacusflow-commons"))
    implementation(project(":abacusflow-infra:abacusflow-db"))
    implementation(project(":abacusflow-usecase:abacusflow-usecase-commons"))
    implementation(project(":abacusflow-core:abacusflow-tenant"))
    implementation(project(":abacusflow-core:abacusflow-user"))
}
