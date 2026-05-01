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

import { hubStyles } from "./arcadeHubStyles";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

const ARCADE_ITEMS = [
  {
    play: "chess",
    title: "CHESS",
    emoji: "♟️",
    blurb: "Two-player locally. Legal moves · tap highlighted targets.",
    color: "#1a5533",
    html: PHASER_CHESS_HTML,
    lb: null,
  },
  {
    play: "breakout",
    title: "BREAKOUT",
    emoji: "🧱",
    blurb: "Drag paddle · smash all bricks.",
    color: "#0f4fd4",
    html: PHASER_BREAKOUT_HTML,
    lb: "arcade_breakout",
  },
  {
    play: "memory",
    title: "CARD MATCH",
    emoji: "🃏",
    blurb: "Find pairs. Tap replay zone after you clear.",
    color: "#6b21b6",
    html: PHASER_MEMORY_HTML,
    lb: "arcade_memory",
  },
  {
    play: "pong",
    title: "PONG VS CPU",
    emoji: "🏓",
    blurb: "Move bottom paddle · bounce past the AI.",
    color: "#b45309",
    html: PHASER_PONG_HTML,
    lb: "arcade_pong",
  },
  {
    play: "flappy",
    title: "DODGE RUN",
    emoji: "🪶",
    blurb: "Tap to lift · avoid red bars · score climbs with time alive.",
    color: "#0284c7",
    html: PHASER_FLAPPY_HTML,
    lb: "arcade_flappy",
  },
  {
    play: "simon",
    title: "SIMON FLASH",
    emoji: "🎵",
    blurb: "Repeat the color sequence · longer each round.",
    color: "#c026d3",
    html: PHASER_SIMON_HTML,
    lb: "arcade_simon",
  },
  {
    play: "connect4",
    title: "CONNECT FOUR",
    emoji: "🔴",
    blurb: "Two-player hot-seat · drops to bottom.",
    color: "#15803d",
    html: PHASER_CONNECT4_HTML,
    lb: "arcade_connect4",
  },
  {
    play: "ludo",
    title: "LUDO LITE",
    emoji: "🎲",
    blurb: "Phaser sprint loop · capture · hot-seat · tap purple.",
    color: "#7c1485",
    html: PHASER_LUDO_LITE_HTML,
    lb: null,
  },
];

function ArcadeHub() {
  const router = useRouter();
  return (
    <View style={hubStyles.screen}>
      <ScrollView contentContainerStyle={hubStyles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={hubStyles.h1}>Phaser arcade</Text>
        <Text style={hubStyles.sub}>HTML5 Phaser&nbsp;3 + chess.js. Same CDN pattern as Snake. Works offline only if CDN cached.</Text>

        <Text style={[hubStyles.h1, { fontSize: 18, marginTop: 12, marginBottom: 10 }]}>Native puzzles</Text>
        <TouchableOpacity
          style={hubStyles.card}
          activeOpacity={0.92}
          onPress={() => router.push({ pathname: "/puzzle-ladder" })}
        >
          <View style={hubStyles.row}>
            <View style={[hubStyles.emojiBox, { backgroundColor: "#0e7490" }]}>
              <Text style={hubStyles.emoji}>🔗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={hubStyles.title}>Puzzle ladder</Text>
              <Text style={hubStyles.blurb}>Flow dots → rotating pipes → ice slide · difficulty ramps.</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={hubStyles.card}
          activeOpacity={0.92}
          onPress={() => router.push("/puzzle/flow")}
        >
          <View style={hubStyles.row}>
            <View style={[hubStyles.emojiBox, { backgroundColor: "#1d4ed8" }]}>
              <Text style={hubStyles.emoji}>•</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={hubStyles.title}>Solo flow</Text>
              <Text style={hubStyles.blurb}>Connect coloured pairs · path only crosses itself per colour.</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={hubStyles.card}
          activeOpacity={0.92}
          onPress={() => router.push("/puzzle/pipe")}
        >
          <View style={hubStyles.row}>
            <View style={[hubStyles.emojiBox, { backgroundColor: "#0369a1" }]}>
              <Text style={hubStyles.emoji}>⊕</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={hubStyles.title}>Solo pipes</Text>
              <Text style={hubStyles.blurb}>Tap to rotate until start links both goals.</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={hubStyles.card}
          activeOpacity={0.92}
          onPress={() => router.push("/puzzle/ice")}
        >
          <View style={hubStyles.row}>
            <View style={[hubStyles.emojiBox, { backgroundColor: "#7c3aed" }]}>
              <Text style={hubStyles.emoji}>❄️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={hubStyles.title}>Solo ice maze</Text>
              <Text style={hubStyles.blurb}>Slides until walls · reach the glowing goal.</Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={[hubStyles.h1, { fontSize: 18, marginTop: 24, marginBottom: 14 }]}>HTML5 arcade</Text>
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
        onBack={() => router.replace("/Arcade/arcade")}
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
