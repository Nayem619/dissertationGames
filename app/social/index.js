import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import { getPublicProfile } from "@/lib/socialProfile";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function SocialHub() {
  const router = useRouter();
  const [tag, setTag] = useState("");

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setTag("");
        return;
      }
      const p = await getPublicProfile(uid);
      setTag(String(p?.username || p?.usernameLower || "").trim());
    })();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={s.h1}>Play Hub social</Text>
        <Text style={s.sub}>
          Your gamer tag {!tag ? "(not set)" : `@${tag}`}. Online rooms require a username so
          opponents show up clearly in history and search.
        </Text>

        {!auth.currentUser ? (
          <Text style={s.warn}>Sign in to use profiles, friends, and history.</Text>
        ) : null}

        <TouchableOpacity style={s.btnG} onPress={() => router.push("/social/username")}>
          <Text style={s.btnGT}>{tag ? "Change username" : "Set username (required online)"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btn} onPress={() => router.push("/social/friends")}>
          <Text style={s.btnT}>Friends & invites</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btn} onPress={() => router.push("/social/search")}>
          <Text style={s.btnT}>Search players</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btn} onPress={() => router.push("/social/history")}>
          <Text style={s.btnT}>My match history</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backT}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22, paddingBottom: 44 },
  h1: { fontSize: 26, fontWeight: "900", color: Nexus.green, marginBottom: 8 },
  sub: { color: Nexus.textMuted, lineHeight: 22, marginBottom: 20 },
  warn: { color: Nexus.pink, marginBottom: 16, fontWeight: "700" },
  btnG: {
    backgroundColor: Nexus.green,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  btnGT: { fontWeight: "900", color: Nexus.darkText, fontSize: 16 },
  btn: {
    borderWidth: 2,
    borderColor: Nexus.cyan,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  btnT: { color: Nexus.cyan, fontWeight: "800", fontSize: 16 },
  back: { marginTop: 24, alignItems: "center" },
  backT: { color: Nexus.textMuted, fontWeight: "700" },
});
