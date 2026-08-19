import { useState, type FormEvent } from 'react';
import { MonitorPlay, ShieldCheck, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/app-context';

export default function LoginScreen() {
  const { handleLogin } = useAppContext();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const onLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleLogin(loginForm.email, loginForm.password);
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="brand-mark"><MonitorPlay size={31} /></div>
        <span className="eyebrow eyebrow--light">OPEN SIGNAGE PLUS</span>
        <h1>Señalización digital simple por fuera. Potente por dentro.</h1>
        <p>Xibo como motor, nuestra PWA como experiencia, y una capa preparada para IA, QR, tickets, HTML y pantallas táctiles.</p>
        <div className="login-features">
          <span><ShieldCheck size={18} /> Credenciales Xibo solo en servidor</span>
          <span><Sparkles size={18} /> IA local o por API</span>
          <span><MonitorPlay size={18} /> Navegador primero</span>
        </div>
      </section>

      <section className="login-card-wrap">
        <form onSubmit={onLogin} className="login-card">
          <div><span className="eyebrow">ACCESO</span><h2>Bienvenido</h2><p>Administra contenido y pantallas desde un solo lugar.</p></div>
          <label>Email<input id="email" type="email" required autoComplete="username" value={loginForm.email} onChange={event => setLoginForm(current => ({ ...current, email: event.target.value }))} placeholder="usuario@empresa.com" /></label>
          <label>Contraseña<input id="password" type="password" required autoComplete="current-password" value={loginForm.password} onChange={event => setLoginForm(current => ({ ...current, password: event.target.value }))} placeholder="••••••••" /></label>
          <button type="submit" className="button button--primary button--wide">Iniciar sesión</button>
          <div className="demo-box"><strong>Acceso de demostración</strong><span>admin@empresa.com · admin123</span><span>marketing@empresa.com · marketing123</span></div>
        </form>
      </section>
    </div>
  );
}
