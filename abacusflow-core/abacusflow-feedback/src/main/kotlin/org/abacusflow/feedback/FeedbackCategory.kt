package org.abacusflow.feedback

enum class FeedbackCategory(
    val displayName: String,
) {
    BUG("Bug"),
    DATA_WRONG("数据不对"),
    USABILITY("操作不会用"),
    FEATURE_REQUEST("功能建议"),
    OTHER("其他"),
}
