import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Deep link `puzzle/[kind]` forwards to the shared runner with `solo` param. */
export default function PuzzleSoloAliasScreen() {
  const router = useRouter();
  const p = useLocalSearchParams();
  const raw = decodeURIComponent(String(paramFirst(p, "kind") || "").trim().toLowerCase());
  const solo = raw === "pipe" ? "pipe" : raw === "ice" ? "ice" : "flow";

  useEffect(() => {
    router.replace({ pathname: "/puzzle-ladder", params: { solo } });
  }, [router, solo]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1328" }}>
      <ActivityIndicator color="#00ffaa" />
    </View>
  );
}
