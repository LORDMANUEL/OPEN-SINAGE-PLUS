import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const LoginScreen = () => {
  const { handleLogin, users } = useAppContext();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const onLogin = (e) => {
    e.preventDefault();
    handleLogin(loginForm.email, loginForm.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🖥️</div>
          <h1 className="text-4xl font-bold text-white mb-2">Digital Signage PRO</h1>
          <p className="text-purple-200">Sistema Enterprise con IA</p>
        </div>
        <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-white font-semibold mb-2">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && onLogin(e)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                placeholder="usuario@empresa.com"
              />
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">Contraseña</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && onLogin(e)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={onLogin}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Iniciar Sesión
            </button>
          </div>
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/70 text-sm mb-2">Usuarios de prueba:</p>
            <p className="text-white text-xs">👨‍💻 Admin IT: admin@empresa.com / admin123</p>
            <p className="text-white text-xs">👩‍💼 Marketing: marketing@empresa.com / marketing123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
