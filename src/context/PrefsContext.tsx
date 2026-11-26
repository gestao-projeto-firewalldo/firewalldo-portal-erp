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
    // V1.1.19: "Seguir o sistema" saiu. Contas que ainda tinham essa opção salva usam o Escuro.
    // Misto: conteúdo no tema claro e moldura (menu lateral + topo) no escuro.
    root.dataset.theme = prefs.theme === 'hybrid' || prefs.theme === 'light' ? 'light' : 'dark';
    if (prefs.theme === 'hybrid') root.dataset.chrome = 'dark';
    else delete root.dataset.chrome;
    root.dataset.motion = prefs.reducedMotion ? 'reduced' : 'full';
  }, [prefs.theme, prefs.reducedMotion]);

  /** Aplica na hora (tema muda imediatamente) e salva na conta; se falhar, volta ao valor anterior. */
  const setPrefs = async (p: UserPreferences) => {
    if (useApi() && !account.current) throw new Error('Entre na sua conta para salvar as preferências.');
    const currentAccount = account.current;
    const previous = prefs;
    const version = ++loadVersion.current;
    setState(p);
    try {
      const saved = await preferencesService.save(p);
      if (account.current === currentAccount && loadVersion.current === version) setState(saved);
    } catch (error) {
      if (account.current === currentAccount && loadVersion.current === version) setState(previous);
      throw error;
    }
  };

  return <Ctx.Provider value={{ prefs, setPrefs }}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs fora do PrefsProvider');
  return c;
}
