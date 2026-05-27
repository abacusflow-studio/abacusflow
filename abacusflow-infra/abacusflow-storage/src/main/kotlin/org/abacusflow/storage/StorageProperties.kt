package org.abacusflow.storage

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "abacusflow.storage.s3")
data class StorageProperties(
    val endpoint: String,
    val bucket: String,
    val accessKeyId: String,
    val secretAccessKey: String,
    val publicUrlPrefix: String = "",
    val region: String = "us-east-1",
) {
    /** 自动从 endpoint + bucket 推导公开访问 URL */
    fun resolvedPublicUrl(): String {
        if (publicUrlPrefix.isNotBlank()) return publicUrlPrefix.trimEnd('/')
        // Supabase S3: endpoint 是 .../storage/v1/s3
        // 公开 URL 是 .../storage/v1/object/public/<bucket>
        val base =
            endpoint
                .removeSuffix("/")
                .removeSuffix("/storage/v1/s3")
                .removeSuffix("/s3")
        return "$base/storage/v1/object/public/$bucket"
    }
}
