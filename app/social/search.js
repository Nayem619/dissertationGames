import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import { outgoingPendingFor, areFriends, sendFriendRequest } from "@/lib/friends";
import { searchUsersByUsernamePrefix } from "@/lib/socialProfile";
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

export default function PlayerSearchScreen() {
  const router = useRouter();
  const myUid = auth.currentUser?.uid;
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [friendMap, setFriendMap] = useState({});
  const [pendingMap, setPendingMap] = useState({});

  const runSearch = async () => {
    setBusy(true);
    try {
      const found = await searchUsersByUsernamePrefix(q);
      const list = found.filter((r) => r.id !== myUid);
      setRows(list);

      const f = {};
      const p = {};
        for (let i = 0; i < list.length; i++) {
          const fid = list[i].id;
          if (myUid) f[fid] = await areFriends(myUid, fid);
          p[fid] = await outgoingPendingFor(fid);
        }
      setFriendMap(f);
      setPendingMap(p);
    } catch (e) {
      Alert.alert("Search", String(e?.message || e));
      setRows([]);
    } finally {
      setBusy(false);
    }
  };

  const addFriendTap = async (uid) => {
    try {
      await sendFriendRequest(uid);
      setPendingMap((m) => ({ ...m, [uid]: true }));
      Alert.alert("Sent", "Friend invite sent.");
    } catch (e) {
      Alert.alert("Friends", String(e?.message || e));
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.pad}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Hub</Text>
        </TouchableOpacity>
        <Text style={s.h1}>Search players</Text>
        <Text style={s.p}>Type first letters of a gamer tag · then tap Search.</Text>
        {!myUid ? (
          <Text style={s.warn}>Sign in to use search.</Text>
        ) : null}
        <TextInput
          style={s.input}
          placeholder="Starts with…"
          placeholderTextColor={Nexus.textMuted}
          autoCapitalize="none"
          value={q}
          onChangeText={setQ}
        />
        <TouchableOpacity style={s.go} disabled={busy} onPress={() => void runSearch()}>
          <Text style={s.goT}>{busy ? "…" : "Search"}</Text>
        </TouchableOpacity>

        {rows.map((r) => (
          <View key={r.id} style={s.row}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push(`/social/user/${r.id}`)}
            >
              <Text style={s.tag}>@{r.username || r.usernameLower}</Text>
              <Text style={s.hint}>tap for history</Text>
            </TouchableOpacity>
            {friendMap[r.id] ? (
              <Text style={s.badg}>friends</Text>
            ) : pendingMap[r.id] ? (
              <Text style={s.badg}>pending</Text>
            ) : (
              <TouchableOpacity style={s.add} onPress={() => void addFriendTap(r.id)}>
                <Text style={s.addT}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22, paddingBottom: 44 },
  back: { color: Nexus.cyan, fontWeight: "700", marginBottom: 16 },
  h1: { fontSize: 24, fontWeight: "900", color: Nexus.green, marginBottom: 8 },
  p: { color: Nexus.textMuted, marginBottom: 14, lineHeight: 20 },
  warn: { color: Nexus.pink, marginBottom: 12 },
  input: {
    backgroundColor: Nexus.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    padding: 14,
    color: Nexus.text,
    marginBottom: 12,
  },
  go: {
    backgroundColor: Nexus.cyan,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  goT: { fontWeight: "900", color: Nexus.darkText },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Nexus.borderDim,
  },
  tag: { color: Nexus.text, fontWeight: "800", fontSize: 17 },
  hint: { color: Nexus.textMuted, fontSize: 12 },
  add: {
    backgroundColor: Nexus.magenta,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addT: { color: "#fff", fontWeight: "900" },
  badg: { color: Nexus.green, fontWeight: "800" },
});
