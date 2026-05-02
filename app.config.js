/**
 * Merges app.json so EXPO_PUBLIC_* are also available via Constants.expoConfig.extra
 * at runtime (helps EAS / CI when env is injected during `expo prebuild` / export).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require("./app.json");

module.exports = () => ({
  expo: {
    ...appJson.expo,
    android: {
      ...(appJson.expo.android || {}),
      /** Vendor arcade WebViews use http:// localhost/LAN during dev (HTTPS on Render in prod). */
      usesCleartextTraffic: true,
    },
    extra: {
      ...(appJson.expo.extra || {}),
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || "",
      openaiBaseUrl: process.env.EXPO_PUBLIC_OPENAI_BASE_URL || "",
      openaiModel: process.env.EXPO_PUBLIC_OPENAI_MODEL || "",
      triviaGenerateUrl: process.env.EXPO_PUBLIC_TRIVIA_GENERATE_URL || "",
      vendorChessUrl: process.env.EXPO_PUBLIC_VENDOR_CHESS_URL || "",
      vendorLudoUrl: process.env.EXPO_PUBLIC_VENDOR_LUDO_URL || "",
    },
  },
});
