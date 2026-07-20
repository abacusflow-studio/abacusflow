package org.abacusflow.storage

import org.abacusflow.commons.file.FileStorageService
import org.abacusflow.commons.tenant.TenantContextHolder
import org.springframework.stereotype.Service
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest
import java.net.URI
import java.time.Duration
import java.util.UUID

@Service
class S3FileStorageService(
    private val s3Client: S3Client,
    private val s3Presigner: S3Presigner,
    private val properties: StorageProperties,
) : FileStorageService {
    override fun upload(
        fileBytes: ByteArray,
        originalFilename: String,
        contentType: String,
    ): String {
        val tenantId = TenantContextHolder.currentTenantId()
        val extension = originalFilename.substringAfterLast('.', "")
        val key =
            if (extension.isNotEmpty()) {
                "tenants/$tenantId/feedback/${UUID.randomUUID()}.$extension"
            } else {
                "tenants/$tenantId/feedback/${UUID.randomUUID()}"
            }

        val putRequest =
            PutObjectRequest.builder()
                .bucket(properties.bucket)
                .key(key)
                .contentType(contentType)
                .build()

        s3Client.putObject(putRequest, RequestBody.fromBytes(fileBytes))

        return key
    }

    override fun requireOwnedReference(objectKey: String) {
        val tenantId = TenantContextHolder.currentTenantId()
        require(objectKey.startsWith("tenants/$tenantId/")) {
            "File does not belong to current tenant"
        }
    }

    override fun createReadUrl(objectKey: String): String {
        val ownedObjectKey = normalizeLegacyReference(objectKey)
        requireOwnedReference(ownedObjectKey)
        val getRequest =
            GetObjectRequest.builder()
                .bucket(properties.bucket)
                .key(ownedObjectKey)
                .build()
        return s3Presigner.presignGetObject(
            GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(getRequest)
                .build(),
        ).url().toString()
    }

    /**
     * Existing feedback records may contain the former public URL. Convert only
     * reads to an object key; new writes and client-submitted references must use keys.
     */
    private fun normalizeLegacyReference(reference: String): String {
        if (reference.startsWith("tenants/")) {
            return reference
        }

        val path =
            runCatching { URI(reference).path }.getOrNull()
                ?: return reference
        val tenantKeyIndex = path.indexOf("tenants/")
        return if (tenantKeyIndex >= 0) path.substring(tenantKeyIndex) else reference
    }
}
