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
        <Stack.Screen name="study-duel/index" />
        <Stack.Screen name="study-duel/join" />
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