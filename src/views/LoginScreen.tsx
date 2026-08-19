import { useState, type FormEvent } from 'react';
import { LoaderCircle, MonitorPlay, ShieldCheck, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/app-context';

export default function LoginScreen() {
  const { handleLogin } = useAppContext();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const ok = await handleLogin(loginForm.email, loginForm.password);
    if (!ok) setError('Correo o contraseña incorrectos.');
    setBusy(false);
  };

  return <div className="login-page">
    <section className="login-hero">
      <div className="brand-mark"><MonitorPlay size={31} /></div>
      <span className="eyebrow eyebrow--light">OPEN SIGNAGE PLUS</span>
      <h1>Señalización digital simple por fuera. Potente por dentro.</h1>
      <p>Xibo como motor, nuestra PWA como experiencia, y una capa para IA, QR, tickets, HTML y pantallas táctiles.</p>
      <div className="login-features"><span><ShieldCheck size={18} /> Sesión firmada y credenciales Xibo solo en servidor</span><span><Sparkles size={18} /> IA local o por API</span><span><MonitorPlay size={18} /> Navegador primero</span></div>
    </section>
    <section className="login-card-wrap">
      <form onSubmit={event => void onLogin(event)} className="login-card">
        <div><span className="eyebrow">ACCESO SEGURO</span><h2>Bienvenido</h2><p>Usa las credenciales administrativas definidas durante la instalación.</p></div>
        <label>Email<input id="email" type="email" required autoComplete="username" value={loginForm.email} onChange={event => setLoginForm(current => ({ ...current, email: event.target.value }))} placeholder="admin@empresa.com" /></label>
        <label>Contraseña<input id="password" type="password" required autoComplete="current-password" value={loginForm.password} onChange={event => setLoginForm(current => ({ ...current, password: event.target.value }))} placeholder="••••••••••••" /></label>
        <button type="submit" className="button button--primary button--wide" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : null} Iniciar sesión</button>
        {error && <div className="notice notice--error">{error}</div>}
      </form>
    </section>
  </div>;
}
