import { Ionicons } from "@expo/vector-icons";
import { Nexus } from "@/constants/theme";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const BRIDGE_INLINE =
  "(function(){try{window.NexusPost=function(o){var s=(typeof o==='string')?o:JSON.stringify(o||{});" +
  "if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){" +
  "window.ReactNativeWebView.postMessage(s);}};}catch(_){}})();";

function injectBridge(html) {
  const tag = "<script>" + BRIDGE_INLINE + "<\\/script>";
  if (html.includes("<head>")) return html.replace("<head>", "<head>" + tag);
  return tag + html;
}

export const COMMON_WEBVIEW_PROPS = {
  javaScriptEnabled: true,
  domStorageEnabled: true,
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  originWhitelist: ["*", "https://*", "http://*"],
  mixedContentMode: "always",
  setSupportMultipleWindows: false,
  allowsFullscreenVideo: true,
};

/**
 * Inline Phaser / HTML WebView — loading overlay, RN bridge (NexusPost), optional leaderboard shortcut.
 */
export function PhaserInlineWebView({
  html,
  baseUrl,
  onBack,
  statusTint,
  onBridgeMessage,
  onLeaderboard,
}) {
  const insets = useSafeAreaInsets();
  const tint = statusTint ?? Nexus.green;
  const [loading, setLoading] = useState(true);

  const source = useMemo(() => {
    const wrapped = injectBridge(html ?? "");
    return baseUrl ? { html: wrapped, baseUrl } : { html: wrapped };
  }, [html, baseUrl]);

  const handleMsg = (e) => {
    const raw = e?.nativeEvent?.data;
    if (!raw || !onBridgeMessage) return;
    try {
      const o = typeof raw === "string" ? JSON.parse(raw) : raw;
      onBridgeMessage(o);
    } catch {
      /* non-JSON */
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + 4, paddingLeft: 4, paddingRight: 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.hit} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={32} color={tint} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {onLeaderboard ? (
          <TouchableOpacity
            style={[styles.hit, { marginRight: 4 }]}
            accessibilityLabel="Leaderboard"
            onPress={onLeaderboard}
          >
            <Ionicons name="trophy-outline" size={26} color={tint} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.cdnHint}>Loads Phaser via CDN · needs network</Text>
      <View style={styles.wrap}>
        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Nexus.green} />
            <Text style={styles.ot}>Loading game…</Text>
          </View>
        ) : null}
        <WebView
          source={source}
          style={styles.wv}
          {...COMMON_WEBVIEW_PROPS}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
          onMessage={handleMsg}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Nexus.bg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Nexus.bgElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Nexus.borderDim,
  },
  hit: { padding: 6 },
  cdnHint: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    fontSize: 11,
    color: Nexus.textMuted,
    backgroundColor: Nexus.bgElevated,
  },
  wrap: { flex: 1, position: "relative" },
  wv: { flex: 1, backgroundColor: "#0a0f14" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(10,15,22,0.55)",
    zIndex: 2,
  },
  ot: { marginTop: 12, color: Nexus.textMuted, fontSize: 14 },
});
