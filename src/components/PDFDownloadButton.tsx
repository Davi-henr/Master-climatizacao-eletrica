'use client';

import dynamic from 'next/dynamic';
import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BudgetPDF } from './BudgetPDF';
import { supabase } from '@/lib/supabase';

// Dynamically import PDFDownloadLink to prevent SSR issues
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <button className="text-slate-300 p-2"><FileText size={18} /></button> }
);

export default function PDFDownloadButton({ orcamento }: { orcamento: any }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchLogo = async () => {
      const cached = sessionStorage.getItem('master_logo');
      if (cached) {
        setLogo(cached);
        return;
      }
      const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'logo_base64').single();
      if (data?.valor) {
        setLogo(data.valor);
        sessionStorage.setItem('master_logo', data.valor);
      }
    };
    fetchLogo();
  }, []);

  if (!mounted) return <button className="text-slate-300 p-2"><FileText size={18} /></button>;

  return (
    <PDFDownloadLink
      document={<BudgetPDF orcamento={orcamento} logo={logo} />}
      fileName={`Orcamento-${orcamento.clientes?.nome || 'Cliente'}.pdf`}
      className="text-brand-blue hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors inline-block"
      title="Baixar PDF"
    >
      <FileText size={18} />
    </PDFDownloadLink>
  );
}
