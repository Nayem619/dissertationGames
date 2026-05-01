import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import {
  acceptFriendRequest,
  listFriendsDetailed,
  rejectFriendRequest,
  subscribeIncomingRequests,
} from "@/lib/friends";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const uid = auth.currentUser?.uid;

  const refreshFriends = useCallback(async () => {
    if (!auth.currentUser?.uid) {
      setFriends([]);
      setLoadingFriends(false);
      return;
    }
    setLoadingFriends(true);
    try {
      const rows = await listFriendsDetailed();
      setFriends(rows);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshFriends();
    }, [refreshFriends])
  );

  useEffect(() => {
    if (!uid) {
      setIncoming([]);
      return undefined;
    }
    const unsub = subscribeIncomingRequests(setIncoming);
    return unsub;
  }, [uid]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.pad}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Hub</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.h1}>Friends</Text>

        <Text style={s.section}>Incoming</Text>
        {incoming.length === 0 ? (
          <Text style={s.muted}>No pending invites.</Text>
        ) : (
          incoming.map((r) => (
            <View key={r.id} style={s.card}>
              <Text style={s.name}>{r.fromUsername}</Text>
              <View style={s.row}>
                <TouchableOpacity
                  style={s.ok}
                  onPress={() => {
                    void acceptFriendRequest(r.fromUid).then(refreshFriends);
                  }}
                >
                  <Text style={s.okT}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.no} onPress={() => void rejectFriendRequest(r.fromUid)}>
                  <Text style={s.noT}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={[s.section, { marginTop: 26 }]}>Your friends</Text>
        {loadingFriends ? (
          <ActivityIndicator color={Nexus.green} />
        ) : friends.length === 0 ? (
          <Text style={s.muted}>Nobody here yet · search players to add.</Text>
        ) : (
          friends.map((f) => (
            <TouchableOpacity
              key={f.uid}
              style={s.rowCard}
              onPress={() => router.push(`/social/user/${f.uid}`)}
            >
              <Text style={s.username}>@{f.username}</Text>
              <Text style={s.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22, paddingBottom: 44 },
  top: { marginBottom: 8 },
  back: { color: Nexus.cyan, fontWeight: "700" },
  h1: { fontSize: 24, fontWeight: "900", color: Nexus.green, marginBottom: 16 },
  section: { color: Nexus.text, fontWeight: "800", marginBottom: 10 },
  muted: { color: Nexus.textMuted, marginBottom: 8 },
  card: {
    backgroundColor: Nexus.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    marginBottom: 12,
  },
  name: { color: Nexus.text, fontWeight: "800", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10 },
  ok: {
    flex: 1,
    backgroundColor: Nexus.green,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  okT: { color: Nexus.darkText, fontWeight: "900" },
  no: {
    flex: 1,
    borderWidth: 1,
    borderColor: Nexus.border,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  noT: { color: Nexus.textMuted, fontWeight: "800" },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Nexus.borderDim,
  },
  username: { color: Nexus.cyan, fontWeight: "800", fontSize: 17 },
  arrow: { color: Nexus.textMuted, fontSize: 22 },
});
