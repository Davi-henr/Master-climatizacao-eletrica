'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Password change state
  const [needPasswordChange, setNeedPasswordChange] = useState(false);
  const [funcId, setFuncId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Admin login
    if (username === 'MasterEletrica' && password === 'Master123') {
      document.cookie = 'master_auth=true; path=/; max-age=86400';
      document.cookie = 'master_role=admin; path=/; max-age=86400';
      document.cookie = 'master_func_id=admin; path=/; max-age=86400';
      router.push('/');
      router.refresh();
      return;
    }

    // Funcionario login
    try {
      const { data, error: sbError } = await supabase
        .from('funcionarios')
        .select('id, nome, senha')
        .ilike('nome', username.trim())
        .maybeSingle();
        
      if (sbError || !data || data.senha !== password.trim()) {
        setError('Usuário ou senha inválidos.');
        setLoading(false);
        return;
      }

      if (password === '123456') {
        setNeedPasswordChange(true);
        setFuncId(data.id);
        setLoading(false);
        return;
      }

      // Success for Funcionario
      document.cookie = 'master_auth=true; path=/; max-age=86400';
      document.cookie = 'master_role=funcionario; path=/; max-age=86400';
      document.cookie = `master_func_id=${data.id}; path=/; max-age=86400`;
      router.push('/');
      router.refresh();

    } catch (err) {
      setError('Erro ao conectar com o servidor.');
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const { error: updateError } = await supabase
      .from('funcionarios')
      .update({ senha: newPassword })
      .eq('id', funcId);
      
    if (updateError) {
      setError('Erro ao atualizar a senha. Tente novamente.');
      setLoading(false);
      return;
    }

    // Success
    document.cookie = 'master_auth=true; path=/; max-age=86400';
    document.cookie = 'master_role=funcionario; path=/; max-age=86400';
    document.cookie = `master_func_id=${funcId}; path=/; max-age=86400`;
    router.push('/');
    router.refresh();
  };
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

        {needPasswordChange ? (
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-xl mx-auto flex items-center justify-center mb-4">
                <ShieldAlert size={32} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Troca Obrigatória de Senha</h3>
              <p className="text-sm text-slate-500 mt-1">Como este é o seu primeiro acesso, você deve criar uma nova senha por segurança.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors outline-none"
                  placeholder="Digite sua nova senha"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-blue hover:bg-blue-700 text-white font-medium rounded-lg shadow-md shadow-brand-blue/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar e Entrar'}
            </button>
          </form>
        ) : (
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
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-blue hover:bg-blue-700 text-white font-medium rounded-lg shadow-md shadow-brand-blue/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
