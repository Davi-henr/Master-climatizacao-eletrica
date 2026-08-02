'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PageHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const cachedLogo = sessionStorage.getItem('master_logo');
    if (cachedLogo) {
      setLogo(cachedLogo);
      return;
    }
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'logo_base64').single();
    if (data?.valor) {
      setLogo(data.valor);
      sessionStorage.setItem('master_logo', data.valor);
    }
  };

  const handleLogout = () => {
    document.cookie = 'master_auth=; path=/; max-age=0';
    document.cookie = 'master_role=; path=/; max-age=0';
    document.cookie = 'master_func_id=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          {logo && <img src={logo} alt="Logo" className="h-10 object-contain drop-shadow-sm" />}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{title}</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          title="Sair do sistema"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-orange via-brand-yellow to-transparent rounded-full mb-2 opacity-90"></div>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}
