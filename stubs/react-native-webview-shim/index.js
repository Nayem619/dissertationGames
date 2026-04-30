/**
 * Drop-in stub when `npm install` did not install the real react-native-webview.
 * Metro maps the module name here via metro.config.js extraNodeModules.
 * After: npx expo install react-native-webview — remove the extraNodeModules override (see metro.config.js).
 */
import React from "react";
import { Text, View } from "react-native";

export function WebView(props) {
  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: "#111",
        },
        props.style,
      ]}
    >
      <Text style={{ color: "#f88", textAlign: "center", marginBottom: 8 }}>
        Native WebView is not installed.
      </Text>
      <Text style={{ color: "#ccc", textAlign: "center" }}>
        Run: npx expo install react-native-webview
      </Text>
      <Text style={{ color: "#888", textAlign: "center", marginTop: 10, fontSize: 12 }}>
        If npm errors with EACCES: sudo chown -R $(whoami) . then npm install
      </Text>
    </View>
  );
}
