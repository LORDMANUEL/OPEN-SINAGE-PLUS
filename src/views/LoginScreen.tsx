import { useState, type FormEvent } from 'react';
import { useAppContext } from '../context/app-context';

export default function LoginScreen() {
  const { handleLogin } = useAppContext();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const onLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleLogin(loginForm.email, loginForm.password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">🖥️</div>
          <h1 className="text-4xl font-bold text-white">Open Signage Plus</h1>
          <p className="mt-2 text-cyan-200">Xibo + PWA + automatización + IA</p>
        </div>

        <form onSubmit={onLogin} className="space-y-6 rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div>
            <label htmlFor="email" className="mb-2 block font-semibold text-white">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={loginForm.email}
              onChange={event => setLoginForm(current => ({ ...current, email: event.target.value }))}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/50 focus:border-cyan-300"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block font-semibold text-white">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={loginForm.password}
              onChange={event => setLoginForm(current => ({ ...current, password: event.target.value }))}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/50 focus:border-cyan-300"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 text-lg font-bold text-white shadow-lg transition hover:scale-[1.02]">
            Iniciar sesión
          </button>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
            <p>Demo administrador: admin@empresa.com / admin123</p>
            <p className="mt-1">Demo marketing: marketing@empresa.com / marketing123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
