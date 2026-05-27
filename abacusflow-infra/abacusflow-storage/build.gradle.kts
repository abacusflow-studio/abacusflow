plugins {
    id("abacusflow-base")
}

dependencies {
    api(project(":abacusflow-infra:abacusflow-commons"))
    api(libs.aws.s3)
}
