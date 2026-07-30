'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Eye, EyeOff, Save, FileText, CheckCircle } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import PageHeader from '@/components/PageHeader';

const pdfStyles = StyleSheet.create({
  page: { padding: 30, backgroundColor: '#FFFFFF' },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#ea580c', paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 12, color: '#64748b' },
  logo: { width: 100, height: 40, objectFit: 'contain' },
  body: { fontSize: 12, color: '#334155', lineHeight: 1.6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 5 },
  label: { fontWeight: 'bold', color: '#1e293b' },
  value: { color: '#0f172a' },
  totalBox: { marginTop: 20, padding: 15, backgroundColor: '#f8fafc', borderLeftWidth: 4, borderLeftColor: '#ea580c' },
  totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#ea580c', marginTop: 5 },
  signature: { marginTop: 60, borderTopWidth: 1, borderTopColor: '#94a3b8', width: 250, alignSelf: 'center', textAlign: 'center', paddingTop: 10 }
});

const ReciboPDF = ({ pagamento, funcionario, logo }: { pagamento: any, funcionario: any, logo: string | null }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <View style={pdfStyles.headerText}>
          <Text style={pdfStyles.title}>Recibo de Pagamento</Text>
          <Text style={pdfStyles.subtitle}>Master Climatização e Elétrica</Text>
        </View>
        {logo && <Image src={logo} style={pdfStyles.logo} />}
      </View>
      <View style={pdfStyles.body}>
        <Text style={{ marginBottom: 20 }}>Recebi(emos) de MASTER CLIMATIZAÇÃO E ELÉTRICA a importância abaixo discriminada, referente a prestação de serviços (diárias).</Text>
        
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Técnico / Funcionário:</Text>
          <Text style={pdfStyles.value}>{funcionario.nome}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Cargo:</Text>
          <Text style={pdfStyles.value}>{funcionario.cargo}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Dias Trabalhados:</Text>
          <Text style={pdfStyles.value}>{pagamento.dias_trabalhados} (R$ {pagamento.valor_diaria.toFixed(2)}/dia)</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Extras / Bônus:</Text>
          <Text style={pdfStyles.value}>R$ {pagamento.valor_extras.toFixed(2)}</Text>
        </View>
        <View style={pdfStyles.row}>
          <Text style={pdfStyles.label}>Data do Pagamento:</Text>
          <Text style={pdfStyles.value}>{new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR')}</Text>
        </View>
        
        <View style={pdfStyles.totalBox}>
          <Text style={pdfStyles.totalLabel}>Valor Total Recebido:</Text>
          <Text style={pdfStyles.totalValue}>R$ {pagamento.total_pago.toFixed(2)}</Text>
        </View>

        <View style={pdfStyles.signature}>
          <Text style={{ fontSize: 10, color: '#64748b' }}>Assinatura do Funcionário</Text>
        </View>
      </View>
    </Page>
  </Document>
);


export default function RHPage() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form
  const [funcId, setFuncId] = useState('');
  const [dias, setDias] = useState<number | ''>('');
  const [extras, setExtras] = useState<number | ''>('');

  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    fetchFuncionarios();
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    const cached = sessionStorage.getItem('master_logo');
    if (cached) {
      setLogoBase64(cached);
      return;
    }
    const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'logo_base64').single();
    if (data?.valor) setLogoBase64(data.valor);
  };

  useEffect(() => {
    if (showHistory) fetchPagamentos();
  }, [showHistory]);

  const fetchFuncionarios = async () => {
    const { data } = await supabase.from('funcionarios').select('*').order('nome');
    if (data) setFuncionarios(data);
  };

  const fetchPagamentos = async () => {
    setLoading(true);
    const { data } = await supabase.from('rh_pagamentos').select('*, funcionario:funcionarios(nome, cargo)').order('data_pagamento', { ascending: false });
    if (data) setPagamentos(data);
    setLoading(false);
  };

  const selectedFunc = funcionarios.find(f => f.id === funcId);
  const calcTotal = () => {
    if (!selectedFunc) return 0;
    const qtdDias = Number(dias) || 0;
    const vExtras = Number(extras) || 0;
    return (qtdDias * selectedFunc.valor_diaria) + vExtras;
  };

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcId || Number(dias) <= 0) return;
    
    setLoading(true);
    try {
      const valorTotal = calcTotal();
      
      // 1. Salvar Pagamento no RH
      const pagamentoData = {
        funcionario_id: funcId,
        dias_trabalhados: Number(dias),
        valor_diaria: selectedFunc.valor_diaria,
        valor_extras: Number(extras) || 0,
        total_pago: valorTotal
      };
      const { error: rhError } = await supabase.from('rh_pagamentos').insert(pagamentoData);
      if (rhError) throw rhError;

      // 2. Lançar no Financeiro Automático
      const { error: finError } = await supabase.from('financeiro').insert({
        tipo: 'despesa',
        categoria: 'folha_pagamento',
        valor: valorTotal,
        descricao: `Pagamento Folha: ${selectedFunc.nome} (${Number(dias)} dias)`
      });
      if (finError) throw finError;

      alert('Pagamento registrado com sucesso e debitado do Financeiro!');
      setFuncId('');
      setDias('');
      setExtras('');
      if (showHistory) fetchPagamentos();

    } catch (error) {
      console.error(error);
      alert('Erro ao registrar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Equipe / Pagamentos" subtitle="Lançamento de diárias e emissão de recibos" />

      <form onSubmit={handlePagar} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Selecionar Técnico</label>
          <select 
            required value={funcId} onChange={e => setFuncId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          >
            <option value="">-- Escolha um funcionário --</option>
            {funcionarios.map(f => (
              <option key={f.id} value={f.id}>{f.nome} (Diária: R$ {f.valor_diaria})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Dias Trab.</label>
            <input 
              type="number" min="0.5" step="0.5" required
              value={dias} onChange={e => setDias(Number(e.target.value))}
              placeholder="Ex: 5"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Extras (R$)</label>
            <input 
              type="number" step="0.01" min="0"
              value={extras} onChange={e => setExtras(Number(e.target.value))}
              placeholder="Ex: 50.00"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
          <div>
            <span className="block text-xs text-slate-500 uppercase font-bold tracking-wider">Total a Receber</span>
            <span className="text-2xl font-black text-brand-orange">R$ {calcTotal().toFixed(2)}</span>
          </div>
          <button 
            type="submit" disabled={!funcId || !dias || loading}
            className="px-6 py-3 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Processando...' : 'Pagar Técnico'} <CheckCircle size={18}/>
          </button>
        </div>
      </form>

      {/* HISTÓRICO DE PAGAMENTOS COM OLHINHO */}
      <div className="mt-8">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors mx-auto"
        >
          {showHistory ? <EyeOff size={18}/> : <Eye size={18}/>}
          {showHistory ? 'Ocultar Histórico de Pagamentos' : 'Ver Histórico de Pagamentos'}
        </button>

        {showHistory && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-4">
            {loading ? (
              <p className="text-center text-slate-400 py-4">Carregando histórico...</p>
            ) : pagamentos.length === 0 ? (
              <p className="text-center text-slate-400 py-4">Nenhum pagamento registrado.</p>
            ) : (
              pagamentos.map(pag => (
                <div key={pag.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800">{pag.funcionario?.nome || 'Func. Excluído'}</h4>
                      <p className="text-xs text-slate-500">{new Date(pag.data_pagamento).toLocaleDateString('pt-BR')} - {pag.dias_trabalhados} dias trabalhados</p>
                    </div>
                    <span className="font-black text-brand-orange">R$ {pag.total_pago.toFixed(2)}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-50">
                    <PDFDownloadLink 
                      document={<ReciboPDF pagamento={pag} funcionario={pag.funcionario || {nome: 'Desconhecido', cargo: 'N/A'}} logo={logoBase64} />} 
                      fileName={`Recibo-${pag.funcionario?.nome || 'Tec'}-${new Date(pag.data_pagamento).getTime()}.pdf`}
                    >
                      {({ loading }) => (
                        <button className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                          <FileText size={14}/> {loading ? 'Gerando Recibo...' : 'Baixar Recibo em PDF'}
                        </button>
                      )}
                    </PDFDownloadLink>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}
