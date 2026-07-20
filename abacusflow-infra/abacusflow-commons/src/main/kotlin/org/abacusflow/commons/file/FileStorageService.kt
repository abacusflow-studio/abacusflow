package org.abacusflow.commons.file

interface FileStorageService {
    fun upload(
        fileBytes: ByteArray,
        originalFilename: String,
        contentType: String,
    ): String

    fun requireOwnedReference(objectKey: String)

    fun createReadUrl(objectKey: String): String
}
