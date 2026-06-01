import { Platform } from "react-native";
import Constants from "expo-constants";
import { feedbackApi, getAuthClient } from "@abacusflow/core";
import { CURRENT_VERSION, getConfig } from "@abacusflow/config";

/** 上传图片到服务器 */
export async function uploadImages(uris: string[]): Promise<string[]> {
  if (uris.length === 0) return [];

  const auth = getAuthClient();
  const token = await auth.getAccessToken();
  const baseUrl = getConfig().apiBaseUrl.replace(/\/+$/, "");

  const urls: string[] = [];
  for (const uri of uris) {
    const formData = new FormData();
    const filename = uri.split("/").pop() || "image.jpg";
    formData.append("file", {
      uri,
      name: filename,
      type: "image/jpeg",
    } as unknown as Blob);

    const res = await fetch(`${baseUrl}/files/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`图片上传失败: ${res.status}`);
    }

    const data = await res.json();
    urls.push(data.url);
  }
  return urls;
}

/** 提交反馈 */
export async function submitFeedback(input: {
  category: string;
  description: string;
  title?: string;
  contact?: string;
  imageUrls?: string[];
  pagePath: string;
}): Promise<void> {
  const deviceInfo = JSON.stringify({
    platform: Platform.OS,
    version: Platform.Version,
    deviceName: Constants.deviceName,
    modelName: Constants.expoConfig?.name,
  });

  await feedbackApi.createFeedback({
    createFeedbackInput: {
      category: input.category as any,
      source: "MOBILE",
      title: input.title || undefined,
      description: input.description,
      contact: input.contact || undefined,
      pagePath: input.pagePath,
      appVersion: CURRENT_VERSION,
      platform: Platform.OS,
      deviceInfo,
      imageUrls: input.imageUrls?.length ? input.imageUrls : undefined,
    },
  });
}
