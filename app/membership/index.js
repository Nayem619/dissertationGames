import { Nexus } from "@/constants/theme";
import {
  ENTITLEMENT_LABELS,
  FREE_LAUNCHES_PER_GAME,
  MEMBERSHIP_INTERVAL,
  MEMBERSHIP_PRICE_GBP,
} from "@/lib/membership";
import { useMembership } from "@/context/MembershipContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

export default function MembershipScreen() {
  const router = useRouter();
  const p = useLocalSearchParams();
  const reasonId = paramFirst(p, "reason");
  const { isMember, demoExpiresAt, priceDisplay, intervalLabel } = useMembership();

  const friendly = reasonId ? ENTITLEMENT_LABELS[String(reasonId)] || reasonId : null;

  const expiryLine = useMemo(() => {
    if (!demoExpiresAt || !isMember()) return null;
    try {
      return new Date(demoExpiresAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return null;
    }
  }, [demoExpiresAt, isMember]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Play Hub membership</Text>
        <Text style={styles.sub}>
          Play Hub keeps a demo free tier: each game unlocks{" "}
          <Text style={styles.bold}>{FREE_LAUNCHES_PER_GAME}</Text> free sessions (solo or online rooms),
          tracked on-device. Afterwards you need membership —{" "}
          <Text style={styles.bold}>
            {priceDisplay} {intervalLabel}
          </Text>{" "}
          (simulated billing only).
        </Text>

        {friendly ? (
          <View style={styles.callout}>
            <Text style={styles.coT}>You hit the limit for</Text>
            <Text style={styles.coBold}>{friendly}</Text>
          </View>
        ) : null}

        {isMember() ? (
          <View style={[styles.banner, styles.bannerOn]}>
            <Text style={styles.bannerT}>Unlock active (demo simulation)</Text>
            {expiryLine ? (
              <Text style={styles.bannerSub}>Ends around {expiryLine}</Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.banner, styles.bannerOff]}>
            <Text style={styles.bannerT}>Free tier</Text>
            <Text style={styles.bannerSub}>
              Playing still counts launches per category until you run the fake checkout flow.
            </Text>
          </View>
        )}

        <Text style={styles.listH}>Included (demo wording)</Text>
        <Text style={styles.item}>∞ Retries across all arcade + board games once unlocked</Text>
        <Text style={styles.item}>∞ Online chess / tic-tac-toe room sessions after unlock</Text>
        <Text style={styles.small}>
          Production apps would integrate Stripe / Apple IAP; nothing here transmits card data beyond the ephemeral form on the next screen.
        </Text>

        {!isMember() ? (
          <TouchableOpacity style={styles.primary} onPress={() => router.push("/membership/checkout")}>
            <Text style={styles.primaryT}>Continue to fake checkout</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.secondary, { opacity: 0.75 }]}
            onPress={() => router.push("/membership/checkout")}
          >
            <Text style={styles.secondaryT}>Re-run simulation (already unlocked)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backT}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  scroll: { padding: 22, paddingBottom: 44 },
  h1: { fontSize: 26, fontWeight: "900", color: Nexus.green, marginBottom: 12 },
  sub: {
    color: Nexus.textMuted,
    lineHeight: 22,
    marginBottom: 18,
    fontSize: 15,
  },
  bold: { color: Nexus.text, fontWeight: "800" },
  callout: {
    borderWidth: 1,
    borderColor: Nexus.cyan,
    backgroundColor: "rgba(0,212,255,0.09)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  coT: { color: Nexus.textMuted, fontSize: 13, marginBottom: 6 },
  coBold: { color: Nexus.cyan, fontWeight: "900", fontSize: 18 },
  banner: { borderRadius: 12, padding: 14, marginBottom: 18 },
  bannerOn: { backgroundColor: "rgba(0,255,136,0.14)", borderWidth: 1, borderColor: Nexus.borderDim },
  bannerOff: {
    backgroundColor: Nexus.bgCard,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
  },
  bannerT: { color: Nexus.text, fontWeight: "800", fontSize: 16 },
  bannerSub: { color: Nexus.textMuted, marginTop: 6, lineHeight: 20 },
  listH: { color: Nexus.text, fontWeight: "800", marginBottom: 8 },
  item: { color: Nexus.textMuted, marginBottom: 8, paddingLeft: 4, lineHeight: 20 },
  small: {
    fontSize: 12,
    color: Nexus.textMuted,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  primary: {
    backgroundColor: Nexus.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryT: { color: Nexus.darkText, fontWeight: "900", fontSize: 16 },
  secondary: {
    borderWidth: 2,
    borderColor: Nexus.cyan,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryT: { color: Nexus.cyan, fontWeight: "800" },
  back: { paddingVertical: 14, alignItems: "center" },
  backT: { color: Nexus.textMuted, fontWeight: "700" },
});
