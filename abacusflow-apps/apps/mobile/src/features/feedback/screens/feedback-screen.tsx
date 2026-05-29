import { Alert, Platform } from "react-native";
import { usePathname } from "expo-router";
import Constants from "expo-constants";
import { FormScreen } from "@components/layout/form-screen";
import { feedbackApi, getAuthClient } from "@abacusflow/core";
import { CURRENT_VERSION, getConfig } from "@abacusflow/config";

const CATEGORY_OPTIONS = [
  { label: "Bug", value: "BUG" },
  { label: "数据不对", value: "DATA_WRONG" },
  { label: "操作不会用", value: "USABILITY" },
  { label: "功能建议", value: "FEATURE_REQUEST" },
  { label: "其他", value: "OTHER" },
];

async function uploadImages(uris: string[]): Promise<string[]> {
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

export default function FeedbackScreen() {
  const pathname = usePathname();

  return (
    <FormScreen
      title="问题反馈"
      fields={[
        {
          key: "category",
          label: "问题类型",
          type: "select",
          options: CATEGORY_OPTIONS,
          required: true,
          value: "BUG",
        },
        {
          key: "description",
          label: "问题描述",
          type: "textarea",
          placeholder: "请描述您遇到的问题，越详细越好",
          required: true,
        },
        {
          key: "images",
          label: "截图（可选）",
          type: "image",
          maxImages: 9,
        },
        {
          key: "title",
          label: "标题（可选）",
          type: "text",
          placeholder: "一句话概括问题",
        },
        {
          key: "contact",
          label: "联系方式（可选）",
          type: "text",
          placeholder: "邮箱或手机号",
        },
      ]}
      onSubmit={async (values) => {
        const deviceInfo = JSON.stringify({
          platform: Platform.OS,
          version: Platform.Version,
          deviceName: Constants.deviceName,
          modelName: Constants.expoConfig?.name,
        });

        // Upload images if any were selected
        let imageUrls: string[] = [];
        const imagesRaw = values.images as string | undefined;
        if (imagesRaw) {
          try {
            const uris: string[] = JSON.parse(imagesRaw);
            if (uris.length > 0) {
              imageUrls = await uploadImages(uris);
            }
          } catch {
            // If parsing fails, skip images
          }
        }

        await feedbackApi.createFeedback({
          createFeedbackInput: {
            category: values.category as any,
            source: "MOBILE",
            title: values.title ? String(values.title) : undefined,
            description: String(values.description),
            contact: values.contact ? String(values.contact) : undefined,
            pagePath: pathname,
            appVersion: CURRENT_VERSION,
            platform: Platform.OS,
            deviceInfo,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          },
        });

        Alert.alert("提交成功", "感谢您的反馈，我们会尽快处理");
      }}
      submitLabel="提交反馈"
    />
  );
}
