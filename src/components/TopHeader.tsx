'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function TopHeader() {
  const [logo, setLogo] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'logo_base64')
        .single();
        
      if (!error && data?.valor) {
        setLogo(data.valor);
      }
    } catch (e) {
      console.error('Sem logo cadastrada');
    }
  };

  const handleLogout = () => {
    document.cookie = 'master_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-50">
      <div className="flex items-center gap-2">
        {logo ? (
          <img src={logo} alt="Logo da Empresa" className="h-10 max-w-[120px] object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-brand-orange text-white flex items-center justify-center font-black">
              M
            </span>
            <span className="font-bold text-slate-800 tracking-tight leading-tight">
              Master<br/><span className="text-[10px] text-slate-500 uppercase">Climatização</span>
            </span>
          </div>
        )}
      </div>

      <button 
        onClick={handleLogout}
        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
      >
        <LogOut size={22} />
      </button>
    </header>
  );
}
