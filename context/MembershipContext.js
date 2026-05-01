import {
  ENTITLEMENT_LABELS,
  FREE_LAUNCHES_PER_GAME,
  MEMBERSHIP_INTERVAL,
  MEMBERSHIP_PRICE_GBP,
  activateDemoMembership as activateDemoPersist,
  clearDemoMembership as clearDemoPersist,
  consumeLaunch,
  currentAccountKey,
  isMembershipActiveLoaded,
  loadMembershipState,
  resetFreeRounds as resetFreeRoundsPersist,
} from "@/lib/membership";
import { auth } from "@/constants/firebase";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** @typedef {{ rounds: Record<string, number>, demoUntil: number|null, demo: boolean }} MState */

const Ctx = createContext(null);

export function MembershipProvider({ children }) {
  const [ready, setReady] = useState(false);
  /** @type {[MState|null, function]} */
  const [snap, setSnap] = useState(null);
  const [accountKey, setAccountKey] = useState("");

  const refresh = useCallback(async () => {
    const k = await currentAccountKey(auth.currentUser?.uid);
    const st = await loadMembershipState(k);
    setSnap(st);
    setAccountKey(k);
    setReady(true);
    return { accountKey: k, ...st };
  }, []);

  useEffect(() => {
    void refresh();
    const u = auth.onAuthStateChanged(() => void refresh());
    return () => u();
  }, [refresh]);

  const memberActive = snap ? isMembershipActiveLoaded(snap) : false;

  const isMember = useCallback(() => memberActive, [memberActive]);

  const launchesUsed = useCallback(
    (entitlementId) => {
      if (!snap) return 0;
      const id = String(entitlementId || "");
      const v = snap.rounds[id];
      return typeof v === "number" ? v : 0;
    },
    [snap]
  );

  const launchesRemaining = useCallback(
    (entitlementId) => {
      if (memberActive) return Infinity;
      if (!snap) return FREE_LAUNCHES_PER_GAME;
      return Math.max(0, FREE_LAUNCHES_PER_GAME - launchesUsed(entitlementId));
    },
    [memberActive, snap, launchesUsed]
  );

  const tryLaunch = useCallback(
    async (entitlementId) => {
      const k = await currentAccountKey(auth.currentUser?.uid);
      const r = await consumeLaunch(entitlementId, k);
      await refresh();
      return r.ok ? { ok: true } : { ok: false, entitlementId: r.entitlementId };
    },
    [refresh]
  );

  const unlockDemoMembership = useCallback(async () => {
    const k = await currentAccountKey(auth.currentUser?.uid);
    await activateDemoPersist(k);
    await refresh();
  }, [refresh]);

  const clearDemoMembership = useCallback(async () => {
    const k = await currentAccountKey(auth.currentUser?.uid);
    await clearDemoPersist(k);
    await refresh();
  }, [refresh]);

  const resetCountersForDissertationDemo = useCallback(async () => {
    const k = await currentAccountKey(auth.currentUser?.uid);
    await resetFreeRoundsPersist(k);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () =>
      ({
        ready,
        accountKey,
        priceDisplay: MEMBERSHIP_PRICE_GBP,
        intervalLabel: MEMBERSHIP_INTERVAL,
        entitlementLabels: ENTITLEMENT_LABELS,
        snap,
        demoExpiresAt: snap?.demoUntil ?? null,
        isMember,
        launchesUsed,
        launchesRemaining,
        tryLaunch,
        unlockDemoMembership,
        clearDemoMembership,
        resetCountersForDissertationDemo,
        refresh,
      }),
    [
      ready,
      accountKey,
      snap,
      isMember,
      launchesUsed,
      launchesRemaining,
      tryLaunch,
      unlockDemoMembership,
      clearDemoMembership,
      resetCountersForDissertationDemo,
      refresh,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMembership() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMembership must be inside MembershipProvider");
  return v;
}
