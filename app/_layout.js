import { useColorScheme } from "@/hooks/use-color-scheme";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
        <Stack.Screen name="EndlessRunner/endlessrunner" />
        <Stack.Screen name="Leaderboard/leaderboard" />
        <Stack.Screen name="Leaderboard/LeaderboardScreen" />

        {/* Tabs + modal if you use them */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
    </SafeAreaProvider>
  );
}