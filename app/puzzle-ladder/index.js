/**
 * Puzzle ladder: cycles Flow → Pipe → Ice · difficulty ramps with cleared stages.
 */

import { Nexus } from "@/constants/theme";
import { submitArcadeScore } from "@/lib/arcadeScores";
import { flagsFromCohortLetter } from "@/lib/abExperiments";
import { softAcceptChallenge } from "@/lib/challenges";
import { ensureAbVariant } from "@/lib/dissertation";
import {
  dispatchPuzzleWebMessage,
  logPuzzleTelemetry,
} from "@/lib/puzzleBridge";
import {
  flowActivePairIndex,
  buildOcc,
  generateFlowDots,
} from "@/lib/puzzles/flowEngine";
import { generateIceBoard, iceSlide } from "@/lib/puzzles/iceEngine";
import {
  generatePipeBoard,
  pipeConnectsGoals,
  openMask,
} from "@/lib/puzzles/pipeEngine";
import { lcg } from "@/lib/puzzles/rng";
import { useAppPrefs } from "@/context/AppPrefs";
import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";
import { studyDecisionEnd, studyDecisionStart } from "@/lib/studySession";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

const PAL = ["#ff5c8d", "#4ddfff", "#ffcc66", "#7bff9a"];

export default function PuzzleLadderScreen() {
  const router = useRouter();
  const sp = useLocalSearchParams();

  const challengeIdRaw = paramFirst(sp, "challengeId");
  const challengeId = String(challengeIdRaw ?? "").trim();
  const chFloorsRaw = Number(paramFirst(sp, "challengeFloors"));

  const gate = useConsumePlayEntitlement("arcade");

  const { prefs, refresh } = useAppPrefs();
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void ensureAbVariant();
      void dispatchPuzzleWebMessage({
        type: "ARCADE_SURFACE_OPEN",
        game: "puzzle_ladder_mount",
      });
    }, [refresh])
  );

  const label = prefs.abVariant || "A";
  const redoLab = flagsFromCohortLetter(label).puzzleRedoOnceLab;

  const runIdRef = useRef(`ladder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const [level, setLevel] = useState(1);
  const soloGame = String(paramFirst(sp, "solo") || "").trim();
  const ladderMode = !soloGame;
  const spinPhase = ladderMode
    ? (level - 1) % 3
    : soloGame === "pipe"
      ? 1
      : soloGame === "ice"
        ? 2
        : 0;

  const seed =
    level * 91921 +
    spinPhase * 17 +
    (soloGame ? soloGame.charCodeAt(0) : 0) +
    (ladderMode ? 0 : 9000);

  const rnd = useMemo(() => lcg(seed), [seed]);

  const szFlow = Math.min(8, Math.max(5, 5 + ((level / 3) | 0)));
  const pairCount = Math.min(4, Math.max(2, 2 + (level % 3)));

  const dots = useMemo(
    () => generateFlowDots(rnd, szFlow, pairCount),
    [rnd, szFlow, pairCount]
  );

  const pipeSz = Math.min(8, Math.max(5, 6 + ((level >> 2) % 3)));
  const pipeBoardSeed = seed + 3;
  const pipeRng = useMemo(() => lcg(pipeBoardSeed), [pipeBoardSeed]);
  const pipeBoard = useMemo(
    () => generatePipeBoard(pipeRng, pipeSz),
    [pipeRng, pipeSz]
  );

  const iceSz = Math.min(10, Math.max(6, 6 + (level % 4)));
  const iceBoard = useMemo(
    () => generateIceBoard(lcg(seed + 900), iceSz, level),
    [seed, iceSz, level]
  );

  const [paths, setPaths] = useState([]);
  useEffect(() => {
    setPaths(dots.map((d) => [{ x: d.sx, y: d.sy }]));
  }, [dots, spinPhase, level]);

  const [rots, setRots] = useState(() =>
    pipeBoard.rots.map((row) => row.slice())
  );
  useEffect(() => {
    setRots(pipeBoard.rots.map((row) => row.slice()));
  }, [pipeBoard]);

  const [icePos, setIcePos] = useState(() => ({
    x: iceBoard.px,
    y: iceBoard.py,
  }));
  useEffect(() => {
    setIcePos({ x: iceBoard.px, y: iceBoard.py });
  }, [iceBoard]);

  const [taps, setTaps] = useState(0);
  const [floorsDone, setFloorsDone] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flowRedoSpend, setFlowRedoSpend] = useState(0);
  const [pipeRedoSpend, setPipeRedoSpend] = useState(0);
  const [iceRedoSpend, setIceRedoSpend] = useState(0);

  const lastPipeRef = useRef(null);
  const iceHistRef = useRef([]);
  const chDoneRef = useRef(false);

  useEffect(() => {
    /** reset redo counters each stage surface */
    setFlowRedoSpend(0);
    setPipeRedoSpend(0);
    setIceRedoSpend(0);
    lastPipeRef.current = null;
    iceHistRef.current = [];
    setTaps(0);
  }, [spinPhase, level, iceBoard]);

  const flowRb = redoLab && flowRedoSpend < 1 ? 1 : 0;
  const pipeRb = redoLab && pipeRedoSpend < 1 ? 1 : 0;
  const iceRb = redoLab && iceRedoSpend < 1 ? 1 : 0;

  const quit = async () => {
    await logPuzzleTelemetry({
      type: ladderMode ? "PUZZLE_LADDER" : "PUZZLE_SOLO_METRIC",
      runId: runIdRef.current,
      ladderLevel: level,
      phase: spinPhase,
      taps,
      abandoned: true,
      floorsWon: floorsDone,
      seed,
    });
    router.back();
  };

  /** advance after win log */
  const advance = async () => {
    const nextFloors = floorsDone + 1;
    setFloorsDone(nextFloors);
    await submitArcadeScore(
      "arcade_puzzle_ladder",
      level * 62 + nextFloors * 19 + spinPhase * 3,
      {
        difficulty: spinPhase === 0 ? "flow" : spinPhase === 1 ? "pipe" : "ice",
      }
    );

    /** challenge check against nextFloors locally */
    if (challengeId && ladderMode && !chDoneRef.current) {
      const need = Number.isFinite(chFloorsRaw) ? chFloorsRaw : 0;
      if (need > 0 && nextFloors >= need) {
        chDoneRef.current = true;
        try {
          await softAcceptChallenge(challengeId);
          Alert.alert("Challenge", `Beat ${need} ladder stage(s)!`);
        } catch (e) {
          Alert.alert("Challenge", String(e?.message || e));
        }
      }
    }

    setLevel((L) => L + 1);
  };

  const onFlowTap = (x, y) => {
    if (paused) return;
    const dk = `lflow_${runIdRef.current}_${level}_${x}_${y}`;
    studyDecisionStart(dk);
    setTaps((t) => t + 1);

    const occ = buildOcc(dots, paths);
    const ai = flowActivePairIndex(dots, paths);
    if (ai < 0) {
      void studyDecisionEnd(dk, { ok: false, ladder: true });
      return;
    }
    const dot = dots[ai];
    const chain = paths[ai].slice();
    const last = chain[chain.length - 1];

    if (x === dot.sx && y === dot.sy && chain.length > 2) {
      const nx = [...paths];
      nx[ai] = [{ x: dot.sx, y: dot.sy }];
      setPaths(nx);
      void studyDecisionEnd(dk, { ok: true, resetStart: true });
      return;
    }

    const man = Math.abs(x - last.x) + Math.abs(y - last.y);
    if (man !== 1) {
      void studyDecisionEnd(dk, { ok: false });
      return;
    }

    const k = `${x}:${y}`;
    if (occ[k] !== undefined && Number(occ[k]) !== ai) {
      void studyDecisionEnd(dk, { ok: false });
      return;
    }

    chain.push({ x, y });
    const nx = [...paths];
    nx[ai] = chain;
    setPaths(nx);
    void studyDecisionEnd(dk, { ok: true });

    if (flowActivePairIndex(dots, nx) === -1) {
      const filled = Object.keys(buildOcc(dots, nx)).length >= szFlow * szFlow;
      void logPuzzleTelemetry({
        type: "PUZZLE_SOLO_METRIC",
        runId: runIdRef.current,
        ladderLevel: level,
        phase: spinPhase,
        solo: soloGame || "flow",
        seed,
        taps: taps + 1,
        won: true,
        redoUsedStage: flowRedoSpend,
        redoBudgetStart: redoLab ? 1 : 0,
        fillsAll: filled,
        gameKey: `flow_${level}`,
      });
      if (ladderMode) {
        void logPuzzleTelemetry({
          type: "PUZZLE_LADDER",
          runId: runIdRef.current,
          ladderLevel: level,
          phase: spinPhase,
          seed,
          taps: taps + 1,
          won: true,
        });
      }
      void advance();
    }
  };

  const onFlowRedo = () => {
    if (!flowRb || paused) return;
    setFlowRedoSpend(1);
    const ai = flowActivePairIndex(dots, paths);
    if (ai < 0) return;
    const ch = paths[ai];
    if (ch.length <= 1) return;
    const nx = [...paths];
    nx[ai] = ch.slice(0, -1);
    setPaths(nx);
    setTaps((t) => t + 1);
  };

  const onPipeTap = (x, y) => {
    if (paused) return;
    const dk = `lpipe_${runIdRef.current}_${x}_${y}_${level}`;
    studyDecisionStart(dk);
    setTaps((t) => t + 1);
    lastPipeRef.current = { x, y, prev: rots[y][x] };

    const next = rots.map((row, ry) =>
      ry === y ? row.map((v, cx) => (cx === x ? (v + 1) % 4 : v)) : row.slice()
    );
    setRots(next);
    studyDecisionEnd(dk, { rotations: taps + 1 });

    const boardLive = {
      bases: pipeBoard.bases,
      rots: next,
      sz: pipeBoard.sz,
    };
    if (pipeConnectsGoals(boardLive)) {
      void logPuzzleTelemetry({
        type: "PUZZLE_SOLO_METRIC",
        solo: soloGame || "pipe",
        runId: runIdRef.current,
        ladderLevel: level,
        phase: spinPhase,
        rotations: taps + 1,
        seed,
        won: true,
        gameKey: `pipe_${level}`,
      });
      if (ladderMode) {
        void logPuzzleTelemetry({
          type: "PUZZLE_LADDER",
          runId: runIdRef.current,
          ladderLevel: level,
          phase: spinPhase,
          taps: taps + 1,
          won: true,
          rotations: taps + 1,
          seed,
        });
      }
      void advance();
    }
  };

  const onPipeRedo = () => {
    if (!pipeRb || !lastPipeRef.current || paused) return;
    setPipeRedoSpend(1);
    const { x: px, y: py, prev } = lastPipeRef.current;
    const next = rots.map((row, ry) =>
      ry === py ? row.map((v, cx) => (cx === px ? prev : v)) : row.slice()
    );
    setRots(next);
    lastPipeRef.current = null;
    setTaps((t) => t + 1);
  };

  const onIceSlide = (dir) => {
    if (paused) return;
    const dk = `lice_${runIdRef.current}_${level}_${dir}`;
    studyDecisionStart(dk);
    iceHistRef.current.push({ ...icePos });
    const nextPos = iceSlide(iceBoard, icePos.x, icePos.y, dir);
    setIcePos(nextPos);
    setTaps((t) => t + 1);
    studyDecisionEnd(dk, { ok: true });

    if (nextPos.x === iceBoard.gx && nextPos.y === iceBoard.gy) {
      void logPuzzleTelemetry({
        type: "PUZZLE_SOLO_METRIC",
        solo: soloGame || "ice",
        runId: runIdRef.current,
        ladderLevel: level,
        phase: spinPhase,
        slides: taps + 1,
        seed,
        won: true,
        gameKey: `ice_${level}`,
      });
      if (ladderMode) {
        void logPuzzleTelemetry({
          type: "PUZZLE_LADDER",
          runId: runIdRef.current,
          ladderLevel: level,
          phase: spinPhase,
          slides: taps + 1,
          won: true,
          seed,
        });
      }
      void advance();
    }
  };

  const onIceRedo = () => {
    if (!iceRb || paused || iceHistRef.current.length === 0) return;
    setIceRedoSpend(1);
    const prev = iceHistRef.current.pop();
    if (!prev) return;
    setIcePos(prev);
    setTaps((t) => t + 1);
  };

  if (gate.loading) return <PlayEntitlementSplash entitlementId="arcade" />;
  if (!gate.ok)
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.muted}>Play limit</Text>
      </SafeAreaView>
    );

  const cell = Math.floor(300 / szFlow);

  const flowOcc = spinPhase === 0 ? buildOcc(dots, paths) : null;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPaused(!paused)}>
            <Text style={s.link}>{paused ? "Resume" : "Pause"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.h1}>Dissertation ladder</Text>
        <Text style={s.meta}>
          {ladderMode ? `Rotation ladder · stage ${level}` : `Solo puzzle · ${soloGame}`} ·{" "}
          {spinPhase === 0 ? "Cell flow" : spinPhase === 1 ? "Spin pipes" : "Ice glide"}
          {!redoLab ? " · Control (no redo assist)" : " · Treatment redo budgets"}
          {challengeId ? ` · challenge ≥${Number.isFinite(chFloorsRaw) ? chFloorsRaw : "?"} clears` : ""}
        </Text>
        <Text style={s.muted}>Run {runIdRef.current.slice(-8)} · floors won {floorsDone}</Text>

        {paused ? (
          <Text style={s.banner}>Paused — counters frozen for hesitation logging.</Text>
        ) : null}

        {spinPhase === 0 && flowOcc ? (
          <>
            <View style={[s.grid, { width: szFlow * cell + 8, alignSelf: "center" }]}>
              {Array.from({ length: szFlow * szFlow }).map((_, ix) => {
                const gx = ix % szFlow;
                const gy = (ix / szFlow) | 0;
                const oi = flowOcc[`${gx}:${gy}`];
                const isPath = typeof oi === "number";
                const ep = dots.find(
                  (d) =>
                    (d.sx === gx && d.sy === gy) || (d.gx === gx && d.gy === gy)
                );
                let fill;
                if (ep) fill = "rgba(30,64,120,0.96)";
                else if (isPath) fill = "rgba(34,211,238,0.42)";
                else
                  fill =
                    (gx + gy) % 2
                      ? "rgba(38,76,138,0.92)"
                      : "rgba(25,62,126,0.85)";
                return (
                  <TouchableOpacity
                    key={`${gx}-${gy}`}
                    style={[
                      s.cell,
                      {
                        width: cell - 2,
                        height: cell - 2,
                        backgroundColor: fill,
                      },
                    ]}
                    onPress={() => onFlowTap(gx, gy)}
                  >
                    {ep ? (
                      <View style={[s.epChip, { backgroundColor: PAL[ep.id % PAL.length] }]} />
                    ) : (
                      ""
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.meta, { alignSelf: "center", marginTop: 6 }]}>
              Join adjacent squares from each colour’s start dot. Tap start anchor to rewind that strand.
              {redoLab ? " · One redo per stage frees a mis-tap." : ""}
            </Text>
            {flowRb ? (
              <TouchableOpacity style={s.redo} onPress={onFlowRedo}>
                <Text style={s.redoT}>Lab redo (≤1)</Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.mutedTiny}>Redo assist off (cohort A)</Text>
            )}
          </>
        ) : null}

        {spinPhase === 1 ? (
          <View style={[s.grid, { width: pipeSz * 44 }]}>
            {Array.from({ length: pipeSz * pipeSz }).map((_, ix) => {
              const gx = ix % pipeSz;
              const gy = (ix / pipeSz) | 0;
              const m = openMask(pipeBoard.bases[gy][gx], rots[gy][gx]);
              return (
                <TouchableOpacity
                  key={`p-${gx}-${gy}`}
                  style={[s.pipeCell]}
                  onPress={() => onPipeTap(gx, gy)}
                >
                  <PipeGlyph mask={m} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {spinPhase === 2 ? (
          <View style={s.iceWrap}>
            <View style={[s.iceGrid, { width: iceSz * 28 }]}>
              {Array.from({ length: iceSz * iceSz }).map((_, ix) => {
                const gx = ix % iceSz;
                const gy = (ix / iceSz) | 0;
                const wall = iceBoard.walls[gy][gx];
                const pl = gx === icePos.x && gy === icePos.y;
                const goal = gx === iceBoard.gx && gy === iceBoard.gy;
                return (
                  <View
                    key={`i-${gx}-${gy}`}
                    style={[
                      s.iceSq,
                      {
                        backgroundColor: wall
                          ? "#111827"
                          : goal
                            ? "rgba(34,211,238,0.25)"
                            : "rgba(30,58,138,0.55)",
                      },
                    ]}
                  >
                    <Text style={s.iceTx}>
                      {pl ? "★" : goal ? "◇" : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={s.dirRow}>
              {[
                ["n", "↑"],
                ["w", "←"],
                ["e", "→"],
                ["s", "↓"],
              ].map(([d, lbl]) => (
                <TouchableOpacity key={d} style={s.dirBtn} onPress={() => onIceSlide(d)}>
                  <Text style={s.dirLbl}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {iceRb ? (
              <TouchableOpacity style={s.redo} onPress={onIceRedo}>
                <Text style={s.redoT}>Redo last glide (≤1)</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {spinPhase === 1 && pipeRb ? (
          <TouchableOpacity style={s.redo} onPress={onPipeRedo}>
            <Text style={s.redoT}>Undo last rotation (≤1)</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={s.quitBig} onPress={() => void quit()}>
          <Text style={s.quitT}>Quit run (logs abandon)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PipeGlyph({ mask }) {
  const n = !!(mask & 1);
  const e = !!(mask & 8);
  const s = !!(mask & 4);
  const w = !!(mask & 2);
  return (
    <View style={pipeS.wrap}>
      <View style={[pipeS.line, pipeS.v, n ? pipeS.on : pipeS.off]} />
      <View style={[pipeS.line, pipeS.h, e ? pipeS.on : pipeS.off]} />
      <View style={[pipeS.line, pipeS.vBottom, s ? pipeS.on : pipeS.off]} />
      <View style={[pipeS.line, pipeS.hLeft, w ? pipeS.on : pipeS.off]} />
    </View>
  );
}

const pipeS = StyleSheet.create({
  wrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  line: { position: "absolute", backgroundColor: "#222" },
  on: { backgroundColor: "#00ffaa" },
  off: { backgroundColor: "#1e293b" },
  v: { width: 5, height: 18, top: 2 },
  vBottom: { width: 5, height: 18, bottom: 2 },
  h: { height: 5, width: 18, right: 2 },
  hLeft: { height: 5, width: 18, left: 2 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nexus.bg },
  scroll: { paddingBottom: 34 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  link: { color: Nexus.cyan, fontWeight: "800", fontSize: 15 },
  h1: { fontSize: 24, fontWeight: "900", color: Nexus.green, paddingHorizontal: 16 },
  meta: {
    paddingHorizontal: 16,
    color: Nexus.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  muted: {
    paddingHorizontal: 16,
    color: Nexus.textMuted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  mutedTiny: { paddingHorizontal: 16, fontSize: 11, color: Nexus.textMuted, marginVertical: 6 },
  banner: {
    alignSelf: "center",
    color: Nexus.magenta,
    fontWeight: "800",
    marginVertical: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    marginBottom: 6,
    alignSelf: "center",
  },
  cell: {
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    margin: 1,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDot: { width: 2, height: 2 },
  epChip: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  pipeCell: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Nexus.borderDim,
    backgroundColor: "rgba(17,38,71,0.9)",
    margin: 1,
    borderRadius: 4,
  },
  iceWrap: { paddingHorizontal: 16, alignItems: "center", marginTop: 8 },
  iceGrid: { flexDirection: "row", flexWrap: "wrap", marginVertical: 8 },
  iceSq: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#334155",
  },
  iceTx: { color: Nexus.text, fontSize: 12 },
  dirRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  dirBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,212,255,0.2)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Nexus.cyan,
  },
  dirLbl: { color: Nexus.cyan, fontSize: 20, fontWeight: "900" },
  redo: {
    alignSelf: "center",
    marginVertical: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Nexus.green,
    backgroundColor: "rgba(0,255,136,0.1)",
  },
  redoT: { color: Nexus.green, fontWeight: "900" },
  quitBig: { marginTop: 20, alignSelf: "center", padding: 14 },
  quitT: { color: Nexus.pink, fontWeight: "800" },
});
