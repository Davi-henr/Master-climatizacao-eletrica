'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, FileText, CalendarDays, Wallet, CheckCircle, Clock, Eye, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { format, isThisWeek, parseISO } from 'date-fns';
import PageHeader from '@/components/PageHeader';
import { PDFDownloadLink, Document, Page, Text as PdfText, View, StyleSheet, Image } from '@react-pdf/renderer';

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
          <PdfText style={pdfStyles.title}>Recibo de Pagamento</PdfText>
          <PdfText style={pdfStyles.subtitle}>Master Climatização e Elétrica</PdfText>
        </View>
        {logo && <Image src={logo} style={pdfStyles.logo} />}
      </View>
      <View style={pdfStyles.body}>
        <PdfText style={{ marginBottom: 20 }}>Recebi(emos) de MASTER CLIMATIZAÇÃO E ELÉTRICA a importância abaixo discriminada, referente a prestação de serviços (diárias).</PdfText>
        
        <View style={pdfStyles.row}>
          <PdfText style={pdfStyles.label}>Técnico / Funcionário:</PdfText>
          <PdfText style={pdfStyles.value}>{funcionario.nome}</PdfText>
        </View>
        <View style={pdfStyles.row}>
          <PdfText style={pdfStyles.label}>Cargo:</PdfText>
          <PdfText style={pdfStyles.value}>{funcionario.cargo || 'Técnico'}</PdfText>
        </View>
        <View style={pdfStyles.row}>
          <PdfText style={pdfStyles.label}>Dias Trabalhados:</PdfText>
          <PdfText style={pdfStyles.value}>{pagamento.dias_trabalhados} (R$ {pagamento.valor_diaria.toFixed(2)}/dia)</PdfText>
        </View>
        <View style={pdfStyles.row}>
          <PdfText style={pdfStyles.label}>Extras / Bônus:</PdfText>
          <PdfText style={pdfStyles.value}>R$ {pagamento.valor_extras.toFixed(2)}</PdfText>
        </View>
        {(pagamento.valor_desconto && pagamento.valor_desconto > 0) ? (
          <View style={pdfStyles.row}>
            <PdfText style={pdfStyles.label}>Desconto:</PdfText>
            <PdfText style={{ ...pdfStyles.value, color: '#ef4444' }}>- R$ {pagamento.valor_desconto.toFixed(2)}</PdfText>
          </View>
        ) : null}
        <View style={pdfStyles.row}>
          <PdfText style={pdfStyles.label}>Data do Pagamento:</PdfText>
          <PdfText style={pdfStyles.value}>{new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR')}</PdfText>
        </View>
        
        <View style={pdfStyles.totalBox}>
          <PdfText style={pdfStyles.totalLabel}>Valor Total Recebido:</PdfText>
          <PdfText style={pdfStyles.totalValue}>R$ {pagamento.total_pago.toFixed(2)}</PdfText>
        </View>

        <View style={pdfStyles.signature}>
          <PdfText style={{ fontSize: 10, color: '#64748b' }}>Assinatura do Funcionário</PdfText>
        </View>
      </View>
    </Page>
  </Document>
);

