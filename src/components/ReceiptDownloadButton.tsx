'use client';

import dynamic from 'next/dynamic';
import { FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ReceiptPDF } from './ReceiptPDF';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <button className="opacity-50"><FileDown size={18} /></button> }
);

export default function ReceiptDownloadButton({ funcionario, totalDias, valorTotal, data }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <button className="opacity-50"><FileDown size={18} /></button>;

  return (
    <PDFDownloadLink
      document={<ReceiptPDF funcionario={funcionario} totalDias={totalDias} valorTotal={valorTotal} data={data} />}
      fileName={`Recibo_${funcionario.nome.replace(/\s+/g, '_')}_${data.replace(/\//g, '-')}.pdf`}
      className="flex items-center gap-2 bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
    >
      <FileDown size={18} />
      <span>Baixar Recibo</span>
    </PDFDownloadLink>
  );
}
