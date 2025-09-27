// app.config.ts
import { ConfigContext, ExpoConfig } from "@expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "my-expo-app",
  slug: "my-expo-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myexpoapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAP_API_KEY || "",
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "このアプリでは、地図上で現在位置を表示するために位置情報を使用します。",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAP_API_KEY || "",
      },
    },
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
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
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow jNavi to use your location.",
      },
    ],
    "expo-maps",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    GOOGLE_MAP_API_KEY: process.env.GOOGLE_MAP_API_KEY,
  },
});
