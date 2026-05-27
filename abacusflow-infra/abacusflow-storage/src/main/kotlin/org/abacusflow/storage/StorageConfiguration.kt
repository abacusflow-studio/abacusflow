package org.abacusflow.storage

import org.abacusflow.commons.file.FileStorageService
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI

@Configuration
@EnableConfigurationProperties(StorageProperties::class)
class StorageConfiguration {
    @Bean
    fun s3Client(properties: StorageProperties): S3Client {
        val credentials = AwsBasicCredentials.create(properties.accessKeyId, properties.secretAccessKey)
        return S3Client.builder()
            .endpointOverride(URI.create(properties.endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .region(Region.of(properties.region))
            .forcePathStyle(true)
            .build()
    }

    @Bean
    fun fileStorageService(
        s3Client: S3Client,
        properties: StorageProperties,
    ): FileStorageService {
        return S3FileStorageService(s3Client, properties)
    }
}
