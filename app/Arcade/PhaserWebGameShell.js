import { Ionicons } from "@expo/vector-icons";
import { Nexus } from "@/constants/theme";
import { useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
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

// #region agent log
const __DEB =
  typeof fetch !== "undefined"
    ? (payload) =>
        fetch("http://127.0.0.1:7865/ingest/0ecd33e7-af68-46c6-bbe3-d95a5d8f6748", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "1c5831",
          },
          body: JSON.stringify({ sessionId: "1c5831", timestamp: Date.now(), ...payload }),
        }).catch(() => {})
    : () => {};
// #endregion

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
  const [runtimeError, setRuntimeError] = useState("");
  const [wvKey, setWvKey] = useState(0);

  useEffect(() => {
    setRuntimeError("");
    setLoading(true);
  }, [html]);

  const source = useMemo(() => {
    const wrapped = injectBridge(html ?? "");
    return baseUrl ? { html: wrapped, baseUrl } : { html: wrapped };
  }, [html, baseUrl]);

  const handleMsg = (e) => {
    const raw = e?.nativeEvent?.data;
    if (!raw) return;
    let o = null;
    try {
      o = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return;
    }
    if (!o || typeof o !== "object") return;
    if (o.type === "ARCADE_RUNTIME") {
      // #region agent log
      __DEB({
        location: "PhaserWebGameShell.js:onMessage",
        message: String(o.subtype || ""),
        hypothesisId: "arcade-phaser-load",
        data: { detail: String(o.detail || "").slice(0, 280) },
      });
      // #endregion
      setRuntimeError(String(o.detail || "Game failed to start").trim());
      setLoading(false);
      return;
    }
    if (o.type === "ARCADE_SURFACE_OK") {
      __DEB({
        location: "PhaserWebGameShell.js:surface_ok",
        message: String(o.surface || ""),
        hypothesisId: "arcade-phaser-ready",
      });
      setLoading(false);
      return;
    }
    if (onBridgeMessage) onBridgeMessage(o);
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
      {!!runtimeError && (
        <View style={styles.errRow}>
          <Text style={styles.errText}>{runtimeError}</Text>
          <TouchableOpacity
            accessibilityLabel="Retry loading game"
            onPress={() => {
              setRuntimeError("");
              setLoading(true);
              setWvKey((k) => k + 1);
            }}
            style={styles.retryBtn}
          >
            <Text style={styles.retryT}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.wrap}>
        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Nexus.green} />
            <Text style={styles.ot}>Loading game…</Text>
            <Text style={styles.cdnOverlayHint}>
              First open loads Phaser from the internet · stay online
            </Text>
          </View>
        ) : null}
        <WebView
          key={wvKey}
          source={source}
          style={styles.wv}
          {...COMMON_WEBVIEW_PROPS}
          onLoadEnd={() => setLoading(false)}
          onError={(ev) => {
            const d = ev?.nativeEvent?.description;
            setLoading(false);
            setRuntimeError((prev) =>
              prev || String(d || (Platform.OS === "web" ? "Web view error" : "Load error"))
            );
          }}
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
  cdnOverlayHint: {
    marginTop: 10,
    paddingHorizontal: 24,
    fontSize: 11,
    color: Nexus.textMuted,
    textAlign: "center",
    lineHeight: 15,
  },
  errRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#3d2a06",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Nexus.borderDim,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  errText: { flex: 1, minWidth: 200, fontSize: 13, color: "#ffe8a8", lineHeight: 18 },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#0d9666",
    borderRadius: 8,
  },
  retryT: { color: Nexus.bg, fontWeight: "700", fontSize: 13 },
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
