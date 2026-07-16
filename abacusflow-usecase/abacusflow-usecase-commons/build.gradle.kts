plugins {
    id("abacusflow-base")
    id("abacusflow-jooq-codegen")
}

dependencies {
    api(project(":abacusflow-infra:abacusflow-commons"))
    api(project(":abacusflow-infra:abacusflow-db"))
    api(libs.spring.boot.starter.jooq)
    api(libs.spring.security.config)
}
