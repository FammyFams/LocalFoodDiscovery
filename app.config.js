export default {
  expo: {
    name: "mesoHungy",
    slug: "food-finder",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#212529",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.foodtinder.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "We need your location to show restaurants near you.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#212529",
      },
      package: "com.mesohungry.app",
      versionCode: 1,
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_KEY,
        },
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "We need your location to show restaurants near you.",
        },
      ],
      "expo-font",
    ],
    extra: {
      eas: {
        projectId: "3f6d7769-4ad3-4e3f-b85a-828e80bad39b",
      },
    },
    owner: "m4zheng",
  },
};
