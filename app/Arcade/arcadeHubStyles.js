import { Nexus } from "@/constants/theme";
import { Platform, StyleSheet } from "react-native";

export const hubStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Nexus.bg },
  scroll: { padding: 20, paddingBottom: 48 },
  h1: {
    fontSize: 28,
    fontWeight: "900",
    color: Nexus.green,
    textAlign: "center",
    marginBottom: 6,
    textShadowColor: "rgba(0, 255, 136, 0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  sub: { fontSize: 14, color: Nexus.textMuted, textAlign: "center", marginBottom: 22, lineHeight: 20 },
  card: {
    backgroundColor: Nexus.bgCard,
    borderWidth: 2,
    borderColor: Nexus.borderDim,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  cardPressed: { opacity: 0.9 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 28 },
  title: { fontSize: 18, fontWeight: "800", color: Nexus.text, marginBottom: 4 },
  blurb: { fontSize: 13, color: Nexus.textMuted, lineHeight: 18, flex: 1 },
  backBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Nexus.pink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  backBtnT: { color: "#ff6b7a", fontWeight: "700", fontSize: 15 },
});
