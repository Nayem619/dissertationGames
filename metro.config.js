const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Real package path (Expo: npx expo install react-native-webview)
const webviewPkg = path.join(
  projectRoot,
  "node_modules",
  "react-native-webview",
  "package.json"
);
const useWebviewShim = !fs.existsSync(webviewPkg);

/**
 * If react-native-webview is missing from node_modules, map the name to a local
 * JS stub so Metro can always bundle. (resolveRequest is unreliable across Expo versions.)
 * After installing the real module, delete node_modules and reinstall if Metro still
 * picks the stub — the real package must exist at node_modules/react-native-webview.
 */
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  tslib: require.resolve("tslib"),
  /** expo-router resolves from node_modules — do not shadow with a repo ./expo-router/ file */
  ...(fs.existsSync(path.join(projectRoot, "node_modules", "expo-router"))
    ? { "expo-router": path.join(projectRoot, "node_modules", "expo-router") }
    : {}),
  ...(useWebviewShim
    ? {
        "react-native-webview": path.join(
          projectRoot,
          "stubs",
          "react-native-webview-shim"
        ),
      }
    : {}),
};

// Use Metro’s Node crawlers instead of Watchman. On macOS, Watchman often hits
// "Operation not permitted" for projects on Desktop, or when Metro was run with
// `sudo` (don’t use sudo for Expo). Slightly slower file watching, but stable.
config.resolver.useWatchman = false;

/** Arcade Phaser bundled as a static asset (see assets/phaser/*.bundle). */
config.resolver.assetExts =
  [...(config.resolver.assetExts ?? []), "bundle"].filter((e, i, a) => a.indexOf(e) === i);

/** Always resolve app entry via node_modules (never a rogue ./expo-router/ shim). */
const expoRouterEntry = path.join(projectRoot, "node_modules", "expo-router", "entry.js");
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-router/entry" && fs.existsSync(expoRouterEntry)) {
    return { type: "sourceFile", filePath: expoRouterEntry };
  }
  if (typeof defaultResolveRequest === "function") {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
