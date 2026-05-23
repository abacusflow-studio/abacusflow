"use client";

import { useEffect, useState } from "react";
import { App, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { initWebAuth } from "../lib/auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initWebAuth()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("[providers] initWebAuth failed:", err);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="af-loading-screen">
        <div className="af-loader-card">
          <div className="af-loader-ring" />
          <span className="af-loader-text">正在校准业务脉冲...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: antdTheme.darkAlgorithm,
          token: {
            colorPrimary: "#22c55e",
            colorSuccess: "#22c55e",
            colorWarning: "#f59e0b",
            colorError: "#fb7185",
            colorInfo: "#38bdf8",
            borderRadius: 12,
            borderRadiusLG: 16,
            fontFamily:
              "var(--font-fira-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontFamilyCode:
              "var(--font-fira-code), ui-monospace, SFMono-Regular, monospace",
            fontSize: 14,
            colorBgBase: "#050609",
            colorBgContainer: "#0d1218",
            colorBgLayout: "#050609",
            colorBgElevated: "#10171f",
            colorBorder: "rgba(148, 163, 184, 0.22)",
            colorBorderSecondary: "rgba(148, 163, 184, 0.12)",
            colorText: "#f8fafc",
            colorTextSecondary: "#b9c4d0",
            colorTextTertiary: "#7f8ea3",
            boxShadow: "0 18px 54px rgba(0, 0, 0, 0.28)",
            boxShadowSecondary: "0 12px 36px rgba(0, 0, 0, 0.24)",
          },
          components: {
            Table: {
              headerBg: "#111923",
              headerColor: "#cbd5e1",
              rowHoverBg: "rgba(34, 197, 94, 0.08)",
              borderColor: "rgba(148, 163, 184, 0.12)",
            },
            Card: {
              paddingLG: 22,
              colorBgContainer: "rgba(13, 18, 24, 0.86)",
              boxShadowTertiary: "0 20px 64px rgba(0, 0, 0, 0.26)",
            },
            Button: {
              controlHeight: 38,
              paddingInline: 18,
              borderRadius: 12,
              primaryShadow: "0 14px 32px rgba(34, 197, 94, 0.22)",
            },
            Menu: {
              itemBg: "transparent",
              subMenuItemBg: "transparent",
              itemSelectedBg: "rgba(34, 197, 94, 0.16)",
              itemSelectedColor: "#b8ffcf",
              itemHoverBg: "rgba(56, 189, 248, 0.08)",
              itemHoverColor: "#ffffff",
              itemBorderRadius: 12,
              itemMarginInline: 8,
              itemHeight: 42,
            },
            Layout: {
              headerBg: "rgba(5, 6, 9, 0.78)",
              siderBg: "rgba(8, 12, 17, 0.92)",
              bodyBg: "#050609",
            },
            Modal: {
              borderRadiusLG: 18,
              contentBg: "#0d1218",
              headerBg: "#0d1218",
            },
            Input: {
              controlHeight: 38,
              activeBorderColor: "#38bdf8",
              hoverBorderColor: "#38bdf8",
            },
            Select: {
              controlHeight: 38,
              optionSelectedBg: "rgba(34, 197, 94, 0.18)",
            },
            Form: {
              labelColor: "#cbd5e1",
            },
            Pagination: {
              itemActiveBg: "rgba(34, 197, 94, 0.16)",
            },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </>
  );
}
