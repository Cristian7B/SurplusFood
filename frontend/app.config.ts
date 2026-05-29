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
    ],
    extra: {
      router: { origin: false },
      eas: { projectId: "your-eas-project-id" },
    },
  },
};

