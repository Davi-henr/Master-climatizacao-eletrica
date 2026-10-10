'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type OS = {
  id: string;
  status: string;
  tipo_servico: string;
  data_agendamento: string;
  valor_total: number;
  cliente: { nome: string };
  tecnico: { id: string; nome: string };
  tecnicos_ids?: string[];
  custo_materiais_informado?: number;
};

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [osList, setOsList] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishingId, setFinishingId] = useState<string | null>(null);

  // Remarcar OS
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [novoAgendamento, setNovoAgendamento] = useState('');
  const [novoTecnico, setNovoTecnico] = useState('');
  const [loadingReschedule, setLoadingReschedule] = useState(false);

  // Modal Finalizar com custo de materiais
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [osToFinalize, setOsToFinalize] = useState<OS | null>(null);
  const [custoMateriais, setCustoMateriais] = useState<number | ''>('');
  
  const [role, setRole] = useState('admin');

  useEffect(() => {
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('master_role='));
    if (roleCookie) {
      setRole(roleCookie.split('=')[1]);
    }
  }, []);

  useEffect(() => {
    fetchActiveOS();
  }, [currentDate]);

  const fetchActiveOS = async () => {
    setLoading(true);
    const start = startOfWeek(startOfMonth(currentDate)).toISOString();
    const end = endOfWeek(endOfMonth(currentDate)).toISOString();

    const { data, error } = await supabase
      .from('orcamentos_os')
      .select(`
        id, status, tipo_servico, data_agendamento, valor_total, tecnicos_ids,
        cliente:clientes(nome),
        tecnico:funcionarios(id, nome)
      `)
      .in('status', ['os_ativa', 'os_finalizada'])
      .not('data_agendamento', 'is', null)
      .gte('data_agendamento', start)
      .lte('data_agendamento', end);

    if (data) {
      setOsList(data.map((os: any) => ({
        ...os,
        cliente: Array.isArray(os.cliente) ? os.cliente[0] : os.cliente,
        tecnico: Array.isArray(os.tecnico) ? os.tecnico[0] : os.tecnico,
      })));
    }
    setLoading(false);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getServiceColor = (tipo: string) => {
    if (tipo?.toLowerCase().includes('instalação')) return 'bg-blue-500';
    if (tipo?.toLowerCase().includes('limpeza') || tipo?.toLowerCase().includes('higieniza')) return 'bg-green-500';
    if (tipo?.toLowerCase().includes('reparo')) return 'bg-orange-500';
    return 'bg-slate-400';
  };

  // Funções para renderizar o grid do calendário
  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button onClick={nextMonth} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600">
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        
        // Buscar OS agendadas para este dia
        const dayOS = osList.filter(os => isSameDay(parseISO(os.data_agendamento), cloneDay));
        
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={day.toString()}
            onClick={() => setSelectedDate(cloneDay)}
            className={`min-h-[60px] p-1 border border-slate-100 flex flex-col items-center justify-start cursor-pointer transition-colors ${
              !isCurrentMonth ? 'bg-slate-50 opacity-50' : isSelected ? 'bg-orange-50 border-brand-orange' : 'bg-white hover:bg-slate-50'
            }`}
          >
            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
              isSelected ? 'bg-brand-orange text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
            }`}>
              {format(day, 'd')}
            </span>
            
            {/* Tickets */}
            <div className="w-full flex flex-col gap-[2px] mt-1 px-1">
              {dayOS.slice(0, 3).map(os => (
                <div key={os.id} className={`w-full h-1.5 rounded-full ${getServiceColor(os.tipo_servico)} ${os.status === 'os_finalizada' ? 'opacity-40' : ''}`} />
              ))}
              {dayOS.length > 3 && <span className="text-[8px] text-slate-400 text-center font-bold">+{dayOS.length - 3}</span>}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="bg-white border-l border-t border-slate-100 rounded-xl overflow-hidden">{rows}</div>;
  };

  // Detalhes da Data Selecionada
  const selectedDayOS = osList.filter(os => isSameDay(parseISO(os.data_agendamento), selectedDate));

  const openFinalizarModal = (os: OS) => {
    setOsToFinalize(os);
    setCustoMateriais('');
    setIsMaterialModalOpen(true);
  };

  const handleConfirmarFinalizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osToFinalize) return;

    const os = osToFinalize;
    setFinishingId(os.id);
    setIsMaterialModalOpen(false);

    const custoMat = Number(custoMateriais) || 0;

    try {
      const { error: osError } = await supabase
        .from('orcamentos_os')
        .update({ status: 'os_finalizada', custo_materiais_informado: custoMat })
        .eq('id', os.id);
      if (osError) throw osError;

      // Lança receita no financeiro
      const { error: finError } = await supabase.from('financeiro').insert({
        tipo: 'receita', categoria: 'servico', valor: os.valor_total,
        descricao: `Recebimento ref. O.S. de ${os.cliente?.nome}`,
        os_id: os.id
      });
      if (finError) throw finError;

      // Se informou custo de materiais, lança como despesa no financeiro
      if (custoMat > 0) {
        const { error: despError } = await supabase.from('financeiro').insert({
          tipo: 'despesa', categoria: 'peca', valor: custoMat,
          descricao: `Custo de materiais - O.S. de ${os.cliente?.nome}`,
          os_id: os.id
        });
        if (despError) throw despError;
      }

      fetchActiveOS();
    } catch (error) {
      console.error('Erro ao finalizar OS:', error);
      alert('Erro ao finalizar.');
    } finally {
      setFinishingId(null);
      setOsToFinalize(null);
    }
  };

  const handleRemarcar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleId || !novoAgendamento) return;
    
    setLoadingReschedule(true);
    try {
      const updateData: any = { data_agendamento: new Date(novoAgendamento).toISOString() };
      if (novoTecnico) updateData.tecnico_id = novoTecnico;
      
      const { error } = await supabase.from('orcamentos_os').update(updateData).eq('id', rescheduleId);
      if (error) throw error;
      
      setIsRescheduleModalOpen(false);
      fetchActiveOS();
    } catch (error) {
      console.error('Erro ao remarcar OS:', error);
      alert('Erro ao remarcar.');
    } finally {
      setLoadingReschedule(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Agenda Master" subtitle="Acompanhe seus serviços agendados" />

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
        
        {/* Legenda */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium"><div className="w-2 h-2 rounded-full bg-blue-500" /> Instalação</div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium"><div className="w-2 h-2 rounded-full bg-green-500" /> Higienização</div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium"><div className="w-2 h-2 rounded-full bg-orange-500" /> Reparo</div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium"><div className="w-2 h-2 rounded-full bg-slate-400" /> Outro / Finalizado</div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          Agendamentos do Dia {format(selectedDate, "dd/MM")}
        </h3>
        
        {loading ? (
          <p className="text-center text-slate-400 py-4 text-sm">Carregando...</p>
        ) : selectedDayOS.length === 0 ? (
          <div className="text-center bg-slate-50 rounded-xl p-8 border border-slate-100 text-slate-400 text-sm">
            Nenhuma O.S. agendada para este dia.
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDayOS.map(os => (
              <div key={os.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getServiceColor(os.tipo_servico)}`} />
                    <h4 className="font-bold text-slate-800">{os.tipo_servico || 'Serviço Técnico'}</h4>
                  </div>
                  {os.status === 'os_finalizada' ? (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold uppercase flex items-center gap-1">
                      <CheckCircle size={10}/> Concluído
                    </span>
                  ) : (
                    <span className="text-[10px] bg-brand-blue text-white px-2 py-1 rounded-md font-bold uppercase flex items-center gap-1">
                      <Clock size={10}/> Pendente
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 mb-4">
                  <p className="text-sm font-medium text-slate-700">Cliente: <span className="font-bold text-slate-900">{os.cliente?.nome}</span></p>
                  <p className="text-sm font-medium text-slate-700">Técnico(s): <span className="font-bold text-slate-900">
                    {os.tecnicos_ids && os.tecnicos_ids.length > 1 
                      ? `${os.tecnico?.nome} e mais ${os.tecnicos_ids.length - 1}` 
                      : os.tecnico?.nome}
                  </span></p>
                  <p className="text-sm font-medium text-slate-700">Horário: <span className="font-bold text-brand-orange">{format(parseISO(os.data_agendamento), 'HH:mm')}</span></p>
                  {role !== 'funcionario' && (
                    <p className="text-sm font-medium text-slate-700 mt-2">Valor: R$ {os.valor_total.toFixed(2).replace('.', ',')}</p>
                  )}
                </div>

                {os.status === 'os_ativa' && role !== 'funcionario' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setRescheduleId(os.id);
                        setNovoAgendamento(os.data_agendamento.slice(0, 16));
                        setNovoTecnico(os.tecnico?.id || '');
                        setIsRescheduleModalOpen(true);
                      }}
                      className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm shadow-sm flex items-center justify-center"
                    >
                      Remarcar
                    </button>
                    <button 
                      onClick={() => openFinalizarModal(os)}
                      disabled={finishingId === os.id}
                      className="w-2/3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors text-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {finishingId === os.id ? 'Finalizando...' : 'Finalizar e Receber'}
                      <CheckCircle size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Remarcar O.S */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Remarcar O.S.</h3>
            <form onSubmit={handleRemarcar} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nova Data e Hora</label>
                <input 
                  type="datetime-local" required
                  value={novoAgendamento} onChange={e => setNovoAgendamento(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsRescheduleModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={loadingReschedule} className="flex-1 py-3 bg-brand-blue text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50">
                  {loadingReschedule ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Custo de Materiais ao Finalizar */}
      {isMaterialModalOpen && osToFinalize && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Finalizar e Receber</h3>
            <p className="text-sm text-slate-500 mb-5">
              O.S. de <span className="font-bold text-slate-700">{osToFinalize.cliente?.nome}</span> — valor: <span className="font-bold text-green-600">R$ {osToFinalize.valor_total?.toFixed(2).replace('.', ',')}</span>
            </p>
            <form onSubmit={handleConfirmarFinalizacao} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Custo Total de Materiais (R$)
                </label>
                <p className="text-xs text-slate-400 mb-2">Informe o valor gasto com peças e materiais nesta O.S. (deixe 0 se não houver).</p>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 150,00"
                  value={custoMateriais}
                  onChange={e => setCustoMateriais(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-lg font-bold"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button 
                  type="button" 
                  onClick={() => { setIsMaterialModalOpen(false); setOsToFinalize(null); }} 
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
