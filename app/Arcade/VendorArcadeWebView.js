import { Ionicons } from "@expo/vector-icons";
import { Nexus } from "@/constants/theme";
import { getVendorArcadeOrigin } from "@/lib/vendorArcade";
import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { COMMON_WEBVIEW_PROPS } from "./PhaserWebGameShell";

/**
 * Full-screen WebView for vendor multiplayer games (chessu, mern-ludo).
 * Set EXPO_PUBLIC_VENDOR_CHESS_URL / EXPO_PUBLIC_VENDOR_LUDO_URL (or app.config extra) to your dev machine or Render HTTPS URL.
 */
export function VendorArcadeWebView({ kind, title, onBack, statusTint, onLeaderboard }) {
  const insets = useSafeAreaInsets();
  const tint = statusTint ?? Nexus.green;
  const origin = useMemo(() => getVendorArcadeOrigin(kind), [kind]);
  const uri = origin;
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + 4, paddingLeft: 4, paddingRight: 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.hit} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={32} color={tint} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text style={styles.barTitle} numberOfLines={1}>
            {title || (kind === "chess" ? "Chess" : "Ludo")}
          </Text>
          <Text style={styles.barSub} numberOfLines={2}>
            {uri}
          </Text>
        </View>
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
      {Platform.OS === "android" &&
      (origin.includes("localhost") || origin.includes("127.0.0.1")) ? (
        <Text style={styles.emulatorTip}>
          Emulator: use http://10.0.2.2:3000 in EXPO_PUBLIC_VENDOR_* URLs (not localhost).
        </Text>
      ) : null}
      <View style={styles.wrap}>
        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Nexus.green} />
            <Text style={styles.ot}>Loading hosted game…</Text>
          </View>
        ) : null}
        <WebView
          source={{ uri }}
          style={styles.wv}
          {...COMMON_WEBVIEW_PROPS}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          startInLoadingState
          originWhitelist={["*", "http://*", "https://*", "file://*", "blob:"]}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
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
  barTitle: { color: Nexus.text, fontWeight: "800", fontSize: 15 },
  barSub: { color: Nexus.textMuted, fontSize: 10, marginTop: 2 },
  emulatorTip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: Nexus.cyan,
    fontSize: 11,
    backgroundColor: "rgba(10,15,22,0.9)",
  },
  wrap: { flex: 1, position: "relative" },
  wv: { flex: 1, backgroundColor: "#0a0f14" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(10,15,22,0.35)",
    zIndex: 2,
  },
  ot: { marginTop: 12, color: Nexus.textMuted, fontSize: 14 },
});
