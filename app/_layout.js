import { PrefsProvider } from "@/context/AppPrefs";
import { MembershipProvider } from "@/context/MembershipContext";
import { ensureStudySession, flushRouteTrace } from "@/lib/studySession";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import { useEffect } from "react";

function StudyNavigationTrace() {
  const path = usePathname();
  useEffect(() => {
    void ensureStudySession();
  }, []);
  useEffect(() => {
    if (path) void flushRouteTrace(path);
  }, [path]);
  return null;
}

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7865/ingest/0ecd33e7-af68-46c6-bbe3-d95a5d8f6748", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "1c5831",
      },
      body: JSON.stringify({
        sessionId: "1c5831",
        hypothesisId: "H-layout",
        location: "app/_layout.js:RootLayout",
        message: "root_layout_mounted",
        data: {
          studyDuelReg: "folder-only (removed study-duel/index + study-duel/join Stack.Screen)",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, []);
  // #endregion agent log

  return (
    <SafeAreaProvider>
    <PrefsProvider>
    <MembershipProvider>
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StudyNavigationTrace />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Landing */}
        <Stack.Screen name="index" />

        {/* Auth (matches app/authentication/...) */}
        <Stack.Screen name="authentication/login" />
        <Stack.Screen name="authentication/signup" />

        {/* Main menu */}
        <Stack.Screen name="home" />

        {/* Games (MATCH your folders exactly) */}
        <Stack.Screen name="TicTacToe/tictactoe" />
        <Stack.Screen name="RockPaperScissors/rockpaperscissors" />
        <Stack.Screen name="Snake/snake" />
        <Stack.Screen name="trivia/trivia" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="membership/index" />
        <Stack.Screen name="membership/checkout" />
        <Stack.Screen name="social" options={{ headerShown: false }} />
        <Stack.Screen name="multiplayer/play" />
        <Stack.Screen name="multiplayer/chess-play" />
        {/* study-duel/ is a nested layout folder — screens are index & join inside it; listing
            study-duel/join here makes Expo warn (child is segment "study-duel" only). */}
        <Stack.Screen name="challenge/[id]" />
        <Stack.Screen name="Arcade/arcade" />
        <Stack.Screen name="puzzle-ladder/index" />
        <Stack.Screen name="puzzle/[kind]" />
        <Stack.Screen name="EndlessRunner/endlessrunner" />
        <Stack.Screen name="Leaderboard/leaderboard" />
        <Stack.Screen name="Leaderboard/LeaderboardScreen" />

        {/* Tabs + modal if you use them */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
    </MembershipProvider>
    </PrefsProvider>
    </SafeAreaProvider>
  );
}