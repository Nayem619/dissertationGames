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
  /** Repo has ./expo-router/entry.js shim for mistaken `node expo-router/entry` hosting; Metro must stay on nm. */
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

module.exports = config;
