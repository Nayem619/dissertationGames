import { Ionicons } from "@expo/vector-icons";
import { Nexus } from "@/constants/theme";
import { getVendorArcadeOrigin } from "@/lib/vendorArcade";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { COMMON_WEBVIEW_PROPS } from "./PhaserWebGameShell";

function isLocalhostUrl(url) {
  const u = String(url || "").toLowerCase();
  return u.includes("localhost") || u.includes("127.0.0.1");
}

function LocalhostDevHint() {
  if (Platform.OS === "web") return null;
  return (
    <View style={styles.hintBox}>
      <Text style={styles.hintTitle}>localhost on a real phone will fail</Text>
      <Text style={styles.hintBody}>
        <Text style={styles.hintBold}>localhost</Text> is the phone, not your computer — typical error: could not connect (-1004).
      </Text>
      <Text style={styles.hintBody}>
        In <Text style={styles.hintMono}>.env</Text> set{" "}
        <Text style={styles.hintMono}>EXPO_PUBLIC_VENDOR_CHESS_URL</Text> and{" "}
        <Text style={styles.hintMono}>EXPO_PUBLIC_VENDOR_LUDO_URL</Text> to your PC/Mac Wi‑Fi IP, for example{" "}
        <Text style={styles.hintMono}>http://192.168.0.234:3000</Text> — use the same host as Expo (see{" "}
        <Text style={styles.hintMono}>exp://…</Text>), port where chessu/Ludo CRA runs (often <Text style={styles.hintMono}>3000</Text>). Then restart{" "}
        <Text style={styles.hintMono}>npx expo start -c</Text>.
      </Text>
      <Text style={styles.hintBody}>
        <Text style={styles.hintBold}>Android emulator:</Text> use <Text style={styles.hintMono}>http://10.0.2.2:3000</Text>.
      </Text>
      <Text style={styles.hintBody}>
        <Text style={styles.hintBold}>iOS Simulator</Text> on the same Mac may use <Text style={styles.hintMono}>http://localhost:3000</Text>.
      </Text>
      <Text style={styles.hintBody}>
        <Text style={styles.hintBold}>Render</Text> is optional later: deploy vendor apps and set the same vars to public <Text style={styles.hintBold}>https://</Text> URLs.
      </Text>
    </View>
  );
}

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
  const [wvKey, setWvKey] = useState(0);
  const [loadErr, setLoadErr] = useState("");

  const showLocalhostHint = Platform.OS !== "web" && isLocalhostUrl(uri);

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
      {showLocalhostHint && !loadErr ? <LocalhostDevHint /> : null}
      <View style={styles.wrap}>
        {loading && !loadErr ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={Nexus.green} />
            <Text style={styles.ot}>Loading hosted game…</Text>
          </View>
        ) : null}
        {!!loadErr ? (
          <ScrollView
            style={styles.errBackdrop}
            contentContainerStyle={styles.errInner}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.errTitle}>Could not load page</Text>
            <Text style={styles.errSub}>{loadErr}</Text>
            <LocalhostDevHint />
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setLoadErr("");
                setWvKey((k) => k + 1);
              }}
              accessibilityLabel="Retry"
            >
              <Text style={styles.retryT}>Retry</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}
        <WebView
          key={wvKey}
          source={{ uri }}
          style={[styles.wv, loadErr ? styles.wvHidden : null]}
          {...COMMON_WEBVIEW_PROPS}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          startInLoadingState
          originWhitelist={["*", "http://*", "https://*", "file://*", "blob:"]}
          onLoadStart={() => {
            setLoadErr("");
            setLoading(true);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            const d = e?.nativeEvent?.description;
            setLoadErr(String(d || "Network error").trim());
          }}
          onHttpError={(e) => {
            setLoading(false);
            const status = e?.nativeEvent?.statusCode;
            const failedUrl = String(e?.nativeEvent?.url || uri || "");
            if (status && status >= 400) {
              let msg = `HTTP ${status}`;
              if (
                status === 404 &&
                failedUrl.includes("onrender.com") &&
                kind === "ludo"
              ) {
                msg =
                  "HTTP 404 — no Render service at this URL yet. Deploy the dissertationgames-ludo Web Service from render.yaml (Docker: vendor/mern-ludo) or fix EXPO_PUBLIC_VENDOR_LUDO_URL.";
              }
              setLoadErr((prev) => prev || msg);
            }
          }}
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
  hintBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(13,150,102,0.12)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Nexus.borderDim,
  },
  hintTitle: { color: Nexus.cyan, fontWeight: "700", fontSize: 12, marginBottom: 6 },
  hintBody: { color: Nexus.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 8 },
  hintBold: { color: Nexus.text, fontWeight: "700" },
  hintMono: { color: Nexus.green, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 10 },
  wrap: { flex: 1, position: "relative" },
  wv: { flex: 1, backgroundColor: "#0a0f14" },
  wvHidden: { opacity: 0, height: 0, flex: 0 },
  errBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    backgroundColor: Nexus.bg,
  },
  errInner: { padding: 16, paddingBottom: 32 },
  errTitle: { color: Nexus.text, fontWeight: "800", fontSize: 17, marginBottom: 8 },
  errSub: { color: Nexus.textMuted, fontSize: 13, marginBottom: 16 },
  retryBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: Nexus.green,
    borderRadius: 8,
  },
  retryT: { color: Nexus.bg, fontWeight: "700", fontSize: 15 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(10,15,22,0.35)",
    zIndex: 2,
  },
  ot: { marginTop: 12, color: Nexus.textMuted, fontSize: 14 },
});
