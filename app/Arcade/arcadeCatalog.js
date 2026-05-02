/**
 * Shared listing for Arcade hub & home cards (no HTML — keeps home bundle light).
 * HTML maps live in arcade.js next to ARCADE_HTML_BY_PLAY below.
 */

export const PHASER_ARCADE_ROWS = [
  {
    play: "chess",
    title: "CHESS",
    emoji: "♟️",
    blurb: "Two-player locally. Legal moves · tap highlighted targets.",
    color: "#1a5533",
    lb: null,
  },
  {
    play: "ludo",
    title: "LUDO LITE",
    emoji: "🎲",
    blurb: "Phaser sprint loop · capture · hot-seat · tap purple.",
    color: "#7c1485",
    lb: null,
  },
  {
    play: "breakout",
    title: "BREAKOUT",
    emoji: "🧱",
    blurb: "Drag paddle · smash all bricks.",
    color: "#0f4fd4",
    lb: "arcade_breakout",
  },
  {
    play: "memory",
    title: "CARD MATCH",
    emoji: "🃏",
    blurb: "Find pairs. Tap replay zone after you clear.",
    color: "#6b21b6",
    lb: "arcade_memory",
  },
  {
    play: "pong",
    title: "PONG VS CPU",
    emoji: "🏓",
    blurb: "Move bottom paddle · bounce past the AI.",
    color: "#b45309",
    lb: "arcade_pong",
  },
  {
    play: "flappy",
    title: "DODGE RUN",
    emoji: "🪶",
    blurb: "Tap to lift · avoid red bars · score climbs with time alive.",
    color: "#0284c7",
    lb: "arcade_flappy",
  },
  {
    play: "simon",
    title: "SIMON FLASH",
    emoji: "🎵",
    blurb: "Repeat the color sequence · longer each round.",
    color: "#c026d3",
    lb: "arcade_simon",
  },
  {
    play: "connect4",
    title: "CONNECT FOUR",
    emoji: "🔴",
    blurb: "Two-player hot-seat · drops to bottom.",
    color: "#15803d",
    lb: "arcade_connect4",
  },
];
