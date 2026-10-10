'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogOut, Bell, X, MessageCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PageHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cachedLogo = sessionStorage.getItem('master_logo');
    if (cachedLogo) {
      setLogo(cachedLogo);
    } else {
      fetchLogo();
    }
    fetchNotifications();
  }, []);

  const fetchLogo = async () => {
    const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'logo_base64').single();
    if (data?.valor) {
      setLogo(data.valor);
      sessionStorage.setItem('master_logo', data.valor);
    }
  };

  const fetchNotifications = async () => {
    // Buscar todos os itens de OS de "Higienização" que estão finalizados
    const { data, error } = await supabase
      .from('itens_os')
      .select(`
        equipamento_id,
        equipamento:equipamentos(descricao, local, cliente:clientes(id, nome, telefone_whatsapp)),
        orcamento:orcamentos_os!inner(id, data_agendamento, created_at, status, tipo_servico, meses_proxima_higienizacao, notificacao_enviada)
      `)
      .in('orcamento.tipo_servico', ['Limpeza', 'Higienização', 'Instalação'])
      .eq('orcamento.status', 'os_finalizada')
      .not('equipamento_id', 'is', null);

    if (error || !data) return;

    const now = new Date().getTime();
    const mapEquip = new Map();

    data.forEach((item: any) => {
      // Prioriza data_agendamento, senão created_at
      const rawDate = item.orcamento?.data_agendamento || item.orcamento?.created_at;
      if (!item.equipamento_id || !rawDate) return;
      
      const equipId = item.equipamento_id;
      const dateVal = new Date(rawDate).getTime();
      
      if (!mapEquip.has(equipId)) {
        mapEquip.set(equipId, { ...item, maxDate: dateVal });
      } else {
        if (dateVal > mapEquip.get(equipId).maxDate) {
          mapEquip.set(equipId, { ...item, maxDate: dateVal });
        }
      }
    });

    const overduesByClient = new Map();
    
    mapEquip.forEach((value) => {
      const limitMonths = value.orcamento?.meses_proxima_higienizacao || 6;
      const limitDays = limitMonths * 30; // Aproximação de meses para dias
      
      const daysPassed = Math.floor((now - value.maxDate) / (1000 * 3600 * 24));
      if (daysPassed >= limitDays) {
        const cliId = Array.isArray(value.equipamento?.cliente) ? value.equipamento.cliente[0]?.id : value.equipamento?.cliente?.id;
        
        if (cliId) {
          if (!overduesByClient.has(cliId)) {
            overduesByClient.set(cliId, {
              cliente: Array.isArray(value.equipamento?.cliente) ? value.equipamento.cliente[0] : value.equipamento?.cliente,
              equipamentos: [],
              daysPassed: daysPassed, // rastreia o mais atrasado
              notificado: false,
              orcamentoIdsToUpdate: []
            });
          }
          
          const clientGroup = overduesByClient.get(cliId);
          clientGroup.equipamentos.push({
            descricao: value.equipamento.descricao,
            local: value.equipamento.local,
            maxDate: value.maxDate,
            daysPassed: daysPassed,
            limitMonths: limitMonths
          });
          
          clientGroup.orcamentoIdsToUpdate.push(value.orcamento.id);
          
          if (daysPassed > clientGroup.daysPassed) {
            clientGroup.daysPassed = daysPassed;
          }
          
          // Se qualquer um dos equipamentos atrasados já foi notificado
          if (value.orcamento?.notificacao_enviada) {
            clientGroup.notificado = true;
          }
        }
      }
    });

    // Sort by most overdue
    const overdues = Array.from(overduesByClient.values());
    overdues.sort((a, b) => b.daysPassed - a.daysPassed);
    setNotifications(overdues);
  };

  const handleNotifyClient = async (notifIndex: number, orcamentoIds: string[], phone: string, message: string) => {
    // Atualiza estado local primeiro para resposta rápida
    const newNotifs = [...notifications];
    newNotifs[notifIndex].notificado = true;
    setNotifications(newNotifs);

    // Abre WhatsApp
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');

    // Atualiza no banco
    if (orcamentoIds.length > 0) {
      await supabase
        .from('orcamentos_os')
        .update({ notificacao_enviada: true })
        .in('id', orcamentoIds);
    }
  };

  const handleLogout = () => {
    document.cookie = 'master_auth=; path=/; max-age=0';
    document.cookie = 'master_role=; path=/; max-age=0';
    document.cookie = 'master_func_id=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          {logo && <img src={logo} alt="Logo" className="h-10 object-contain drop-shadow-sm" />}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{title}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="relative p-2 text-slate-400 hover:text-brand-orange bg-slate-100 hover:bg-orange-50 rounded-full transition-colors"
            title="Notificações"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-50"></span>
            )}
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
            title="Sair do sistema"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-orange via-brand-yellow to-transparent rounded-full mb-2 opacity-90"></div>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}

      {/* Notifications Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-brand-orange rounded-full flex items-center justify-center">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">Higienizações Vencidas</h3>
                  <p className="text-xs text-slate-500">Notifique os clientes para manutenção preventiva.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
                  <p className="font-bold text-lg text-slate-700">Tudo em dia!</p>
                  <p className="text-sm">Nenhum equipamento com higienização vencida.</p>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  {notifications.map((notif, idx) => {
                    const cli = notif.cliente;
                    const phone = cli?.telefone_whatsapp?.replace(/\D/g, '');
                    
                    const countEquips = notif.equipamentos.length;
                    const equipListStr = notif.equipamentos.map((e: any) => `${e.descricao} em ${e.local}`).join(', ');
                    
                    const message = encodeURIComponent(
                      `Olá ${cli?.nome}, tudo bem? Aqui é da Master Climatização. Notamos que a última higienização do(s) seu(s) equipamento(s) (${equipListStr}) está vencida ou prestes a vencer. Que tal agendarmos uma visita para garantir a qualidade do seu ar?`
                    );
                    
                    const isNotified = notif.notificado;
                    
                    return (
                      <div key={idx} className={`bg-white p-4 rounded-2xl border ${isNotified ? 'border-green-200 bg-green-50/30 opacity-75' : 'border-slate-200 hover:border-brand-orange/50'} shadow-sm flex flex-col sm:flex-row justify-between sm:items-start gap-4 transition-all`}>
                        <div className="flex-1">
                          <h4 className="font-black text-slate-800 flex items-center gap-2">
                            {cli?.nome} 
                            {isNotified && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Avisado</span>}
                          </h4>
                          <div className="mt-2 space-y-1">
                            {notif.equipamentos.map((eq: any, i: number) => (
                              <div key={i} className="text-sm">
                                <span className="font-bold text-brand-blue">{eq.descricao}</span> <span className="text-slate-400 font-normal">em {eq.local}</span>
                                <p className="text-[11px] text-slate-500">
                                  Última: <span className="font-bold text-slate-700">{new Date(eq.maxDate).toLocaleDateString('pt-BR')}</span> 
                                  <span className="text-red-500 font-bold ml-1">({eq.daysPassed} dias atrás)</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          {phone ? (
                            <button 
                              onClick={() => handleNotifyClient(idx, notif.orcamentoIdsToUpdate, phone, message)}
                              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg ${isNotified ? 'bg-slate-200 text-slate-600 hover:bg-slate-300 shadow-none' : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20'}`}
                            >
                              {isNotified ? <CheckCircle size={18} /> : <MessageCircle size={18} />} 
                              {isNotified ? 'Reenviar Aviso' : 'Avisar Cliente'}
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg text-center block">Sem WhatsApp</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
