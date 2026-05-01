import { Nexus } from "@/constants/theme";
import { ensureAbVariant, exportMyStudyDataJSON } from "@/lib/dissertation";
import { publishAsyncChallenge, CHALLENGE_KINDS } from "@/lib/challenges";
import { getPublicProfile } from "@/lib/socialProfile";
import { useAppPrefs } from "@/context/AppPrefs";
import { useMembership } from "@/context/MembershipContext";
import { FREE_LAUNCHES_PER_GAME } from "@/lib/membership";
import { updateProfile } from "firebase/auth";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { auth } from "@/constants/firebase";
import { shareChallengeLinks } from "@/lib/publicWebUrl";

export default function SettingsScreen() {
  const router = useRouter();
  const { prefs, save, refresh } = useAppPrefs();
  const { isMember, resetCountersForDissertationDemo, clearDemoMembership, refresh: memRefresh } =
    useMembership();
  const [nameOverride, setNameOverride] = useState(prefs.displayNameOverride || "");
  const [variant, setVariant] = useState(prefs.abVariant || "—");

  useEffect(() => {
    setNameOverride(prefs.displayNameOverride || "");
  }, [prefs.displayNameOverride]);

  useEffect(() => {
    if (auth.currentUser) void ensureAbVariant().then(setVariant);
  }, []);

  const syncVariant = async () => {
    const v = await ensureAbVariant();
    setVariant(v);
    await refresh();
  };

  const pushFirebaseName = async () => {
    const u = auth.currentUser;
    if (!u) {
      Alert.alert("Sign in", "Log in to update your Firebase display name.");
      return;
    }
    const n = nameOverride.trim();
    if (!n) return;
    try {
      await updateProfile(u, { displayName: n });
      await save({ displayNameOverride: n });
      Alert.alert("Saved", "Display name updated in Firebase and leaderboards.");
    } catch (e) {
      Alert.alert("Error", String(e?.message || e));
    }
  };

  const copyJson = async (json, okTitle) => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(json);
      Alert.alert(okTitle || "Copied", "JSON copied to clipboard.");
    } else {
      console.log("EXPORT_JSON", json);
      Alert.alert(okTitle || "Exported", "JSON printed to Metro / Xcode console (search EXPORT_JSON).");
    }
  };

  const runExport = async () => {
    try {
      const json = await exportMyStudyDataJSON();
      await copyJson(json);
    } catch (e) {
      Alert.alert("Export failed", String(e?.message || e));
    }
  };

  const runReproOnly = async () => {
    try {
      const { buildReproBundleJSONExtra } = await import("@/lib/studySession");
      const bundle = await buildReproBundleJSONExtra();
      const json = JSON.stringify(bundle, null, 2);
      await copyJson(json, "Repro bundle");
    } catch (e) {
      Alert.alert("Export failed", String(e?.message || e));
    }
  };

  const issueDemoPuzzleChallenge = async () => {
    const u = auth.currentUser;
    if (!u?.uid) {
      Alert.alert("Sign in", "Publish after you authenticate.");
      return;
    }
    try {
      const prof = await getPublicProfile(u.uid);
      const tag = String(prof?.username || prof?.usernameLower || "player").replace(/^@/, "");
      const floors = 3;
      const cid = await publishAsyncChallenge(
        CHALLENGE_KINDS.puzzle_ladder_stages,
        tag,
        floors,
        "settings-demo-ladder"
      );
      const { message } = shareChallengeLinks(cid);
      await Share.share({
        message: `Beat my puzzle ladder (${floors}+ stages cleared)\n${message}`,
      });
    } catch (e) {
      Alert.alert("Challenge", String(e?.message || e));
    }
  };

  const issueDemoChallenge = async () => {
    const u = auth.currentUser;
    if (!u?.uid) {
      Alert.alert("Sign in", "Publish after you authenticate.");
      return;
    }
    try {
      const prof = await getPublicProfile(u.uid);
      const tag = String(prof?.username || prof?.usernameLower || "player").replace(/^@/, "");
      const cid = await publishAsyncChallenge(CHALLENGE_KINDS.arcade_flappy, tag, 20, "settings-demo");
      const { message } = shareChallengeLinks(cid);
      await Share.share({
        message: `Beat my dodge run (${CHALLENGE_KINDS.arcade_flappy} ≥20)\n${message}`,
      });
    } catch (e) {
      Alert.alert("Challenge", String(e?.message || e));
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>Settings</Text>

        <Text style={s.sec}>Feedback & comfort</Text>
        <View style={s.row}>
          <Text style={s.label}>Haptics on score (Arcade)</Text>
          <Switch
            value={prefs.hapticsEnabled !== false}
            onValueChange={(v) => save({ hapticsEnabled: v })}
          />
        </View>
        <View style={s.row}>
          <Text style={s.label}>Sound effects (native games)</Text>
          <Switch
            value={prefs.soundEffects !== false}
            onValueChange={(v) => save({ soundEffects: v })}
          />
        </View>
        <View style={s.row}>
          <Text style={s.label}>Larger home cards (accessibility)</Text>
          <Switch value={prefs.largeUI === true} onValueChange={(v) => save({ largeUI: v })} />
        </View>

        <Text style={s.sec}>Profile & leaderboards</Text>
        <TextInput
          style={s.input}
          placeholder="Display name override"
          placeholderTextColor={Nexus.textMuted}
          value={nameOverride}
          onChangeText={setNameOverride}
          autoCapitalize="words"
        />
        <TouchableOpacity style={s.btn} onPress={pushFirebaseName}>
          <Text style={s.btnT}>Save name (Firebase + local)</Text>
        </TouchableOpacity>

        <Text style={s.sec}>Membership prototype</Text>
        <Text style={s.p}>
          {FREE_LAUNCHES_PER_GAME} free launches per entitlement id (solo or online rooms), stored on-device. Simulated renewal does not bill anything.
        </Text>
        <Text style={s.pMuted}>
          Status: {isMember() ? "Unlimited unlocked (demo · 30 days local)" : "Free tier counters active"}
        </Text>
        <TouchableOpacity style={s.btn} onPress={() => router.push("/membership")}>
          <Text style={s.btnT}>Open plans & fake checkout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btn3}
          onPress={async () => {
            Alert.alert(
              "Reset counters?",
              "Clears simulated membership and zeroes per-game free counts for dissertation demos.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  style: "destructive",
                  onPress: async () => {
                    await resetCountersForDissertationDemo();
                    await memRefresh();
                    Alert.alert("Done", "Free-tier counters cleared.");
                  },
                },
              ]
            );
          }}
        >
          <Text style={s.btn3T}>Reset counters (dissertation demo)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btn3}
          onPress={async () => {
            await clearDemoMembership();
            await memRefresh();
            Alert.alert("Cleared", "Simulated membership removed.");
          }}
        >
          <Text style={s.btn3T}>Turn off simulated unlimited</Text>
        </TouchableOpacity>

        <Text style={s.sec}>Dissertation tools</Text>
        <Text style={s.p}>Analytics stores anonymous session payloads only if you consent.</Text>
        <View style={s.row}>
          <Text style={s.label}>Opt in to blind study duel lobby</Text>
          <Switch
            value={prefs.studyDuelOptIn === true}
            onValueChange={(v) => save({ studyDuelOptIn: v })}
          />
        </View>
        <View style={s.row}>
          <Text style={s.label}>Share analytics events</Text>
          <Switch
            value={prefs.analyticsConsent === true}
            onValueChange={(v) =>
              save({ analyticsConsent: v ? true : false })
            }
          />
        </View>
        <View style={s.row}>
          <Text style={s.label}>A/B cohort</Text>
          <Text style={s.mono}>{variant}</Text>
        </View>
        <TouchableOpacity style={s.btn2} onPress={syncVariant}>
          <Text style={s.btn2T}>Refresh cohort</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn2} onPress={runExport}>
          <Text style={s.btn2T}>Export my scores + events (JSON)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn2} onPress={runReproOnly}>
          <Text style={s.btn2T}>Export session repro bundle only (JSON)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn2} onPress={() => void issueDemoChallenge()}>
          <Text style={s.btn2T}>Issue demo async challenge (Flappy · share link)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn2} onPress={() => void issueDemoPuzzleChallenge()}>
          <Text style={s.btn2T}>Issue puzzle ladder demo challenge (share link)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backT}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  scroll: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 28, fontWeight: "900", color: Nexus.green, marginBottom: 20 },
  sec: { fontSize: 15, fontWeight: "800", color: Nexus.text, marginTop: 12, marginBottom: 8 },
  p: { color: Nexus.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  label: { flex: 1, color: Nexus.text, fontSize: 15 },
  mono: { color: Nexus.cyan, fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) },
  input: {
    backgroundColor: Nexus.bgCard,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    borderRadius: 10,
    padding: 14,
    color: Nexus.text,
    marginBottom: 10,
  },
  btn: { backgroundColor: Nexus.green, padding: 14, borderRadius: 12, alignItems: "center", marginBottom: 8 },
  btnT: { color: Nexus.darkText, fontWeight: "800" },
  btn3: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    alignItems: "center",
    marginBottom: 8,
  },
  btn3T: { color: Nexus.textMuted, fontWeight: "700" },
  pMuted: { fontSize: 13, color: Nexus.cyan, marginBottom: 10 },
  btn2: { borderWidth: 1, borderColor: Nexus.magenta, padding: 12, borderRadius: 10, alignItems: "center", marginBottom: 8 },
  btn2T: { color: Nexus.magenta, fontWeight: "700" },
  back: { marginTop: 16, padding: 14, alignItems: "center" },
  backT: { color: Nexus.textMuted, fontWeight: "700" },
});
