import type { ConfigContext, ExpoConfig } from "expo/config";
import appVersion from "../../app-version.json";

type AndroidConfig = NonNullable<ExpoConfig["android"]> & {
  edgeToEdgeEnabled: boolean;
  predictiveBackGestureEnabled: boolean;
};

const productVersion =
  process.env.EXPO_PUBLIC_APP_VERSION ??
  process.env.APP_VERSION ??
  appVersion.version;

function parseVersionCode(value: string | undefined): number {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "abacusflow-mobile",
  slug: "abacusflow-mobile",
  version: productVersion,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "abacusflow",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    ...config.ios,
    bundleIdentifier: "cn.abacusflow.mobile",
    supportsTablet: true,
    buildNumber: process.env.IOS_BUILD_NUMBER ?? "1",
  },
  android: {
    ...config.android,
    package: "cn.abacusflow.mobile",
    versionCode: parseVersionCode(process.env.ANDROID_VERSION_CODE),
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  } as AndroidConfig,
  web: {
    ...config.web,
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission: "允许小算盘使用相机扫描条码和二维码",
      },
    ],
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-secure-store",
    "expo-font",
    "expo-web-browser",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    appVersion: productVersion,
    router: {},
    eas: {
      projectId: "fd1a2653-5d1e-4d9d-ac45-bc9a3e6e41e2",
    },
  },
});
