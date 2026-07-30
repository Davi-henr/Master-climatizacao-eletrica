'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, FileText, CalendarDays, Wallet, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format, isThisWeek, parseISO } from 'date-fns';
import PageHeader from '@/components/PageHeader';

export default function DashboardPage() {
  const [stats, setStats] = useState({ orcamentos: 0, osAtivas: 0, osFinalizadas: 0, receitaMes: 0 });
  const [ultimosOrcamentos, setUltimosOrcamentos] = useState<any[]>([]);
  const [ultimasMovimentacoes, setUltimasMovimentacoes] = useState<any[]>([]);
  const [planejamentoSemana, setPlanejamentoSemana] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
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

    // Últimas 5 Movimentações Financeiras
    const { data: movs } = await supabase
      .from('financeiro')
      .select('id, tipo, categoria, valor, data_lancamento, descricao')
      .order('data_lancamento', { ascending: false })
      .limit(5);
    
    if (movs) setUltimasMovimentacoes(movs);

    // Planejamento da Semana (OS Ativas ordenadas por data com urgência)
    const { data: ativasData } = await supabase
      .from('orcamentos_os')
      .select('id, data_agendamento, urgencia, cliente:clientes(nome)')
      .eq('status', 'os_ativa')
      .order('data_agendamento', { ascending: true })
      .limit(10); // Exibindo as próximas 10
      
    if (ativasData) setPlanejamentoSemana(ativasData);

    setLoading(false);
  };

  const getUrgencyBadge = (urgencia: string) => {
    switch (urgencia) {
      case 'Muito Urgente': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">🔴 MUITO URGENTE</span>;
      case 'Urgente': return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold">🟡 URGENTE</span>;
      default: return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">🟢 NORMAL</span>;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Início" subtitle="Resumo da sua operação diária" />
      
      {/* Header Resumo */}
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

      {/* Planejamento da Semana */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Próximos Agendamentos</h2>
          <Link href="/calendario" className="text-sm font-bold text-brand-orange">Ver Agenda</Link>
        </div>
        
        {loading ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : planejamentoSemana.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-slate-500 text-sm">Sua semana está livre!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {planejamentoSemana.map(os => (
              <div key={os.id} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-l-brand-blue border-y border-r border-slate-100 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{Array.isArray(os.cliente) ? os.cliente[0].nome : os.cliente?.nome}</h4>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-1">
                    <Clock size={12} /> {format(parseISO(os.data_agendamento), 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
                <div>
                  {getUrgencyBadge(os.urgencia)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
      </div>
      
    </div>
  );
}
