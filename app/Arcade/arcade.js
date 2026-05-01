import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { submitArcadeScore } from "@/lib/arcadeScores";
import { softAcceptChallenge } from "@/lib/challenges";
import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";
import {
  PHASER_BREAKOUT_HTML,
  PHASER_CHESS_HTML,
  PHASER_MEMORY_HTML,
  PHASER_PONG_HTML,
} from "./gamesHtml";
import {
  PHASER_CONNECT4_HTML,
  PHASER_FLAPPY_HTML,
  PHASER_LUDO_LITE_HTML,
  PHASER_SIMON_HTML,
} from "./extraGamesHtml";
import { dispatchPuzzleWebMessage } from "@/lib/puzzleBridge";
import { PhaserInlineWebView } from "./PhaserWebGameShell";
import { PHASER_ARCADE_ROWS } from "./arcadeCatalog";

import { hubStyles } from "./arcadeHubStyles";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

const HTML_BY_PLAY = {
  chess: PHASER_CHESS_HTML,
  breakout: PHASER_BREAKOUT_HTML,
  memory: PHASER_MEMORY_HTML,
  pong: PHASER_PONG_HTML,
  flappy: PHASER_FLAPPY_HTML,
  simon: PHASER_SIMON_HTML,
  connect4: PHASER_CONNECT4_HTML,
  ludo: PHASER_LUDO_LITE_HTML,
};

const ARCADE_ITEMS = PHASER_ARCADE_ROWS.map((row) => ({
  ...row,
  html: HTML_BY_PLAY[row.play],
})).filter((x) => x.html);

function ArcadeHub() {
  const router = useRouter();
  return (
    <View style={hubStyles.screen}>
      <ScrollView contentContainerStyle={hubStyles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={hubStyles.h1}>Phaser arcade</Text>
        <Text style={hubStyles.sub}>HTML5 Phaser&nbsp;3 + chess.js. Same CDN pattern as Snake. Works offline only if CDN cached.</Text>

        {ARCADE_ITEMS.map((g) => (
          <TouchableOpacity
            key={g.play}
            style={({ pressed }) => [hubStyles.card, pressed && hubStyles.cardPressed]}
            activeOpacity={0.92}
            onPress={() => router.push({ pathname: "/Arcade/arcade", params: { play: g.play } })}
          >
            <View style={hubStyles.row}>
              <View style={[hubStyles.emojiBox, { backgroundColor: g.color }]}>
                <Text style={hubStyles.emoji}>{g.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={hubStyles.title}>{g.title}</Text>
                <Text style={hubStyles.blurb}>{g.blurb}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={hubStyles.backBtn} onPress={() => router.push("/home")} activeOpacity={0.85}>
          <Text style={hubStyles.backBtnT}>Back to Nexus Arena</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function ArcadeRoute() {
  const router = useRouter();
  const p = useLocalSearchParams();
  const play = paramFirst(p, "play");
  const rawCh = paramFirst(p, "challengeId");
  const challengeId = String(rawCh ?? "").trim();

  const challengeTargetRaw = paramFirst(p, "challengeTarget");
  const challengeTarget = Number(challengeTargetRaw);

  const item = ARCADE_ITEMS.find((x) => x.play === play);
  const shellOpen = !!(item?.html);
  const gate = useConsumePlayEntitlement(shellOpen ? "arcade" : "", {
    skip: !shellOpen,
  });

  useFocusEffect(
    useCallback(() => {
      const gameSurface =
        shellOpen && item?.play ? `arcade_${String(item.play)}` : "arcade_hub";
      void dispatchPuzzleWebMessage({
        type: "ARCADE_SURFACE_OPEN",
        game: gameSurface,
      });
    }, [shellOpen, item?.play])
  );

  const chalLoggedRef = useRef(false);
  useEffect(() => {
    chalLoggedRef.current = false;
  }, [play, challengeId]);

  const onBridgeMessage = useCallback((msg) => {
    if (!msg || msg.type !== "ARCADE_SCORE") return;
    const key = typeof msg.game === "string" ? msg.game.toLowerCase() : "";
    const map = {
      breakout: "arcade_breakout",
      memory: "arcade_memory",
      pong: "arcade_pong",
      flappy: "arcade_flappy",
      simon: "arcade_simon",
      connect4: "arcade_connect4",
    };
    const gameId = map[key] || msg.game;
    if (!gameId) return;
    void submitArcadeScore(gameId, msg.score, { difficulty: msg.difficulty ?? "standard" });
    if (
      challengeId &&
      key === "flappy" &&
      Number.isFinite(challengeTarget) &&
      typeof msg.score === "number" &&
      msg.score >= challengeTarget &&
      !chalLoggedRef.current
    ) {
      chalLoggedRef.current = true;
      void softAcceptChallenge(challengeId).then(() =>
        Alert.alert("Challenge", `Score ${msg.score} ≥ ${Math.floor(challengeTarget)} — logged.`)
      );
    }
  }, [challengeId, challengeTarget]);

  if (shellOpen) {
    if (gate.loading) return <PlayEntitlementSplash entitlementId="arcade" />;
    if (!gate.ok) return <View style={{ flex: 1, backgroundColor: "#0a0a0f" }} />;
  }

  if (item?.html) {
    return (
      <PhaserInlineWebView
        html={item.html}
        onBack={() => router.replace("/home")}
        statusTint="#00ffaa"
        onBridgeMessage={onBridgeMessage}
        onLeaderboard={
          item.lb
            ? () =>
                router.push({
                  pathname: "/Leaderboard/leaderboard",
                  params: { game: item.lb },
                })
            : undefined
        }
      />
    );
  }

  return <ArcadeHub />;
}
