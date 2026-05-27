"use client";

import React, { useEffect, useState } from "react";
import { Button, Card, Space, Typography, Spin } from "antd";
import {
  AndroidOutlined,
  MobileOutlined,
} from "@ant-design/icons";
import { QRCode } from "antd";

const { Title, Text, Paragraph } = Typography;

interface AndroidReleaseInfo {
  version: string;
  downloadUrl: string;
  sha256?: string;
  sizeBytes?: number;
  releasedAt?: string;
  releaseNotes?: string[];
}

export default function MobileDownloadPage() {
  const [releaseInfo, setReleaseInfo] = useState<AndroidReleaseInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [downloadPageUrl, setDownloadPageUrl] = useState("");

  useEffect(() => {
    setDownloadPageUrl(window.location.href);

    const fetchReleaseInfo = async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
        const res = await fetch(`${baseUrl}/downloads/android/latest.json`);
        if (res.ok) {
          const data = await res.json();
          setReleaseInfo(data);
        }
      } catch {
        // Use env vars as fallback
        const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL;
        const apkVersion = process.env.NEXT_PUBLIC_ANDROID_APK_VERSION;
        if (apkUrl) {
          setReleaseInfo({
            version: apkVersion || "1.0.0",
            downloadUrl: apkUrl,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReleaseInfo();
  }, []);

  const handleDownload = () => {
    if (releaseInfo?.downloadUrl) {
      const url = releaseInfo.downloadUrl.startsWith("http")
        ? releaseInfo.downloadUrl
        : `${window.location.origin}${releaseInfo.downloadUrl}`;
      window.open(url, "_blank");
    }
  };

  const isMobile = () => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: 24,
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        styles={{ body: { padding: 32, textAlign: "center" } }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <MobileOutlined
              style={{ fontSize: 48, color: "#667eea", marginBottom: 16 }}
            />
            <Title level={2} style={{ marginBottom: 8 }}>
              小算盘 Mobile
            </Title>
            <Text type="secondary">
              手机扫码或点击下方按钮下载 Android 安装包
            </Text>
          </div>

          {loading ? (
            <Spin tip="加载版本信息..." />
          ) : releaseInfo ? (
            <>
              <Card
                size="small"
                style={{
                  background: "#f5f5f5",
                  borderRadius: 8,
                }}
              >
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: "100%", textAlign: "left" }}
                >
                  <Text>
                    <strong>版本：</strong>
                    {releaseInfo.version}
                  </Text>
                  {releaseInfo.releasedAt && (
                    <Text>
                      <strong>更新时间：</strong>
                      {new Date(releaseInfo.releasedAt).toLocaleDateString(
                        "zh-CN",
                      )}
                    </Text>
                  )}
                  {releaseInfo.sizeBytes && releaseInfo.sizeBytes > 0 && (
                    <Text>
                      <strong>包大小：</strong>
                      {(releaseInfo.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    </Text>
                  )}
                  {releaseInfo.sha256 && (
                    <Text
                      style={{
                        fontSize: 12,
                        wordBreak: "break-all",
                        color: "#999",
                      }}
                    >
                      <strong>SHA-256：</strong>
                      {releaseInfo.sha256}
                    </Text>
                  )}
                </Space>
              </Card>

              {!isMobile() && (
                <div>
                  <Text
                    strong
                    style={{
                      display: "block",
                      marginBottom: 12,
                      color: "#666",
                    }}
                  >
                    手机扫码下载
                  </Text>
                  <QRCode
                    value={downloadPageUrl}
                    size={180}
                    style={{ margin: "0 auto" }}
                  />
                </div>
              )}

              <Button
                type="primary"
                size="large"
                icon={<AndroidOutlined />}
                block
                onClick={handleDownload}
                style={{
                  height: 48,
                  fontSize: 16,
                  borderRadius: 8,
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  border: "none",
                }}
              >
                下载 Android 安装包
              </Button>

              <Card
                size="small"
                style={{
                  background: "#fffbe6",
                  borderRadius: 8,
                  textAlign: "left",
                }}
              >
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  安装说明
                </Text>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    color: "#666",
                    fontSize: 13,
                  }}
                >
                  <li>点击上方按钮下载 APK 文件</li>
                  <li>下载完成后，点击通知栏中的下载完成提示</li>
                  <li>
                    如果系统提示{" "}
                    <Text strong>&ldquo;不允许安装未知来源应用&rdquo;</Text>
                    ，请在设置中允许当前浏览器安装应用
                  </li>
                  <li>安装完成后打开 &ldquo;小算盘&rdquo; 并登录</li>
                </ol>
              </Card>
            </>
          ) : (
            <div>
              <Text type="secondary">暂无可用的 Android 安装包</Text>
              <Paragraph
                type="secondary"
                style={{ fontSize: 12, marginTop: 8 }}
              >
                请联系管理员获取安装包
              </Paragraph>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}
