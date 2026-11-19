import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApi } from '@/services/core';
import { preferencesService } from '@/services';
import type { UserPreferences } from '@/types/models';

interface PrefsCtx {
  prefs: UserPreferences;
  setPrefs: (p: UserPreferences) => Promise<void>;
}

const Ctx = createContext<PrefsCtx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<UserPreferences>(() => preferencesService.get());

  const account = useRef<string | null>(null);
  const loadVersion = useRef(0);
  useEffect(() => {
    const load = (event: Event) => {
      account.current = (event as CustomEvent<{id:string}>).detail.id;
      const version = ++loadVersion.current;
      void preferencesService.load().then(value => { if (loadVersion.current === version) setState(value); }).catch(() => {});
    };
    window.addEventListener('firewalldo:authenticated', load);
    return () => window.removeEventListener('firewalldo:authenticated', load);
  }, []);

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

  const setPrefs = async (p: UserPreferences) => {
    if (useApi() && !account.current) throw new Error('Entre na sua conta para salvar as preferências.');
    const currentAccount = account.current;
    const saved = await preferencesService.save(p);
    if (account.current === currentAccount) setState(saved);
  };

  return <Ctx.Provider value={{ prefs, setPrefs }}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs fora do PrefsProvider');
  return c;
}
