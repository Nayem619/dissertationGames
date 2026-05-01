import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { INITIAL_PREFS, loadPreferences, savePreferences as persist } from "@/lib/preferences";

const Ctx = createContext({
  prefs: INITIAL_PREFS,
  ready: false,
  refresh: async () => {},
  save: async (_p) => {},
});

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(null);

  const refresh = useCallback(async () => {
    const p = await loadPreferences();
    setPrefs(p);
    return p;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (partial) => {
      const next = await persist(partial);
      setPrefs(next);
      return next;
    },
    []
  );

  const value = useMemo(
    () => ({
      prefs: prefs ?? INITIAL_PREFS,
      ready: prefs != null,
      refresh,
      save,
    }),
    [prefs, refresh, save]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppPrefs() {
  return useContext(Ctx);
}
