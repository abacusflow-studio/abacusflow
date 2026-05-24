"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { App, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { initWebAuth } from "../lib/auth-provider";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const LIGHT_TOKENS = {
  colorPrimary: "#16a34a",
  colorSuccess: "#16a34a",
  colorWarning: "#d97706",
  colorError: "#e11d48",
  colorInfo: "#0284c7",
  borderRadius: 12,
  borderRadiusLG: 16,
  fontFamily:
    "var(--font-fira-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyCode:
    "var(--font-fira-code), ui-monospace, SFMono-Regular, monospace",
  fontSize: 15,
  colorBgBase: "#f8fafc",
  colorBgContainer: "#ffffff",
  colorBgLayout: "#f1f5f9",
  colorBgElevated: "#ffffff",
  colorBorder: "rgba(15, 23, 42, 0.12)",
  colorBorderSecondary: "rgba(15, 23, 42, 0.08)",
  colorText: "#0f172a",
  colorTextSecondary: "#475569",
  colorTextTertiary: "#64748b",
  boxShadow: "0 18px 54px rgba(0, 0, 0, 0.08)",
  boxShadowSecondary: "0 12px 36px rgba(0, 0, 0, 0.06)",
} as const;

const DARK_TOKENS = {
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
  fontSize: 15,
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
} as const;

const LIGHT_COMPONENTS = {
  Table: {
    headerBg: "#f1f5f9",
    headerColor: "#334155",
    rowHoverBg: "rgba(22, 163, 74, 0.06)",
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  Card: {
    paddingLG: 22,
    colorBgContainer: "rgba(255, 255, 255, 0.86)",
    boxShadowTertiary: "0 20px 64px rgba(0, 0, 0, 0.06)",
  },
  Button: {
    controlHeight: 38,
    paddingInline: 18,
    borderRadius: 12,
    primaryShadow: "0 14px 32px rgba(22, 163, 74, 0.18)",
  },
  Menu: {
    itemBg: "transparent",
    subMenuItemBg: "transparent",
    itemSelectedBg: "rgba(22, 163, 74, 0.12)",
    itemSelectedColor: "#15803d",
    itemHoverBg: "rgba(2, 132, 199, 0.06)",
    itemHoverColor: "#0f172a",
    itemBorderRadius: 12,
    itemMarginInline: 8,
    itemHeight: 42,
  },
  Layout: {
    headerBg: "rgba(255, 255, 255, 0.78)",
    siderBg: "rgba(255, 255, 255, 0.92)",
    bodyBg: "#f8fafc",
  },
  Modal: {
    borderRadiusLG: 18,
    contentBg: "#ffffff",
    headerBg: "#ffffff",
  },
  Input: {
    controlHeight: 38,
    activeBorderColor: "#0284c7",
    hoverBorderColor: "#0284c7",
  },
  Select: {
    controlHeight: 38,
    optionSelectedBg: "rgba(22, 163, 74, 0.12)",
  },
  Form: {
    labelColor: "#334155",
  },
  Pagination: {
    itemActiveBg: "rgba(22, 163, 74, 0.12)",
  },
} as const;

const DARK_COMPONENTS = {
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
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = localStorage.getItem("af-theme") as ThemeMode | null;
    if (stored === "light" || stored === "dark") {
      setThemeMode(stored);
    }
    initWebAuth()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("[providers] initWebAuth failed:", err);
        setReady(true);
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem("af-theme", themeMode);
  }, [themeMode]);

  const toggleTheme = useMemo(
    () => () => setThemeMode((prev) => (prev === "light" ? "dark" : "light")),
    [],
  );

  const ctx = useMemo(
    () => ({ themeMode, toggleTheme }),
    [themeMode, toggleTheme],
  );

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

  const isDark = themeMode === "dark";

  return (
    <ThemeContext.Provider value={ctx}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: isDark
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
          token: isDark ? DARK_TOKENS : LIGHT_TOKENS,
          components: isDark ? DARK_COMPONENTS : LIGHT_COMPONENTS,
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
