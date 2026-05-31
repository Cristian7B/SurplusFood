export default {
  expo: {
    name: "SurplusFood",
    slug: "surplusfood",
    version: "1.0.0",
    scheme: "foodbridge",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F7F4EE",
    },
    ios: {
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F7F4EE",
      },
      package: "com.surplusfood.app",
      googleServicesFile: "./google-services.json",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "@rnmapbox/maps",
      "expo-location",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#5DBF95",
          defaultChannel: "default",
        },
      ],
    ],
    extra: {
      router: { origin: false },
      eas: { projectId: process.env.EAS_PROJECT_ID ?? "cb81ca31-1e0f-41ce-a1e1-33030beccb0e" },
    },
  },
};

