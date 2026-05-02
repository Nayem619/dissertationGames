import { useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { dispatchPuzzleWebMessage } from "@/lib/puzzleBridge";

import { PHASER_ARCADE_ROWS } from "./arcadeCatalog";
import { hubStyles } from "./arcadeHubStyles";

function ArcadeHub() {
  const router = useRouter();
  const hasGames = PHASER_ARCADE_ROWS.length > 0;

  return (
    <View style={hubStyles.screen}>
      <ScrollView contentContainerStyle={hubStyles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={hubStyles.h1}>Arcade</Text>
        <Text style={hubStyles.sub}>
          {hasGames
            ? "Classic mini-games run Phaser locally with CDN fallback · scores can post to the arcade leaderboards where listed."
            : "No Phaser arcade mini-games are listed here at the moment — use Snake from the Snake card if configured."}
        </Text>

        {hasGames &&
          PHASER_ARCADE_ROWS.map((g) => (
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
          <Text style={hubStyles.backBtnT}>Back to Play Hub</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function ArcadeRoute() {
  useFocusEffect(
    useCallback(() => {
      void dispatchPuzzleWebMessage({
        type: "ARCADE_SURFACE_OPEN",
        game: "arcade_hub",
      });
    }, [])
  );

  return <ArcadeHub />;
}
