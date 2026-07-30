'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'MasterEletrica' && password === 'Master123') {
      document.cookie = 'master_auth=true; path=/; max-age=86400';
      router.push('/');
      router.refresh();
    } else {
      setError('Usuário ou senha inválidos.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-orange text-white rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-brand-orange/30 mb-4">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Master Climatização</h2>
          <p className="text-slate-500 mt-2">Acesso ao Sistema de Gestão</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors outline-none"
                  placeholder="Seu usuário"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors outline-none"
                  placeholder="Sua senha"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-brand-blue hover:bg-blue-700 text-white font-medium rounded-lg shadow-md shadow-brand-blue/20 transition-colors focus:ring-4 focus:ring-brand-blue/30 outline-none"
          >
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
}
