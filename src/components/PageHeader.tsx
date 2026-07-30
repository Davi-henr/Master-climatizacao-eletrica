'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PageHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  const [logo, setLogo] = useState<string | null>(null);

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

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-3">
        {logo && <img src={logo} alt="Logo" className="h-10 object-contain drop-shadow-sm" />}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{title}</h1>
      </div>
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-orange via-brand-yellow to-transparent rounded-full mb-2 opacity-90"></div>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}
