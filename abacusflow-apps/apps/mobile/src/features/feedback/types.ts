/** 反馈分类选项 */
export interface FeedbackCategoryOption {
  label: string;
  value: string;
}

/** 反馈表单数据 */
export interface FeedbackFormData {
  category: string;
  description: string;
  images?: string;
  title?: string;
  contact?: string;
}
