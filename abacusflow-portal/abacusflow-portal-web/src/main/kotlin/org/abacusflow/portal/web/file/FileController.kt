package org.abacusflow.portal.web.file

import org.abacusflow.commons.file.FileStorageService
import org.abacusflow.portal.web.api.FilesApi
import org.abacusflow.portal.web.model.FileUploadResultVO
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
class FileController(
    private val fileStorageService: FileStorageService,
) : FilesApi {
    @PreAuthorize("isAuthenticated()")
    override fun uploadFile(file: MultipartFile): ResponseEntity<FileUploadResultVO> {
        val url =
            fileStorageService.upload(
                fileBytes = file.bytes,
                originalFilename = file.originalFilename ?: "unknown",
                contentType = file.contentType ?: "application/octet-stream",
            )
        return ResponseEntity.ok(
            FileUploadResultVO(
                url = url,
                filename = file.originalFilename ?: "unknown",
            ),
        )
    }
}
