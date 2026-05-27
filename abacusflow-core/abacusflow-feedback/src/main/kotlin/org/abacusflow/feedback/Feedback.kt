package org.abacusflow.feedback

import jakarta.persistence.AttributeOverride
import jakarta.persistence.AttributeOverrides
import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Embedded
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.OrderColumn
import jakarta.persistence.Table
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

@Entity
@Table(name = "feedback")
class Feedback(
    category: FeedbackCategory,
    source: FeedbackSource,
    title: String?,
    description: String,
    context: FeedbackContext,
    reporter: Reporter,
    reporterUserId: Long?,
) : AbstractAggregateRoot<Feedback>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @field:NotNull
    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    var category: FeedbackCategory = category
        private set

    @field:NotNull
    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    var status: FeedbackStatus = FeedbackStatus.NEW
        private set

    @field:NotNull
    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    var source: FeedbackSource = source
        private set

    @field:Size(max = 120)
    var title: String? = title
        private set

    @field:NotBlank
    @Column(columnDefinition = "TEXT")
    @field:Size(max = 3000)
    var description: String = description
        private set

    @Embedded
    @AttributeOverrides(
        AttributeOverride(name = "pagePath", column = Column(name = "page_path", length = 512)),
        AttributeOverride(name = "appVersion", column = Column(name = "app_version", length = 64)),
        AttributeOverride(name = "platform", column = Column(name = "platform", length = 64)),
        AttributeOverride(name = "deviceInfo", column = Column(name = "device_info", columnDefinition = "TEXT")),
        AttributeOverride(name = "errorContext", column = Column(name = "error_context", columnDefinition = "TEXT")),
    )
    var context: FeedbackContext = context
        private set

    @Embedded
    @AttributeOverrides(
        AttributeOverride(name = "contact", column = Column(name = "contact", length = 120)),
        AttributeOverride(name = "allowContact", column = Column(name = "allow_contact")),
    )
    var reporter: Reporter = reporter
        private set

    var reporterUserId: Long? = reporterUserId
        private set

    var assigneeUserId: Long? = null
        private set

    @Column(columnDefinition = "TEXT")
    var resolutionNote: String? = null
        private set

    var resolvedAt: Instant? = null
        private set

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "feedback_image", joinColumns = [JoinColumn(name = "feedback_id")])
    @Column(name = "image_url", length = 1024)
    @OrderColumn(name = "sort_order")
    var imageUrls: MutableList<String> = mutableListOf()
        private set

    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    @UpdateTimestamp
    var updatedAt: Instant = Instant.now()
        private set

    fun setImageUrls(urls: List<String>) {
        require(urls.size <= 9) { "最多上传9张图片" }
        imageUrls = urls.toMutableList()
    }

    fun confirm() {
        require(status == FeedbackStatus.NEW) { "只有新问题可以确认" }
        status = FeedbackStatus.CONFIRMED
        updatedAt = Instant.now()
    }

    fun assignTo(userId: Long) {
        assigneeUserId = userId
        updatedAt = Instant.now()
    }

    fun startHandling() {
        require(status == FeedbackStatus.NEW || status == FeedbackStatus.CONFIRMED) {
            "只有新问题或已确认的问题可以开始处理"
        }
        status = FeedbackStatus.IN_PROGRESS
        updatedAt = Instant.now()
    }

    fun resolve(note: String?) {
        require(status != FeedbackStatus.RESOLVED && status != FeedbackStatus.CLOSED) {
            "已解决或已关闭的问题不能再标记解决"
        }
        status = FeedbackStatus.RESOLVED
        resolutionNote = note
        resolvedAt = Instant.now()
        updatedAt = Instant.now()
    }

    fun close() {
        require(status != FeedbackStatus.CLOSED) { "已关闭的问题不能再关闭" }
        status = FeedbackStatus.CLOSED
        updatedAt = Instant.now()
    }

    fun reopen() {
        require(status == FeedbackStatus.RESOLVED || status == FeedbackStatus.CLOSED) {
            "只有已解决或已关闭的问题可以重新打开"
        }
        status = FeedbackStatus.NEW
        resolutionNote = null
        resolvedAt = null
        updatedAt = Instant.now()
    }
}
