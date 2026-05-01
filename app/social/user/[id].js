import { Nexus } from "@/constants/theme";
import { auth } from "@/constants/firebase";
import {
  areFriends,
  outgoingPendingFor,
  sendFriendRequest,
} from "@/lib/friends";
import { listUserRecentMatches } from "@/lib/matchHistory";
import { buildRivalArc } from "@/lib/rivalArc";
import { getPublicProfile } from "@/lib/socialProfile";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function paramUid(p) {
  const raw = Array.isArray(p.id) ? p.id[0] : p.id;
  return decodeURIComponent(raw || "").trim();
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = paramUid(params);
  const myUid = auth.currentUser?.uid;
  const [prof, setProf] = useState(null);
  const [matches, setMatches] = useState([]);
  const [friend, setFriend] = useState(false);
  const [pendingOut, setPendingOut] = useState(false);
  const [rivalArc, setRivalArc] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    (async () => {
      const [p, m] = await Promise.all([
        getPublicProfile(id),
        listUserRecentMatches(id, 20),
      ]);
      setProf(p);
      setMatches(m);
      if (myUid && myUid !== id) {
        setFriend(await areFriends(myUid, id));
        setPendingOut(await outgoingPendingFor(id));
        setRivalArc(await buildRivalArc(myUid, id));
      } else {
        setRivalArc(null);
      }
    })();
    return undefined;
  }, [id, myUid]);

  const addFriend = async () => {
    try {
      await sendFriendRequest(id);
      setPendingOut(true);
      Alert.alert("Sent", "Invite queued.");
    } catch (e) {
      Alert.alert("Friends", String(e?.message || e));
    }
  };

  if (!id) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.bad}>Missing user id.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.pad}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        {!prof ? (
          <ActivityIndicator style={{ marginTop: 28 }} color={Nexus.green} />
        ) : (
          <>
            <Text style={s.h1}>@{prof.username || prof.usernameLower}</Text>
            {myUid && myUid !== id ? (
              <View style={s.row}>
                {friend ? (
                  <Text style={s.badge}>Already friends</Text>
                ) : pendingOut ? (
                  <Text style={s.badge}>Invite pending</Text>
                ) : (
                  <TouchableOpacity style={s.addBtn} onPress={() => void addFriend()}>
                    <Text style={s.addT}>Send friend invite</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
            {rivalArc ? (
              <View style={s.arcBox}>
                <Text style={s.sec}>Rival arc</Text>
                <Text style={s.arcStats}>
                  {rivalArc.matches} shared matches · you {rivalArc.winsYou}W · them {rivalArc.winsThem}W · draws{" "}
                  {rivalArc.draws} · you left {rivalArc.abandonsYou} · they left {rivalArc.abandonsThey}
                </Text>
                {rivalArc.timeline.map((t) => (
                  <Text key={t.id} style={s.arcLine}>
                    • {t.gist}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={s.sec}>Their recent matches (public snapshot)</Text>
            {matches.length === 0 ? (
              <Text style={s.muted}>No finished games logged yet.</Text>
            ) : (
              matches.map((row) => {
                const isHost = row.hostUid === id;
                const foeName = row?.participantNames
                  ? row.participantNames[isHost ? row.guestUid : row.hostUid]
                  : "?";
                return (
                  <View key={row.id} style={s.card}>
                    <Text style={s.g}>
                      vs @{foeName || "rival"}{" "}
                      <Text style={s.dim}>
                        · {String(row.game) === "chess" ? "Chess" : "TTT"}
                      </Text>
                    </Text>
                    <Text style={s.small}>{String(row.summary || row.outcome || "")}</Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  pad: { padding: 22, paddingBottom: 44 },
  back: { color: Nexus.cyan, fontWeight: "700", marginBottom: 16 },
  bad: { color: "#faa", padding: 20 },
  h1: { fontSize: 26, fontWeight: "900", color: Nexus.green },
  row: { marginTop: 12, marginBottom: 22 },
  addBtn: {
    alignSelf: "flex-start",
    backgroundColor: Nexus.magenta,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addT: { color: "#fff", fontWeight: "900" },
  badge: { color: Nexus.green, fontWeight: "800" },
  sec: { color: Nexus.text, fontWeight: "800", marginBottom: 10 },
  muted: { color: Nexus.textMuted },
  arcBox: { marginBottom: 22 },
  arcStats: { color: Nexus.textMuted, lineHeight: 20, marginBottom: 10, fontSize: 13 },
  arcLine: { color: Nexus.cyan, fontSize: 12, marginBottom: 4 },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Nexus.bgCard,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    marginBottom: 10,
  },
  g: { color: Nexus.text, fontWeight: "800" },
  dim: { color: Nexus.textMuted, fontWeight: "600", fontSize: 13 },
  small: { color: Nexus.cyan, marginTop: 6, fontSize: 13 },
});
