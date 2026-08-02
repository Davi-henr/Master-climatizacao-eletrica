'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [clientes, setClientes] = useState<any[]>([]);
  const [tabelaPrecos, setTabelaPrecos] = useState<any[]>([]);
  
  // Cliente selecionado
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [clienteEquipamentos, setClienteEquipamentos] = useState<any[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [urgencia, setUrgencia] = useState('Pouco Urgente');
  
  // Blocos de Serviço
  const [blocos, setBlocos] = useState([{
    equipamentoId: '',
    tipoServico: 'Instalação',
    itens: [
      { tabelaId: '', nome: '', tipo_custo: 'mao_de_obra', quantidade: 1, valor_unitario: '' as number | string }
    ]
  }]);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (clienteSelecionado) {
      const cliente = clientes.find(c => c.id === clienteSelecionado);
      setClienteEquipamentos(cliente?.equipamentos || []);
      
      // Reseta os equipamentos dos blocos se mudar o cliente
      const newBlocos = blocos.map(b => ({ ...b, equipamentoId: '' }));
      setBlocos(newBlocos);
    } else {
      setClienteEquipamentos([]);
    }
  }, [clienteSelecionado]);

  const fetchBaseData = async () => {
    const { data: cData } = await supabase.from('clientes').select('id, nome, equipamentos(id, descricao, local)').order('nome');
    if (cData) setClientes(cData);

    const { data: pData } = await supabase.from('tabela_precos').select('*').order('nome_item');
    if (pData) setTabelaPrecos(pData);
  };

  const handleAddBloco = () => {
    setBlocos([...blocos, {
      equipamentoId: '',
      tipoServico: 'Instalação',
      itens: [{ tabelaId: '', nome: '', tipo_custo: 'mao_de_obra', quantidade: 1, valor_unitario: '' }]
    }]);
  };

  const handleRemoveBloco = (bIndex: number) => {
    const newBlocos = [...blocos];
    newBlocos.splice(bIndex, 1);
    setBlocos(newBlocos);
  };

  const handleAddItem = (bIndex: number) => {
    const newBlocos = [...blocos];
    newBlocos[bIndex].itens.push({ tabelaId: '', nome: '', tipo_custo: 'mao_de_obra', quantidade: 1, valor_unitario: '' });
    setBlocos(newBlocos);
  };

  const handleRemoveItem = (bIndex: number, iIndex: number) => {
    const newBlocos = [...blocos];
    newBlocos[bIndex].itens.splice(iIndex, 1);
    setBlocos(newBlocos);
  };

  const handleChangePrecoTabela = (bIndex: number, iIndex: number, tabelaId: string) => {
    const newBlocos = [...blocos];
    const precoRef = tabelaPrecos.find(p => p.id === tabelaId);
    
    if (precoRef) {
      newBlocos[bIndex].itens[iIndex].tabelaId = precoRef.id;
      newBlocos[bIndex].itens[iIndex].nome = precoRef.nome_item;
      newBlocos[bIndex].itens[iIndex].tipo_custo = precoRef.tipo === 'peca' ? 'material' : 'mao_de_obra';
      newBlocos[bIndex].itens[iIndex].valor_unitario = precoRef.valor_padrao;
    } else {
      newBlocos[bIndex].itens[iIndex].tabelaId = '';
      newBlocos[bIndex].itens[iIndex].nome = '';
      newBlocos[bIndex].itens[iIndex].valor_unitario = '';
    }
    setBlocos(newBlocos);
  };

  const handleChangeItemText = (bIndex: number, iIndex: number, field: string, value: any) => {
    const newBlocos = [...blocos];
    (newBlocos[bIndex].itens[iIndex] as any)[field] = value;
    setBlocos(newBlocos);
  };

  const calculateTotal = () => {
    return blocos.reduce((acc, bloco) => {
      const blocoTotal = bloco.itens.reduce((sum, item) => {
        const val = Number(item.valor_unitario) || 0;
        return sum + (item.quantidade * val);
      }, 0);
      return acc + blocoTotal;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionado) {
      alert('Selecione um cliente!');
      return;
    }
    
    setLoading(true);

    try {
      // 1. Criar Orçamento Base (Header)
      const { data: orcamentoData, error: orcamentoError } = await supabase
        .from('orcamentos_os')
        .insert({
          cliente_id: clienteSelecionado,
          status: 'orcamento_pendente',
          valor_total: calculateTotal(),
          observacoes: observacoes,
          urgencia: urgencia,
          tipo_servico: blocos[0].tipoServico || 'Instalação'
        })
        .select()
        .single();
      if (orcamentoError) throw orcamentoError;

      // 2. Preparar Itens (Lidando com os blocos)
      let itensToInsert: any[] = [];
      
      for (const bloco of blocos) {
        if (!bloco.equipamentoId) throw new Error("Selecione o equipamento em todos os blocos.");
        
        for (const item of bloco.itens) {
          // Se não veio da tabela, precisa cadastrar na tabela primeiro para ter ID
          let itemTabelaId = item.tabelaId;
          
          if (!itemTabelaId && item.nome) {
            const { data: precoData, error: precoError } = await supabase
              .from('tabela_precos')
              .insert({
                nome_item: item.nome,
                tipo: item.tipo_custo === 'material' ? 'peca' : 'servico',
                valor_padrao: Number(item.valor_unitario)
              })
              .select().single();
            if (precoError) throw precoError;
            itemTabelaId = precoData.id;
          }

          if (itemTabelaId) {
            itensToInsert.push({
              os_id: orcamentoData.id,
              equipamento_id: bloco.equipamentoId,
              tipo_servico: bloco.tipoServico,
              item_id: itemTabelaId,
              tipo_custo: item.tipo_custo,
              quantidade: item.quantidade,
              valor_unitario: Number(item.valor_unitario),
              subtotal: item.quantidade * Number(item.valor_unitario)
            });
          }
        }
      }

      if (itensToInsert.length > 0) {
        const { error: itensOsError } = await supabase.from('itens_os').insert(itensToInsert);
        if (itensOsError) throw itensOsError;
      }

      router.push('/orcamentos');
      router.refresh();

    } catch (error: any) {
      console.error('Erro ao salvar orçamento:', error);
      alert(error.message || 'Ocorreu um erro ao salvar o orçamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/orcamentos" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Novo Orçamento</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Bloco Cliente */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            Cliente
          </h2>

          <div>
            <select 
              required value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)}
              className="w-full px-3 py-3 border border-slate-200 rounded-xl outline-none bg-slate-50 text-sm font-medium"
            >
              <option value="">-- Selecione o Cliente --</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {!clienteSelecionado && (
              <p className="text-xs text-slate-500 mt-2">Dica: Se o cliente não existir, cadastre-o primeiro na aba Cadastros.</p>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nível de Urgência (Controle Interno)</label>
            <select 
              value={urgencia} onChange={e => setUrgencia(e.target.value)}
              className="w-full px-3 py-3 border border-slate-200 rounded-xl outline-none bg-slate-50 text-sm font-medium"
            >
              <option value="Pouco Urgente">🟢 Pouco Urgente</option>
              <option value="Urgente">🟡 Urgente</option>
              <option value="Muito Urgente">🔴 Muito Urgente</option>
            </select>
          </div>
        </div>

        {/* Múltiplos Blocos de Serviço */}
        {clienteSelecionado && blocos.map((bloco, bIndex) => (
          <div key={bIndex} className="bg-white p-4 rounded-2xl shadow-sm border-2 border-slate-100 space-y-4 relative">
            
            {blocos.length > 1 && (
              <button type="button" onClick={() => handleRemoveBloco(bIndex)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg">
                <Trash2 size={16} />
              </button>
            )}

            <h2 className="font-bold text-brand-blue flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
              Serviço {bIndex + 1}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Qual Equipamento?</label>
                <select 
                  required value={bloco.equipamentoId} onChange={e => {
                    const newB = [...blocos]; newB[bIndex].equipamentoId = e.target.value; setBlocos(newB);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white text-sm"
                >
                  <option value="">-- Selecione o Equipamento --</option>
                  {clienteEquipamentos.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.descricao} ({eq.local})</option>
                  ))}
                </select>
                {clienteEquipamentos.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Este cliente não possui equipamentos cadastrados.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Serviço (Cor no Calendário)</label>
                <select 
                  required value={bloco.tipoServico} onChange={e => {
                    const newB = [...blocos]; newB[bIndex].tipoServico = e.target.value; setBlocos(newB);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white text-sm"
                >
                  <option value="Instalação">Instalação (Azul)</option>
                  <option value="Limpeza">Limpeza (Verde)</option>
                  <option value="Reparo">Reparo (Laranja)</option>
                  <option value="Outro">Outro (Cinza)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 space-y-3 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Custos deste Serviço</h3>
              
              {bloco.itens.map((item, iIndex) => (
                <div key={iIndex} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 relative">
                  
                  {bloco.itens.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(bIndex, iIndex)} className="absolute top-2 right-2 text-red-400 p-1">
                      <Trash2 size={16} />
                    </button>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Puxar do Cadastro (Opcional)</label>
                    <select 
                      value={item.tabelaId} onChange={e => handleChangePrecoTabela(bIndex, iIndex, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-slate-50"
                    >
                      <option value="">-- Digitar Manualmente --</option>
                      {tabelaPrecos.map(p => (
                        <option key={p.id} value={p.id}>{p.nome_item} (R$ {p.valor_padrao})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input type="text" required placeholder="Descrição do Item/Serviço" value={item.nome} onChange={e => handleChangeItemText(bIndex, iIndex, 'nome', e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded text-sm outline-none" />
                    </div>
                    <div>
                      <select value={item.tipo_custo} onChange={e => handleChangeItemText(bIndex, iIndex, 'tipo_custo', e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded text-xs outline-none">
                        <option value="mao_de_obra">Serviço</option>
                        <option value="material">Material</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" min="1" placeholder="Qtd" required value={item.quantidade} onChange={e => handleChangeItemText(bIndex, iIndex, 'quantidade', Number(e.target.value))} className="w-1/3 px-2 py-2 border border-slate-200 rounded text-sm text-center outline-none" />
                      <input type="number" step="0.01" min="0" placeholder="R$ Unit" required value={item.valor_unitario} onChange={e => handleChangeItemText(bIndex, iIndex, 'valor_unitario', e.target.value)} className="w-2/3 px-2 py-2 border border-slate-200 rounded text-sm outline-none" />
                    </div>
                  </div>
                </div>
              ))}
              
              <button type="button" onClick={() => handleAddItem(bIndex)} className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-white text-xs">
                <Plus size={14} /> Adicionar Custo a este Serviço
              </button>
            </div>

          </div>
        ))}

        {clienteSelecionado && (
          <button type="button" onClick={handleAddBloco} className="w-full py-3 bg-blue-50 text-brand-blue rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm border border-blue-100">
            <Plus size={18} /> Adicionar Outro Equipamento
          </button>
        )}

        {/* Resumo */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-end">
            <p className="text-slate-400 text-sm font-medium">Total do Orçamento</p>
            <h3 className="text-3xl font-black text-brand-yellow">
              R$ {calculateTotal().toFixed(2).replace('.', ',')}
            </h3>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-orange/20">
            {loading ? 'Salvando Orçamento...' : 'Finalizar Proposta'}
            <Save size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
