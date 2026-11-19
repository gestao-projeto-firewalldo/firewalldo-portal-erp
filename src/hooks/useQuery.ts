import { useCallback, useEffect, useRef, useState } from 'react';
import { mockDb } from '@/services';

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Busca dados de um serviço e expõe os estados de carregamento, erro e dados.
 * Primeira carga mostra `loading`; mudanças locais posteriores (mockDb) recarregam
 * em segundo plano, sem piscar a tela.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = [], refreshMs = 60_000): QueryState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback((silent: boolean) => {
    const id = ++seq.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    fnRef
      .current()
      .then((d) => {
        if (id !== seq.current) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => {
        if (id !== seq.current) return;
        setError(e);
      })
      .finally(() => {
        if (id === seq.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => mockDb.subscribe(() => run(true)), [run]);
  useEffect(() => {
    const refresh = () => { if(document.visibilityState === 'visible') run(true); };
    window.addEventListener('focus',refresh);
    const timer=window.setInterval(refresh,refreshMs);
    return ()=>{window.removeEventListener('focus',refresh);window.clearInterval(timer);};
  },[run,refreshMs]);

  return { data, loading, error, refetch: () => run(false) };
}

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = () => setMatch(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [query]);
  return match;
}
