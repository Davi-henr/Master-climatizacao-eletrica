'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Search, CheckCircle, Clock, CalendarDays, X, Trash2, Edit, Filter, MessageCircle, RotateCcw } from 'lucide-react';
import PDFDownloadButton from '@/components/PDFDownloadButton';
import PageHeader from '@/components/PageHeader';

type Orcamento = {
  id: string;
  cliente: { nome: string, telefone_whatsapp: string };
  equipamento: { descricao: string } | null;
  tipo_servico: string;
  status: string;
  valor_total: number;
  valor_desconto?: number;
  created_at: string;
  itens: any[];
};

type Funcionario = { id: string; nome: string };

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  // Modal de Aprovação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<string | null>(null);
  const [agendamento, setAgendamento] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [loadingAprovacao, setLoadingAprovacao] = useState(false);

  // Filtro
  const [activeFilter, setActiveFilter] = useState<'orcamento_pendente' | 'os_ativa' | 'os_finalizada'>('orcamento_pendente');

  useEffect(() => {
    fetchOrcamentos();
    fetchFuncionarios();
  }, []);

  const fetchOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos_os')
        .select(`
          id,
          status,
          tipo_servico,
          valor_total,
          valor_desconto,
          created_at,
          cliente:clientes(nome, telefone_whatsapp),
          itens:itens_os(
            tipo_custo, quantidade, subtotal, tipo_servico,
            item_tabela:tabela_precos(nome_item),
            equipamento:equipamentos(descricao, local)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted = (data as any[]).map(item => ({
        ...item,
        cliente: Array.isArray(item.cliente) ? item.cliente[0] : item.cliente,
        itens: item.itens.map((i: any) => ({
          ...i,
          item_tabela: Array.isArray(i.item_tabela) ? i.item_tabela[0] : i.item_tabela,
          equipamento: Array.isArray(i.equipamento) ? i.equipamento[0] : i.equipamento
        }))
      }));

      setOrcamentos(formatted);
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFuncionarios = async () => {
    const { data } = await supabase.from('funcionarios').select('id, nome');
    if (data) setFuncionarios(data);
  };

  const handleAprovar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrcamento || !agendamento || !tecnicoId) return;
    
    setLoadingAprovacao(true);
    try {
      const { error } = await supabase
        .from('orcamentos_os')
        .update({
          status: 'os_ativa',
          data_agendamento: new Date(agendamento).toISOString(),
          tecnico_id: tecnicoId
        })
        .eq('id', selectedOrcamento);

      if (error) throw error;
      
      setIsModalOpen(false);
      fetchOrcamentos();
    } catch (error) {
      console.error('Erro ao aprovar OS:', error);
      alert('Erro ao aprovar O.S.');
    } finally {
      setLoadingAprovacao(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir este orçamento?')) return;
    try {
      await supabase.from('itens_os').delete().eq('os_id', id);
      const { error } = await supabase.from('orcamentos_os').delete().eq('id', id);
      if (error) throw error;
      fetchOrcamentos();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir orçamento.');
    }
  };

  const handleReverterStatus = async (id: string, currentStatus: string) => {
    let newStatus = '';
    if (currentStatus === 'os_finalizada') newStatus = 'os_ativa';
    else if (currentStatus === 'os_ativa') newStatus = 'orcamento_pendente';
    else return;

    if (!confirm(`Deseja desfazer o status deste registro e voltar para ${newStatus === 'os_ativa' ? 'Agendado' : 'Pendente'}?`)) return;
    
    try {
      const { error } = await supabase.from('orcamentos_os').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      
      // Se estava finalizada, o sistema havia gerado um recebimento no financeiro. Precisamos excluir para não duplicar se finalizar de novo.
      if (currentStatus === 'os_finalizada') {
        const orcamento = orcamentos.find(o => o.id === id);
        if (orcamento) {
          const descricaoFin = `Recebimento ref. O.S. de ${orcamento.cliente?.nome}`;
          await supabase.from('financeiro')
            .delete()
            .eq('descricao', descricaoFin)
            .eq('valor', orcamento.valor_total);
        }
      }

      fetchOrcamentos();
    } catch (error) {
      console.error('Erro ao reverter:', error);
      alert('Erro ao alterar status.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'orcamento_pendente':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wider"><Clock size={12}/> Pendente</span>;
      case 'os_ativa':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-brand-blue text-white uppercase tracking-wider"><CheckCircle size={12}/> O.S. Ativa</span>;
      case 'os_finalizada':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wider"><CheckCircle size={12}/> Finalizada</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold">Desconhecido</span>;
    }
  };

  const handleWhatsApp = (orcamento: Orcamento) => {
    const numero = orcamento.cliente.telefone_whatsapp?.replace(/\D/g, '');
    if (!numero) {
      alert('Cliente sem número de WhatsApp cadastrado.');
      return;
    }
    const msg = encodeURIComponent(`Olá ${orcamento.cliente.nome}, segue o seu orçamento no valor de R$ ${orcamento.valor_total.toFixed(2)}. O PDF completo está anexo a esta mensagem!`);
    window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank');
  };

  const filteredOrcamentos = orcamentos.filter(o => {
    const matchBusca = o.cliente?.nome?.toLowerCase().includes(busca.toLowerCase()) || 
                       o.id.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = o.status === activeFilter;
    return matchBusca && matchStatus;
  });

  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="Orçamentos" subtitle="Gerencie seus orçamentos e Ordens de Serviço" />
      
      <div className="flex justify-between items-center mb-6">
        <Link 
          href="/orcamentos/novo"
          className="flex items-center justify-center w-10 h-10 bg-brand-orange hover:bg-orange-600 text-white rounded-xl shadow-sm"
        >
          <Plus size={20} />
        </Link>
      </div>

      <div className="space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm text-sm"
          />
        </div>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveFilter('orcamento_pendente')}
            className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-bold rounded-md transition-colors ${activeFilter === 'orcamento_pendente' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setActiveFilter('os_ativa')}
            className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-bold rounded-md transition-colors ${activeFilter === 'os_ativa' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            Agendados
          </button>
          <button 
            onClick={() => setActiveFilter('os_finalizada')}
            className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-bold rounded-md transition-colors ${activeFilter === 'os_finalizada' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            Finalizados
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center p-8"><p className="text-slate-400">Carregando...</p></div>
        ) : filteredOrcamentos.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500">Nenhum orçamento encontrado nesta aba.</p>
          </div>
        ) : (
          filteredOrcamentos.map((orcamento) => (
            <div key={orcamento.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800">{orcamento.cliente?.nome || 'Sem cliente'}</h3>
                  <p className="text-xs text-slate-500">{orcamento.equipamento?.descricao || 'Sem equipamento'}</p>
                </div>
                {getStatusBadge(orcamento.status)}
              </div>
              
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg mt-2">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Tipo / Data</p>
                  <p className="text-xs font-medium text-slate-700">{orcamento.tipo_servico || 'Geral'} • {new Date(orcamento.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valor Total</p>
                  <p className="text-sm font-bold text-brand-orange">R$ {orcamento.valor_total.toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-slate-100">
                <PDFDownloadButton orcamento={orcamento} />
                
                {orcamento.status === 'orcamento_pendente' && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 sm:mt-0">
                    <button 
                      onClick={() => handleWhatsApp(orcamento)}
                      className="flex-1 flex justify-center items-center gap-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm"
                    >
                      <MessageCircle size={16} /> Zap
                    </button>
                    <button 
                      onClick={() => { setSelectedOrcamento(orcamento.id); setIsModalOpen(true); }}
                      className="flex-1 flex justify-center items-center gap-1 py-2 bg-brand-blue text-white rounded-lg text-sm font-bold shadow-sm"
                    >
                      <CalendarDays size={16} /> Agendar
                    </button>
                    <Link 
                      href={`/orcamentos/editar/${orcamento.id}`}
                      className="p-2 border border-blue-200 text-blue-500 rounded-lg hover:bg-blue-50 flex items-center justify-center"
                      title="Editar Orçamento"
                    >
                      <Edit size={16} />
                    </Link>
                    <button 
                      onClick={() => handleExcluir(orcamento.id)}
                      className="p-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 flex items-center justify-center"
                      title="Excluir Orçamento permanentemente"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {orcamento.status !== 'orcamento_pendente' && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 sm:mt-0 justify-end">
                    <button 
                      onClick={() => handleReverterStatus(orcamento.id, orcamento.status)}
                      className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 text-sm font-bold"
                      title="Desfazer Status"
                    >
                      <RotateCcw size={16} /> Voltar para {orcamento.status === 'os_finalizada' ? 'Agendado' : 'Pendente'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Aprovação */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center z-[100] pb-20 sm:pb-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Agendar Serviço</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAprovar} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Data e Hora</label>
                <input 
                  type="datetime-local" required
                  value={agendamento} onChange={e => setAgendamento(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Técnico Responsável</label>
                <select 
                  required value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="">Selecione...</option>
                  {funcionarios.map(func => (
                    <option key={func.id} value={func.id}>{func.nome}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" disabled={loadingAprovacao}
                className="w-full py-3 mt-4 bg-brand-blue text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                {loadingAprovacao ? 'Salvando...' : 'Confirmar O.S.'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
