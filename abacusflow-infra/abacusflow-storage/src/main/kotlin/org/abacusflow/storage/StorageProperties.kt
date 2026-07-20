package org.abacusflow.storage

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "abacusflow.storage.s3")
data class StorageProperties(
    val endpoint: String,
    val bucket: String,
    val accessKeyId: String,
    val secretAccessKey: String,
    val region: String = "us-east-1",
)
