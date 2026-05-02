import Constants from "expo-constants";

/** Works on real devices (global DNS). `ches.su` often fails to resolve; self-host vendor/chessu if you need that UI. */
const FALLBACK_PUBLIC_CHESS = "https://lichess.org";

/** MERN Ludo Web service from this repo’s Render blueprint (`render.yaml`). */
const FALLBACK_PUBLIC_LUDO = "https://dissertationgames-ludo.onrender.com";

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
  const merged =
    raw || (kind === "chess" ? FALLBACK_PUBLIC_CHESS : FALLBACK_PUBLIC_LUDO);
  return merged.replace(/\/+$/, "");
}
