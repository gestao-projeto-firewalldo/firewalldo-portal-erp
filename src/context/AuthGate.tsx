import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Logo } from '@/components/ui';
import { http, ServiceError, useApi } from '@/services/core';

export const sessionExpired = 'firewalldo:session-expired';

export function AuthGate({ children }: { children: ReactNode }) {
  if (!useApi()) return children;
  return <PortalLogin>{children}</PortalLogin>;
}

function PortalLogin({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<'checking' | 'ready' | 'login' | 'error'>('checking');
  const [invite, setInvite] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('convite') ?? '');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checkSession = async () => {
    setSession('checking');
    try {
      const member = await http.get<{id:string}>('/auth/me');
      window.dispatchEvent(new CustomEvent('firewalldo:authenticated', {detail:member}));
      setSession('ready');
    } catch (err) {
      setSession(err instanceof ServiceError && err.code === 'UNAUTHENTICATED' ? 'login' : 'error');
    }
  };

  useEffect(() => {
    if (!invite) void checkSession();
    const expire = () => setSession('login');
    window.addEventListener(sessionExpired, expire);
    return () => window.removeEventListener(sessionExpired, expire);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (invite && senha !== confirmacao) {
      setError('As senhas precisam ser iguais.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (invite) {
        await http.post('/auth/activate', { token: invite, senha });
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        setInvite('');
        setSession('login');
        setMessage('Senha criada. Entre com seu e-mail e a nova senha.');
      } else {
        const result = await http.post<{user:{id:string}}>('/auth/login', { email, senha });
        window.dispatchEvent(new CustomEvent('firewalldo:authenticated', {detail:result.user}));
        setSession('ready');
      }
      setSenha('');
      setConfirmacao('');
    } catch (err) {
      setError(err instanceof ServiceError ? err.message : 'Não foi possível conectar ao portal. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  if (!invite && session === 'ready') return children;

  return (
    <main className="auth-screen">
      <div className="card auth-card">
        <div className="row auth-brand"><Logo /> <strong>Firewalldo</strong></div>
        <h1>{invite ? 'Crie sua senha' : 'Portal de desenvolvimento'}</h1>
        {!invite && session === 'checking' ? <p role="status">Verificando a sessão…</p>
          : !invite && session === 'error' ? (
            <>
              <p role="alert">O portal está indisponível no momento.</p>
              <button className="btn primary" onClick={checkSession}>Tentar novamente</button>
            </>
          ) : (
            <form onSubmit={submit} className="auth-form">
              {message && <p role="status" className="muted">{message}</p>}
              {!invite && (
                <div className="field">
                  <label htmlFor="login-email">E-mail</label>
                  <input className="input" id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              )}
              <div className="field">
                <label htmlFor="login-password">{invite ? 'Nova senha (mínimo de 12 caracteres)' : 'Senha'}</label>
                <PasswordInput id="login-password" autoComplete={invite ? 'new-password' : 'current-password'} minLength={invite ? 12 : undefined} maxLength={128} required value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              {invite && (
                <div className="field">
                  <label htmlFor="login-confirm">Confirme a senha</label>
                  <PasswordInput id="login-confirm" autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
                </div>
              )}
              {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button className="btn primary lg" type="submit" disabled={busy}>
                {busy ? 'Aguarde…' : invite ? 'Criar senha' : 'Entrar'}
              </button>
            </form>
          )}
      </div>
    </main>
  );
}
