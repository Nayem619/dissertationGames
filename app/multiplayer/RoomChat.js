import { Nexus } from "@/constants/theme";
import { sendRoomMessage, subscribeRoomMessages } from "@/lib/roomChat";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RoomChat({ roomCode, myUid }) {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!roomCode?.trim()) return undefined;
    return subscribeRoomMessages(roomCode, setItems);
  }, [roomCode]);

  useEffect(() => {
    if (items.length === 0) return;
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    });
    return () => cancelAnimationFrame(t);
  }, [items.length]);

  const onSend = async () => {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await sendRoomMessage(roomCode, t);
      setDraft("");
    } catch (e) {
      Alert.alert("Chat", String(e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const renderMsg = ({ item }) => {
    const mine = item.senderUid === myUid;
    return (
      <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
        <Text style={styles.meta}>
          {(item.senderName || "?").slice(0, 32)}
          {mine ? " · you" : ""}
        </Text>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleThem]}>
          <Text style={styles.bubbleT}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
      style={styles.wrap}
    >
      <Text style={styles.h}>Live messages</Text>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={renderMsg}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>No messages yet — say hello.</Text>
        }
      />
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Message opponent…"
          placeholderTextColor={Nexus.textMuted}
          value={draft}
          onChangeText={setDraft}
          maxLength={280}
          editable={!sending}
          onSubmitEditing={onSend}
        />
        <TouchableOpacity
          style={[styles.send, (!draft.trim() || sending) && styles.sendOff]}
          onPress={onSend}
          disabled={!draft.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#06101a" size="small" />
          ) : (
            <Text style={styles.sendT}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 160,
    maxHeight: 320,
    borderTopWidth: 1,
    borderTopColor: Nexus.borderDim,
    paddingTop: 10,
    marginTop: 8,
  },
  h: { color: Nexus.textMuted, fontWeight: "800", fontSize: 12, marginBottom: 8 },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: 8 },
  empty: { color: Nexus.textMuted, fontSize: 13, paddingVertical: 12 },
  bubbleWrap: {
    alignSelf: "flex-start",
    marginBottom: 10,
    maxWidth: "92%",
  },
  bubbleWrapMine: { alignSelf: "flex-end" },
  meta: {
    fontSize: 10,
    color: Nexus.textMuted,
    marginBottom: 4,
    marginHorizontal: 2,
  },
  bubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: { backgroundColor: "rgba(0,255,136,0.38)" },
  bubbleThem: { backgroundColor: Nexus.bgCard, borderWidth: 1, borderColor: Nexus.border },
  bubbleT: { color: Nexus.text, fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
  },
  input: {
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Nexus.text,
    backgroundColor: Nexus.bgCard,
    fontSize: 15,
  },
  send: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Nexus.cyan,
    borderRadius: 10,
    minWidth: 72,
    alignItems: "center",
  },
  sendOff: { opacity: 0.45 },
  sendT: { fontWeight: "800", color: "#06101a", fontSize: 15 },
});
