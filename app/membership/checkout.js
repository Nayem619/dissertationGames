/**
 * Dissertation ONLY: ephemeral card fields — values never persisted or transmitted.
 */

import { Nexus } from "@/constants/theme";
import { MEMBERSHIP_PRICE_GBP, MEMBERSHIP_INTERVAL } from "@/lib/membership";
import { useMembership } from "@/context/MembershipContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const digitsOnly = (s, max) => (String(s || "").replace(/\D/g, "").slice(0, max) || "");

export default function MembershipCheckoutDemo() {
  const router = useRouter();
  const { unlockDemoMembership } = useMembership();
  const [name, setName] = useState("");
  const [pan, setPan] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Demo checkout", "Name on card looks empty — any placeholder is fine for the prototype.");
      return;
    }
    if (pan.length < 12) {
      Alert.alert("Demo checkout", "Use at least twelve digits — this is discarded immediately after simulate.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(exp)) {
      Alert.alert("Demo checkout", 'Expiry format MM/YY (e.g. 12/28).');
      return;
    }
    if (cvv.length < 3) {
      Alert.alert("Demo checkout", "Three or four-digit CVV is enough for the UX mock.");
      return;
    }
    setBusy(true);
    /** Ephemeral vars — drop references after timeout for GC clarity */
    const _purge = `${name}|${pan}|${exp}|${cvv}`;
    void _purge;

    /** Fake network delay */
    await new Promise((res) => setTimeout(res, 900));

    try {
      await unlockDemoMembership();
    } finally {
      setBusy(false);
      setName("");
      setPan("");
      setExp("");
      setCvv("");
    }

    Alert.alert(
      "Payment simulated",
      "No card data was stored. Your demo Play Hub Plus unlock runs unlimited launches for thirty days locally.",
      [
        {
          text: "Got it",
          onPress: () => router.replace("/home"),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.h}>Fake checkout</Text>
        <Text style={styles.warn}>
          For your dissertation reviewers: inputs live only in React state. Clearing this screen resets them — nothing touches AsyncStorage besides the membership unlocked flag created after Simulate pay.
        </Text>
        <Text style={styles.price}>
          Play Hub Plus · {MEMBERSHIP_PRICE_GBP} · {MEMBERSHIP_INTERVAL}
        </Text>

        <Text style={styles.label}>Name on card</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. A. Reviewer"
          placeholderTextColor={Nexus.textMuted}
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Card number (fake)</Text>
        <TextInput
          style={styles.input}
          placeholder="4532 0099 •••• ••••"
          placeholderTextColor={Nexus.textMuted}
          keyboardType="number-pad"
          value={pan}
          onChangeText={(t) => setPan(digitsOnly(t, 19))}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.label}>Expiry (MM/YY)</Text>
            <TextInput
              style={styles.input}
              placeholder="12/29"
              placeholderTextColor={Nexus.textMuted}
              keyboardType="number-pad"
              maxLength={5}
              value={exp}
              onChangeText={(raw) => {
                const d = String(raw || "").replace(/\D/g, "").slice(0, 4);
                if (d.length <= 2) setExp(d);
                else setExp(`${d.slice(0, 2)}/${d.slice(2)}`);
              }}
            />
          </View>
          <View style={{ width: 100 }}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder="···"
              placeholderTextColor={Nexus.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={cvv}
              onChangeText={(t) => setCvv(digitsOnly(t, 4))}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.pay, busy && styles.payOff]}
          disabled={busy}
          onPress={onSubmit}
        >
          <Text style={styles.payT}>{busy ? "Simulating…" : "Simulate payment"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancel} disabled={busy} onPress={() => router.back()}>
          <Text style={styles.cancelT}>Cancel · nothing saved</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  scroll: { padding: 22, paddingBottom: 40 },
  h: {
    fontSize: 26,
    fontWeight: "900",
    color: Nexus.magenta,
    marginBottom: 10,
  },
  warn: {
    fontSize: 13,
    lineHeight: 20,
    color: Nexus.textMuted,
    marginBottom: 14,
    backgroundColor: "rgba(255,0,136,0.08)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,0,85,0.35)",
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: Nexus.green,
    marginBottom: 22,
    textAlign: "center",
  },
  label: { color: Nexus.textMuted, fontWeight: "700", marginBottom: 8, marginTop: 6 },
  input: {
    backgroundColor: Nexus.bgCard,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    borderRadius: 10,
    padding: 14,
    color: Nexus.text,
    fontSize: 16,
    marginBottom: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pay: {
    marginTop: 18,
    backgroundColor: Nexus.cyan,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  payOff: { opacity: 0.55 },
  payT: { fontWeight: "900", color: Nexus.darkText, fontSize: 17 },
  cancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelT: { color: Nexus.textMuted, fontWeight: "700" },
});
