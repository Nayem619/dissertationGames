import { useMembership } from "@/context/MembershipContext";
import {
  ENTITLEMENT_LABELS,
  FREE_LAUNCHES_PER_GAME,
  MEMBERSHIP_PRICE_GBP,
} from "@/lib/membership";
import { Nexus } from "@/constants/theme";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

/**
 * Charges one entitlement launch (counts toward free tier unless member).
 * @param {string|null|undefined} entitlementId
 * @param {{ skip?: boolean }} options — skip when entitlement does not apply (e.g. arcade hub).
 */
export function useConsumePlayEntitlement(entitlementId, options = {}) {
  const { skip = false } = options;
  const id = entitlementId ? String(entitlementId) : "";
  const { tryLaunch, ready, launchesRemaining, isMember } = useMembership();
  const router = useRouter();
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    if (skip || !id) {
      setPhase("ok");
      return undefined;
    }
    if (!ready) {
      setPhase("checking");
      return undefined;
    }
    let dead = false;
    setPhase("checking");
    (async () => {
      const r = await tryLaunch(id);
      if (dead) return;
      if (!r.ok) {
        setPhase("denied");
        router.replace({
          pathname: "/membership",
          params: { reason: id },
        });
        return;
      }
      setPhase("ok");
    })();
    return () => {
      dead = true;
    };
  }, [id, skip, ready, tryLaunch, router]);

  const lr = skip || !id ? null : launchesRemaining(id);
  return {
    entitlementId: id,
    loading: !(skip || !id) && (phase === "checking" || phase === "idle" || !ready),
    ok: phase === "ok",
    denied: phase === "denied",
    label: ENTITLEMENT_LABELS[id] || id,
    launchesRemainingDisplay: lr === Infinity || lr == null ? null : lr,
    member: isMember(),
  };
}

export function PlayEntitlementSplash({ entitlementId }) {
  const lbl = ENTITLEMENT_LABELS[entitlementId] || entitlementId;
  return (
    <View style={splashStyles.wrap}>
      <ActivityIndicator color={Nexus.green} size="large" />
      <Text style={splashStyles.t}>Checking access · {lbl}</Text>
      <Text style={splashStyles.sub}>
        {FREE_LAUNCHES_PER_GAME} free sessions per game · then {MEMBERSHIP_PRICE_GBP}/month (dissertation simulation)
      </Text>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Nexus.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  t: { color: Nexus.text, fontWeight: "700", marginTop: 16, textAlign: "center" },
  sub: { color: Nexus.textMuted, marginTop: 8, textAlign: "center", lineHeight: 20 },
});