export default function DashboardPage() {
  const [role, setRole] = useState('admin');
  const [funcId, setFuncId] = useState('');
  
  const [stats, setStats] = useState({ orcamentos: 0, osAtivas: 0, osFinalizadas: 0, receitaMes: 0 });
  const [ultimosOrcamentos, setUltimosOrcamentos] = useState<any[]>([]);
  const [ultimasMovimentacoes, setUltimasMovimentacoes] = useState<any[]>([]);
  const [planejamentoSemana, setPlanejamentoSemana] = useState<any[]>([]);
  const [limpezasConcluidas, setLimpezasConcluidas] = useState<any[]>([]);
  const [meusPagamentos, setMeusPagamentos] = useState<any[]>([]);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Rota
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [selectedForRoute, setSelectedForRoute] = useState<string[]>([]);

  useEffect(() => {
    const cookies = document.cookie.split(';');
    let currentRole = 'admin';
    let currentFuncId = '';
    cookies.forEach(c => {
      if (c.trim().startsWith('master_role=')) currentRole = c.split('=')[1];
      if (c.trim().startsWith('master_func_id=')) currentFuncId = c.split('=')[1];
    });
    setRole(currentRole);
    setFuncId(currentFuncId);
    
    // Fetch Logo
    const fetchLogo = async () => {
      const cached = sessionStorage.getItem('master_logo');
      if (cached) {
        setLogoBase64(cached);
        return;
      }
      const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'logo_base64').single();
      if (data?.valor) setLogoBase64(data.valor);
    };
    fetchLogo();

    fetchDashboardData(currentRole, currentFuncId);
  }, []);

  const fetchDashboardData = async (userRole: string, userFuncId: string) => {
    setLoading(true);
    
    if (userRole === 'admin') {
      // Contagens
      const { count: countOrc } = await supabase.from('orcamentos_os').select('*', { count: 'exact', head: true }).eq('status', 'orcamento_pendente');
      const { count: countAtivas } = await supabase.from('orcamentos_os').select('*', { count: 'exact', head: true }).eq('status', 'os_ativa');
      const { count: countFinais } = await supabase.from('orcamentos_os').select('*', { count: 'exact', head: true }).eq('status', 'os_finalizada');
      
      // Receita Mês Atual
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: finData } = await supabase.from('financeiro').select('valor, tipo').gte('data_lancamento', inicioMes);
      let receita = 0;
      if (finData) {
        finData.forEach(f => {
          if (f.tipo === 'receita') receita += f.valor;
          else receita -= f.valor;
        });
      }

      setStats({
        orcamentos: countOrc || 0,
        osAtivas: countAtivas || 0,
        osFinalizadas: countFinais || 0,
        receitaMes: receita
      });

      // Últimos 5 Orçamentos/OS
      const { data: ultimosOs } = await supabase
        .from('orcamentos_os')
        .select('id, status, valor_total, created_at, cliente:clientes(nome)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (ultimosOs) setUltimosOrcamentos(ultimosOs);

      // Limpezas Concluídas
      const { data: limpezas } = await supabase
        .from('orcamentos_os')
        .select('id, data_agendamento, cliente:clientes(nome), itens_os(equipamentos(id, descricao, local))')
        .eq('tipo_servico', 'Limpeza')
        .eq('status', 'os_finalizada')
        .order('data_agendamento', { ascending: false });
        
      if (limpezas) {
        // Filtrar apenas o registro mais recente por equipamento
        const latestPerEquip = new Map();
        limpezas.forEach((lz: any) => {
          lz.itens_os?.forEach((item: any) => {
            if (item.equipamentos?.id) {
              const eqId = item.equipamentos.id;
              if (!latestPerEquip.has(eqId)) {
                latestPerEquip.set(eqId, lz);
              }
            }
          });
        });
        // Converta para array e pegue os últimos 10
        const uniqueLimpezas = Array.from(latestPerEquip.values()).slice(0, 10);
        setLimpezasConcluidas(uniqueLimpezas);
      }

      // Últimas 5 Movimentações Financeiras
      const { data: movs } = await supabase
        .from('financeiro')
        .select('id, tipo, categoria, valor, data_lancamento, descricao')
        .order('data_lancamento', { ascending: false })
        .limit(5);
      
      if (movs) setUltimasMovimentacoes(movs);
    } else if (userRole === 'funcionario' && userFuncId) {
      // Meus Pagamentos
      const { data: pags } = await supabase
        .from('rh_pagamentos')
        .select('*, funcionario:funcionarios(nome, cargo)')
        .eq('funcionario_id', userFuncId)
        .order('data_pagamento', { ascending: false });
        
      if (pags) setMeusPagamentos(pags);
    }

    // Planejamento da Semana (OS Ativas ordenadas por data com urgência)
    const { data: ativasData } = await supabase
      .from('orcamentos_os')
      .select('id, data_agendamento, urgencia, cliente:clientes(nome, endereco, endereco_rua, endereco_numero, endereco_bairro), itens_os(equipamentos(descricao, local))')
      .eq('status', 'os_ativa')
      .order('data_agendamento', { ascending: true })
      .limit(20);
      
    if (ativasData) {
      const sorted = [...ativasData].sort((a, b) => {
        const dateA = a.data_agendamento ? a.data_agendamento.split('T')[0] : '';
        const dateB = b.data_agendamento ? b.data_agendamento.split('T')[0] : '';
        if (dateA === dateB) {
           const urgencyLevel = { 'Muito Urgente': 3, 'Urgente': 2, 'Pouco Urgente': 1 } as any;
           const uA = urgencyLevel[a.urgencia] || 0;
           const uB = urgencyLevel[b.urgencia] || 0;
           return uB - uA;
        }
        return 0; // The SQL already sorted by date
      });
      setPlanejamentoSemana(sorted);
    }

    setLoading(false);
  };

  const getUrgencyBadge = (urgencia: string) => {
    switch (urgencia) {
      case 'Muito Urgente': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">🔴 MUITO URGENTE</span>;
      case 'Urgente': return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold">🟡 URGENTE</span>;
      default: return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">🟢 NORMAL</span>;
    }
  };

  const handleOpenGoogleMaps = (endereco: string) => {
    if (!endereco) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  };

  const handleGenerateCompleteRoute = () => {
    if (selectedForRoute.length === 0) return;
    
    const selectedOS = planejamentoSemana.filter(os => selectedForRoute.includes(os.id));
    
    // Sort by urgency automatically
    const sorted = [...selectedOS].sort((a, b) => {
      const urgencyLevel = { 'Muito Urgente': 3, 'Urgente': 2, 'Pouco Urgente': 1 } as any;
      const uA = urgencyLevel[a.urgencia] || 0;
      const uB = urgencyLevel[b.urgencia] || 0;
      return uB - uA; 
    });

    const enderecos = sorted.map(os => {
      const cli = Array.isArray(os.cliente) ? os.cliente[0] : os.cliente;
      return cli?.endereco_rua ? `${cli.endereco_rua}, ${cli.endereco_numero} - ${cli.endereco_bairro}` : cli?.endereco;
    }).filter(e => e);

    if (enderecos.length === 0) {
      alert("Nenhum endereço válido selecionado nas OS escolhidas.");
      return;
    }

    const path = enderecos.map(e => encodeURIComponent(e)).join('/');
    const url = `https://www.google.com/maps/dir/${path}`;
    window.open(url, '_blank');
    setIsRouteModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Início" subtitle="Resumo da sua operação diária" />
      
      {/* Header Resumo */}
      {role === 'admin' ? (
        <div className="bg-brand-blue text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <h2 className="text-xl font-black mb-1 relative z-10">Olá, Master! 👋</h2>
          <p className="text-blue-100 text-sm mb-6 relative z-10">Aqui está o resumo do mês.</p>
          
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <TrendingUp size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Caixa do Mês</span>
              </div>
              <p className="text-xl font-black">R$ {stats.receitaMes.toFixed(2)}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <CalendarDays size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">OS Ativas</span>
              </div>
              <p className="text-xl font-black">{stats.osAtivas}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <h2 className="text-xl font-black mb-1 relative z-10">Bem-vindo(a)! 👋</h2>
          <p className="text-slate-300 text-sm relative z-10">Confira seus agendamentos e recibos abaixo.</p>
        </div>
      )}

      {/* Planejamento da Semana */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Próximos Agendamentos</h2>
          <div className="flex gap-3 items-center">
            <button 
              onClick={() => { setSelectedForRoute([]); setIsRouteModalOpen(true); }}
              className="text-xs font-bold bg-brand-orange text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-orange-600 transition-colors"
            >
              <MapPin size={14}/> Montar Rota do Dia
            </button>
            <Link href="/calendario" className="text-sm font-bold text-brand-orange">Ver Agenda</Link>
          </div>
        </div>
        
        {loading ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : planejamentoSemana.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-slate-500 text-sm">Sua semana está livre!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {planejamentoSemana.map(os => {
              const cli = Array.isArray(os.cliente) ? os.cliente[0] : os.cliente;
              const equipamentos = os.itens_os?.filter((i:any)=>i.equipamentos).map((i:any)=>i.equipamentos) || [];
              const dataAgendamentoObj = new Date(os.data_agendamento);
              const isAtrasado = dataAgendamentoObj.getTime() < new Date().getTime();
              
              return (
              <div key={os.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 ${isAtrasado ? 'border-l-red-500' : 'border-l-brand-blue'} border-y border-r border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">{cli?.nome}</h4>
                    {isAtrasado && <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Atrasado</span>}
                  </div>
                  
                  {cli?.endereco_rua ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs text-slate-500">
                        {cli.endereco_rua}, {cli.endereco_numero} - {cli.endereco_bairro}
                      </p>
                      <button onClick={() => handleOpenGoogleMaps(`${cli.endereco_rua}, ${cli.endereco_numero} - ${cli.endereco_bairro}`)} className="text-blue-500 p-1 hover:bg-blue-50 rounded" title="Abrir GPS">
                        <MapPin size={14}/>
                      </button>
                    </div>
                  ) : cli?.endereco ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs text-slate-500">{cli.endereco}</p>
                      <button onClick={() => handleOpenGoogleMaps(cli.endereco)} className="text-blue-500 p-1 hover:bg-blue-50 rounded" title="Abrir GPS">
                        <MapPin size={14}/>
                      </button>
                    </div>
                  ) : null}
                  
                  {equipamentos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {equipamentos.map((eq:any, idx:number) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded border border-slate-200">
                          <span className="font-bold">{eq.local}</span>: {eq.descricao}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-1.5 text-xs font-bold mt-2 w-fit px-2 py-1 rounded-lg border ${isAtrasado ? 'bg-red-50 text-red-600 border-red-100' : 'text-brand-blue bg-blue-50 border-blue-100'}`}>
                    <Clock size={12} /> {format(dataAgendamentoObj, 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
                <div className="self-end sm:self-center">
                  {getUrgencyBadge(os.urgencia)}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {role === 'admin' ? (
        <>
          {/* Grid Atalhos */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/orcamentos/novo" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-50 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-orange-50 text-brand-orange rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110">
                <FileText size={24} />
              </div>
              <span className="font-bold text-slate-700 text-sm">Novo Orçamento</span>
            </Link>
            
            <Link href="/rh" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-50 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110">
                <Wallet size={24} />
              </div>
              <span className="font-bold text-slate-700 text-sm">Pagar Funcionário</span>
            </Link>
          </div>

          {/* Histórico Rápido (Limitado a 5) */}
          <div className="grid grid-cols-1 gap-6">
            {/* Últimas Movimentações */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Últimas Transações</h3>
              </div>
              <div className="p-2 space-y-1">
                {loading ? <p className="p-4 text-slate-500 text-sm">Carregando...</p> : ultimasMovimentacoes.length === 0 ? <p className="p-4 text-slate-500 text-sm">Sem movimentações recentes.</p> : (
                  ultimasMovimentacoes.map(mov => (
                    <div key={mov.id} className="p-3 hover:bg-slate-50 rounded-xl flex justify-between items-center transition-colors">
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{mov.descricao}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(mov.data_lancamento).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`font-black text-sm ${mov.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                        {mov.tipo === 'receita' ? '+' : '-'} R$ {mov.valor.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Últimos Orçamentos */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Últimos Registros</h3>
                <Link href="/orcamentos" className="text-brand-blue text-xs font-bold">Ver todos</Link>
              </div>
              <div className="p-2 space-y-1">
                {loading ? <p className="p-4 text-slate-500 text-sm">Carregando...</p> : ultimosOrcamentos.length === 0 ? <p className="p-4 text-slate-500 text-sm">Sem orçamentos recentes.</p> : (
                  ultimosOrcamentos.map(orc => (
                    <div key={orc.id} className="p-3 hover:bg-slate-50 rounded-xl flex justify-between items-center transition-colors">
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{Array.isArray(orc.cliente) ? orc.cliente[0].nome : orc.cliente?.nome}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          orc.status === 'orcamento_pendente' ? 'bg-yellow-100 text-yellow-800' :
                          orc.status === 'os_ativa' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {orc.status === 'orcamento_pendente' ? 'Pendente' : orc.status === 'os_ativa' ? 'Agendado' : 'Finalizado'}
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 text-sm">
                        R$ {orc.valor_total.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Histórico Recente de Limpezas */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-green-50">
                <h3 className="font-bold text-green-800 text-sm uppercase tracking-wider">Histórico de Limpezas Concluídas</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 min-w-[500px]">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Equipamento/Local</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3 text-right">Passou</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="p-4 text-center">Carregando...</td></tr>
                    ) : limpezasConcluidas.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-slate-500">Sem histórico recente.</td></tr>
                    ) : (
                      limpezasConcluidas.map(lz => {
                        const cli = Array.isArray(lz.cliente) ? lz.cliente[0] : lz.cliente;
                        const equipamentos = lz.itens_os?.filter((i:any)=>i.equipamentos).map((i:any)=>i.equipamentos) || [];
                        const dataLz = new Date(lz.data_agendamento || new Date());
                        const daysPassed = Math.floor((new Date().getTime() - dataLz.getTime()) / (1000 * 3600 * 24));
                        
                        return (
                          <tr key={lz.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-700">{cli?.nome}</td>
                            <td className="px-4 py-3">
                              {equipamentos.length > 0 ? (
                                equipamentos.map((eq:any, idx:number) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-bold text-brand-blue">{eq.local}</span>: {eq.descricao}
                                  </div>
                                ))
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs">{dataLz.toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 text-right font-bold text-brand-orange">{daysPassed} dias</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">Meus Pagamentos</h2>
          </div>
          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-500 text-sm">Carregando...</p>
            ) : meusPagamentos.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-500 text-sm">Nenhum pagamento registrado.</p>
              </div>
            ) : (
              meusPagamentos.map(pag => (
                <div key={pag.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                        {new Date(pag.data_pagamento).toLocaleDateString('pt-BR')}
                      </p>
                      <h4 className="font-bold text-slate-800 text-sm">{pag.dias_trabalhados} dias trabalhados</h4>
                    </div>
                    <span className="font-black text-brand-orange text-lg">R$ {pag.total_pago.toFixed(2)}</span>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-50">
                    <PDFDownloadLink 
                      document={<ReciboPDF pagamento={pag} funcionario={pag.funcionario || {nome: 'Você', cargo: 'Técnico'}} logo={logoBase64} />} 
                      fileName={`Recibo-${pag.data_pagamento}.pdf`}
                    >
                      {({ loading: pdfLoading }) => (
                        <button className="flex items-center justify-center w-full gap-2 text-sm font-bold text-brand-blue hover:text-white bg-blue-50 hover:bg-brand-blue px-3 py-2 rounded-xl transition-all">
                          <FileText size={16}/> {pdfLoading ? 'Gerando PDF...' : 'Baixar Recibo PDF'}
                        </button>
                      )}
                    </PDFDownloadLink>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Modal Rota */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800">Montar Rota</h3>
                <p className="text-xs text-slate-500">Selecione os clientes que irá atender.</p>
              </div>
              <button onClick={() => setIsRouteModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {planejamentoSemana.length === 0 ? (
                <p className="text-sm text-slate-500 text-center">Nenhum agendamento encontrado.</p>
              ) : (
                planejamentoSemana.map(os => {
                  const cli = Array.isArray(os.cliente) ? os.cliente[0] : os.cliente;
                  const dataObj = new Date(os.data_agendamento);
                  const isChecked = selectedForRoute.includes(os.id);
                  
                  return (
                    <label key={os.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isChecked ? 'bg-orange-50 border-orange-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedForRoute([...selectedForRoute, os.id]);
                          else setSelectedForRoute(selectedForRoute.filter(id => id !== os.id));
                        }}
                        className="mt-1 w-4 h-4 text-brand-orange rounded border-slate-300 focus:ring-brand-orange"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-sm text-slate-800">{cli?.nome}</p>
                        <p className="text-xs text-slate-500">{format(dataObj, 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <div className="scale-75 origin-top-right">
                        {getUrgencyBadge(os.urgencia)}
                      </div>
                    </label>
                  )
                })
              )}
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={handleGenerateCompleteRoute} 
                disabled={selectedForRoute.length === 0}
                className="w-full py-3 bg-brand-orange text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <MapPin size={18}/> Gerar Rota Inteligente (Google Maps)
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-3">
                *O sistema ordenará automaticamente por urgência antes de enviar pro Maps.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
