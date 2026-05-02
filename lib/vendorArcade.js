import Constants from "expo-constants";

/** @param {"chess" | "ludo"} kind */
export function getVendorArcadeOrigin(kind) {
  const extra = Constants.expoConfig?.extra || {};
  const fromExtra =
    kind === "chess" ? extra.vendorChessUrl : extra.vendorLudoUrl;
  const fromEnv =
    kind === "chess"
      ? typeof process.env.EXPO_PUBLIC_VENDOR_CHESS_URL === "string"
        ? process.env.EXPO_PUBLIC_VENDOR_CHESS_URL
        : ""
      : typeof process.env.EXPO_PUBLIC_VENDOR_LUDO_URL === "string"
        ? process.env.EXPO_PUBLIC_VENDOR_LUDO_URL
        : "";
  const raw = String(fromEnv || fromExtra || "").trim();
  // Both vendor apps ship with dev UI on CRA/Next dev port 3000 by default.
  const fallback = "http://localhost:3000";
  const merged = raw || fallback;
  return merged.replace(/\/+$/, "");
}
