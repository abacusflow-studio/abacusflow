package org.abacusflow.storage

import org.abacusflow.commons.file.FileStorageService
import org.springframework.stereotype.Service
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.util.UUID

@Service
class S3FileStorageService(
    private val s3Client: S3Client,
    private val properties: StorageProperties,
) : FileStorageService {
    override fun upload(
        fileBytes: ByteArray,
        originalFilename: String,
        contentType: String,
    ): String {
        val extension = originalFilename.substringAfterLast('.', "")
        val key =
            if (extension.isNotEmpty()) {
                "feedback/${UUID.randomUUID()}.$extension"
            } else {
                "feedback/${UUID.randomUUID()}"
            }

        val putRequest =
            PutObjectRequest.builder()
                .bucket(properties.bucket)
                .key(key)
                .contentType(contentType)
                .build()

        s3Client.putObject(putRequest, RequestBody.fromBytes(fileBytes))

        return "${properties.resolvedPublicUrl()}/$key"
    }
}
