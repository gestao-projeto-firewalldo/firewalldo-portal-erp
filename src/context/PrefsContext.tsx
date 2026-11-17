import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { preferencesService } from '@/services';
import type { UserPreferences } from '@/types/models';

interface PrefsCtx {
  prefs: UserPreferences;
  setPrefs: (p: UserPreferences) => void;
}

const Ctx = createContext<PrefsCtx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<UserPreferences>(() => preferencesService.get());

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      root.dataset.theme = prefs.theme === 'system' ? sys : prefs.theme;
    };
    apply();
    root.dataset.motion = prefs.reducedMotion ? 'reduced' : 'full';
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [prefs.theme, prefs.reducedMotion]);

  const setPrefs = (p: UserPreferences) => {
    setState(p);
    preferencesService.save(p);
  };

  return <Ctx.Provider value={{ prefs, setPrefs }}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs fora do PrefsProvider');
  return c;
}
