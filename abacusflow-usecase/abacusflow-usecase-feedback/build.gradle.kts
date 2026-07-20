plugins {
    id("abacusflow-base")
}

dependencies {
    implementation(project(":abacusflow-usecase:abacusflow-usecase-commons"))
    implementation(project(":abacusflow-core:abacusflow-feedback"))
    implementation(project(":abacusflow-infra:abacusflow-db"))
    implementation(project(":abacusflow-infra:abacusflow-commons"))
}
