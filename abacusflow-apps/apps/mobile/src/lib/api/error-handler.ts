import { showToast } from "@hooks/use-toast";

/**
 * 包装 API 调用，自动处理错误并显示 Toast
 * @param apiFn - API 调用函数
 * @param errorMessage - 自定义错误消息前缀
 * @returns API 调用结果
 */
export async function withErrorHandling<T>(
  apiFn: () => Promise<T>,
  errorMessage?: string,
): Promise<T> {
  try {
    return await apiFn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "请求失败";
    const displayMessage = errorMessage ? `${errorMessage}: ${msg}` : msg;
    showToast(displayMessage, "error");
    throw error; // 重新抛出，让调用方可以处理
  }
}

/**
 * 包装 API 调用，静默处理错误（不抛出异常）
 * @param apiFn - API 调用函数
 * @param fallback - 出错时的返回值
 * @param errorMessage - 自定义错误消息前缀
 * @returns API 调用结果或 fallback
 */
export async function withSilentErrorHandling<T>(
  apiFn: () => Promise<T>,
  fallback: T,
  errorMessage?: string,
): Promise<T> {
  try {
    return await apiFn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "请求失败";
    const displayMessage = errorMessage ? `${errorMessage}: ${msg}` : msg;
    showToast(displayMessage, "error");
    return fallback;
  }
}
