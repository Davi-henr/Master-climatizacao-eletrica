'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter, History, Clock, ChevronDown, ChevronUp, Trash2, Edit } from 'lucide-react';
import { differenceInDays, parseISO, format, subDays } from 'date-fns';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

type OSFinalizada = {
  id: string;
  data_agendamento: string;
  valor_total: number;
  cliente: { nome: string };
  tecnico: { nome: string };
  itens: any[];
};

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<OSFinalizada[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Expandir Detalhes
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistorico();
  }, [dataInicio, dataFim]);

  const fetchHistorico = async () => {
    setLoading(true);
    let query = supabase
      .from('orcamentos_os')
      .select(`
        id, data_agendamento, valor_total,
        cliente:clientes(nome),
        tecnico:funcionarios(nome),
        itens:itens_os(
          tipo_custo, quantidade, subtotal, tipo_servico,
          item_tabela:tabela_precos(nome_item),
          equipamento:equipamentos(descricao, local)
        )
      `)
      .eq('status', 'os_finalizada')
      .order('data_agendamento', { ascending: false });
      
    if (dataInicio) {
      query = query.gte('data_agendamento', `${dataInicio}T00:00:00.000Z`);
    }
    if (dataFim) {
      query = query.lte('data_agendamento', `${dataFim}T23:59:59.999Z`);
    }

    const { data } = await query;

    if (data) {
      setHistorico(data.map((os: any) => ({
        ...os,
        cliente: Array.isArray(os.cliente) ? os.cliente[0] : os.cliente,
        tecnico: Array.isArray(os.tecnico) ? os.tecnico[0] : os.tecnico,
        itens: os.itens.map((i: any) => ({
          ...i,
          item_tabela: Array.isArray(i.item_tabela) ? i.item_tabela[0] : i.item_tabela,
          equipamento: Array.isArray(i.equipamento) ? i.equipamento[0] : i.equipamento
        }))
      })));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta O.S finalizada do histórico?')) return;
    try {
      await supabase.from('itens_os').delete().eq('os_id', id);
      await supabase.from('orcamentos_os').delete().eq('id', id);
      fetchHistorico();
    } catch (e) {
      alert('Erro ao excluir do histórico.');
    }
  };

  const getDiasDesdeRealizacao = (dataStr: string) => {
    if (!dataStr) return 'Desconhecido';
    const dias = differenceInDays(new Date(), parseISO(dataStr));
    if (dias === 0) return 'Realizado hoje';
    if (dias === 1) return 'Realizado ontem';
    return `Realizado há ${dias} dias`;
  };

  // Filtragem local por nome
  const filtrados = historico.filter(os => 
    os.cliente?.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Histórico de Serviços" subtitle="Consulta de manutenções já executadas" />

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome do cliente..." 
            value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div className="flex-1 flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-slate-500 py-8 text-sm">Buscando histórico...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center bg-white rounded-2xl p-8 border border-slate-100">
            <History className="mx-auto text-slate-300 mb-2" size={40} />
            <p className="text-slate-500 text-sm">Nenhum serviço finalizado neste período.</p>
          </div>
        ) : (
          filtrados.map(os => {
            const isExpanded = expandedId === os.id;
            
            return (
              <div key={os.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800">{os.cliente?.nome}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(os.data_agendamento).toLocaleDateString('pt-BR')} • {os.tecnico?.nome}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-brand-orange">R$ {os.valor_total.toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      <Link href={`/orcamentos/editar/${os.id}`} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                        <Edit size={16} />
                      </Link>
                      <button onClick={() => handleDelete(os.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-orange-50/50 text-orange-800/80 px-2 py-1.5 rounded-lg w-max">
                    <Clock size={14} />
                    {getDiasDesdeRealizacao(os.data_agendamento)}
                  </div>
                  
                  <button onClick={() => setExpandedId(isExpanded ? null : os.id)} className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-blue-700">
                    {isExpanded ? 'Ocultar' : 'Detalhar'} 
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Área Expandida com os Itens do Orçamento */}
                {isExpanded && (
                  <div className="mt-2 pt-3 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                    {(() => {
                      // Agrupar Itens por Equipamento/Serviço
                      const gruposMap = new Map();
                      os.itens.forEach((item: any) => {
                        const key = `${item.equipamento?.descricao || 'Geral'} - ${item.tipo_servico || 'Serviço'}`;
                        if (!gruposMap.has(key)) gruposMap.set(key, []);
                        gruposMap.get(key).push(item);
                      });
                      
                      const grupos = Array.from(gruposMap.entries());
                      
                      return grupos.map(([nomeGrupo, itensDoGrupo], idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">{nomeGrupo}</h4>
                          <div className="space-y-1">
                            {itensDoGrupo.map((i: any, iIdx: number) => (
                              <div key={iIdx} className="flex justify-between text-xs text-slate-600">
                                <span>{i.quantidade}x {i.item_tabela?.nome_item || 'Item'}</span>
                                <span className="font-medium text-slate-800">R$ {i.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
