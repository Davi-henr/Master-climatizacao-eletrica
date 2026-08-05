'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EditarOrcamentoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cadastros
  const [clientes, setClientes] = useState<any[]>([]);
  const [tabelaPrecos, setTabelaPrecos] = useState<any[]>([]);

  // Estados do Formulário
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [clienteEquipamentos, setClienteEquipamentos] = useState<any[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [urgencia, setUrgencia] = useState('Pouco Urgente');
  const [desconto, setDesconto] = useState<number | ''>('');
  
  // Blocos de Serviço
  const [blocos, setBlocos] = useState([{
    id: Date.now().toString(),
    equipamentoId: '',
    tipoServico: 'Instalação',
    itens: [] as { itemTabelaId: string, quantidade: number, tipo_custo: string, preco: number }[]
  }]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (clienteSelecionado) {
      const cliente = clientes.find(c => c.id === clienteSelecionado);
      if (cliente && cliente.equipamentos) {
        setClienteEquipamentos(cliente.equipamentos);
      } else {
        setClienteEquipamentos([]);
      }
    } else {
      setClienteEquipamentos([]);
    }
  }, [clienteSelecionado, clientes]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Cadastros
    const [clientesRes, precosRes, orcamentoRes] = await Promise.all([
      supabase.from('clientes').select('*, equipamentos(*)').order('nome'),
      supabase.from('tabela_precos').select('*, servico_materiais!servico_id(quantidade, material:tabela_precos!material_id(id, nome_item, valor_padrao))').order('nome_item'),
      supabase.from('orcamentos_os').select(`
        *,
        itens_os(
          item_id, quantidade, subtotal, equipamento_id, tipo_custo
        )
      `).eq('id', id).single()
    ]);

    if (clientesRes.data) setClientes(clientesRes.data);
    if (precosRes.data) setTabelaPrecos(precosRes.data);

    if (orcamentoRes.data) {
      const o = orcamentoRes.data;
      setClienteSelecionado(o.cliente_id);
      setObservacoes(o.observacoes || '');
      setUrgencia(o.urgencia || 'Pouco Urgente');
      setDesconto(o.valor_desconto || '');

      // Reconstruir os blocos a partir de itens_os
      const blocosMap = new Map();
      
      o.itens_os.forEach((item: any) => {
        const eqId = item.equipamento_id || 'geral';
        if (!blocosMap.has(eqId)) {
          blocosMap.set(eqId, {
            id: eqId === 'geral' ? Date.now().toString() : eqId,
            equipamentoId: eqId === 'geral' ? '' : eqId,
            tipoServico: o.tipo_servico || 'Instalação',
            itens: []
          });
        }
        
        blocosMap.get(eqId).itens.push({
          itemTabelaId: item.item_id,
          quantidade: item.quantidade,
          tipo_custo: item.tipo_custo,
          preco: item.subtotal / item.quantidade // Recuperar o preço unitário
        });
      });

      const blocosArray = Array.from(blocosMap.values());
      if (blocosArray.length > 0) {
        setBlocos(blocosArray);
      }
    }

    setLoading(false);
  };

  const calculateTotal = () => {
    let subtotal = 0;
    blocos.forEach(bloco => {
      bloco.itens.forEach(item => {
        subtotal += item.preco * item.quantidade;
      });
    });
    return subtotal - (Number(desconto) || 0);
  };

  const addBloco = () => {
    setBlocos([...blocos, { id: Date.now().toString(), equipamentoId: '', tipoServico: 'Instalação', itens: [] }]);
  };

  const removeBloco = (idToRemove: string) => {
    setBlocos(blocos.filter(b => b.id !== idToRemove));
  };

  const setEquipamentoParaBloco = (blocoId: string, equipamentoId: string) => {
    setBlocos(blocos.map(b => b.id === blocoId ? { ...b, equipamentoId } : b));
  };

  const addItemNoBloco = (blocoId: string, itemTabelaId: string) => {
    if (!itemTabelaId) return;
    const servico = tabelaPrecos.find(s => s.id === itemTabelaId);
    if (!servico) return;

    setBlocos(blocos.map(b => {
      if (b.id === blocoId) {
        const novosItens = [...b.itens, {
          itemTabelaId,
          quantidade: 1,
          tipo_custo: servico.tipo === 'peca' ? 'material' : 'mao_de_obra',
          preco: servico.valor_padrao
        }];

        if (servico.servico_materiais && servico.servico_materiais.length > 0) {
          servico.servico_materiais.forEach((mat: any) => {
            if (mat.material) {
              novosItens.push({
                itemTabelaId: mat.material.id,
                quantidade: mat.quantidade,
                tipo_custo: 'material',
                preco: mat.material.valor_padrao
              });
            }
          });
        }

        return {
          ...b,
          itens: novosItens
        };
      }
      return b;
    }));
  };

  const updateItemQuantidade = (blocoId: string, itemIndex: number, qtd: number) => {
    setBlocos(blocos.map(b => {
      if (b.id === blocoId) {
        const novosItens = [...b.itens];
        novosItens[itemIndex].quantidade = qtd;
        return { ...b, itens: novosItens };
      }
      return b;
    }));
  };

  const updateItemPreco = (blocoId: string, itemIndex: number, precoStr: string) => {
    const val = Number(precoStr.replace(',', '.'));
    setBlocos(blocos.map(b => {
      if (b.id === blocoId) {
        const novosItens = [...b.itens];
        novosItens[itemIndex].preco = isNaN(val) ? 0 : val;
        return { ...b, itens: novosItens };
      }
      return b;
    }));
  };

  const removeItemDoBloco = (blocoId: string, itemIndex: number) => {
    setBlocos(blocos.map(b => {
      if (b.id === blocoId) {
        const novosItens = [...b.itens];
        novosItens.splice(itemIndex, 1);
        return { ...b, itens: novosItens };
      }
      return b;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionado || blocos.length === 0) return;
    
    // Validar se tem pelo menos 1 item em algum bloco
    const temItens = blocos.some(b => b.itens.length > 0);
    if (!temItens) {
      alert('Adicione pelo menos um serviço ou peça ao orçamento.');
      return;
    }

    setSaving(true);

    try {
      // 1. Atualizar a OS pai
      const { error: osError } = await supabase
        .from('orcamentos_os')
        .update({
          cliente_id: clienteSelecionado,
          valor_total: calculateTotal(),
          valor_desconto: Number(desconto) || 0,
          observacoes: observacoes,
          urgencia: urgencia,
          tipo_servico: blocos[0]?.tipoServico || 'Instalação'
        })
        .eq('id', id);

      if (osError) throw osError;

      // 2. Deletar os itens antigos
      await supabase.from('itens_os').delete().eq('os_id', id);

      // 3. Preparar os itens_os (junção dos blocos)
      const insertItens: any[] = [];
      
      blocos.forEach(bloco => {
        bloco.itens.forEach(item => {
          insertItens.push({
            os_id: id,
            item_id: item.itemTabelaId,
            equipamento_id: bloco.equipamentoId || null,
            tipo_custo: item.tipo_custo,
            quantidade: item.quantidade,
            valor_unitario: item.preco,
            subtotal: item.preco * item.quantidade,
            tipo_servico: bloco.tipoServico || 'Instalação'
          });
        });
      });

      // 4. Inserir itens atualizados
      const { error: itensError } = await supabase.from('itens_os').insert(insertItens);
      if (itensError) throw itensError;

      router.push('/orcamentos');
    } catch (error) {
      alert('Erro ao atualizar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/orcamentos" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ArrowLeft size={20}/></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editar Orçamento</h1>
          <p className="text-sm text-slate-500">Altere blocos, peças e serviços</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* CLIENTE E INFOS BÁSICAS */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Cliente</label>
            <select 
              required value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)}
              className="w-full px-3 py-3 border border-slate-200 rounded-xl outline-none bg-slate-50 text-sm font-medium"
            >
              <option value="">-- Selecione o Cliente --</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Equipamentos / Serviços</h3>
            <button type="button" onClick={addBloco} className="text-sm font-bold text-brand-blue flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
              <Plus size={16}/> Adicionar Bloco
            </button>
          </div>

          {blocos.map((bloco, blocoIndex) => (
            <div key={bloco.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative">
              {blocos.length > 1 && (
                <button type="button" onClick={() => removeBloco(bloco.id)} className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                  <Trash2 size={16}/>
                </button>
              )}

              <div className="mb-4 pr-12 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Este bloco pertence a qual equipamento?</label>
                  <select 
                    value={bloco.equipamentoId} onChange={e => setEquipamentoParaBloco(bloco.id, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 text-sm"
                  >
                    <option value="">Geral (Sem equipamento específico)</option>
                    {clienteEquipamentos.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.descricao} ({eq.local})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Serviço (Cor no Calendário)</label>
                  <select 
                    required value={bloco.tipoServico} onChange={e => {
                      const newB = [...blocos];
                      const b = newB.find(x => x.id === bloco.id);
                      if(b) b.tipoServico = e.target.value;
                      setBlocos(newB);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 text-sm"
                  >
                    <option value="Instalação">Instalação (Azul)</option>
                    <option value="Limpeza">Limpeza (Verde)</option>
                    <option value="Reparo">Reparo (Laranja)</option>
                    <option value="Outro">Outro (Cinza)</option>
                  </select>
                </div>
              </div>

              {/* Lista de Itens do Bloco */}
              <div className="space-y-2 mb-4">
                {bloco.itens.map((item, itemIdx) => {
                  const sRef = tabelaPrecos.find(t => t.id === item.itemTabelaId);
                  return (
                    <div key={itemIdx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{sRef?.nome_item}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-500">{item.tipo_custo === 'material' ? 'Peça' : 'Mão de Obra'}</p>
                      </div>
                      
                      <div className="w-16">
                        <label className="text-[10px] font-bold text-slate-400">Qtd</label>
                        <input type="number" min="1" value={item.quantidade} onChange={e => updateItemQuantidade(bloco.id, itemIdx, Number(e.target.value))} className="w-full px-2 py-1 text-sm border rounded text-center" />
                      </div>
                      
                      <div className="w-24">
                        <label className="text-[10px] font-bold text-slate-400">R$ Unit</label>
                        <input type="number" step="0.01" value={item.preco} onChange={e => updateItemPreco(bloco.id, itemIdx, e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                      </div>

                      <button type="button" onClick={() => removeItemDoBloco(bloco.id, itemIdx)} className="p-2 text-red-400 hover:text-red-600 mt-4">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Adicionar Item ao Bloco */}
              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                <label className="block text-xs font-bold text-brand-orange mb-1">Adicionar Peça ou Serviço a este bloco</label>
                <select 
                  value="" onChange={e => addItemNoBloco(bloco.id, e.target.value)}
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg outline-none bg-white text-sm text-slate-600"
                >
                  <option value="">Selecione para adicionar...</option>
                  {tabelaPrecos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome_item} - R$ {p.valor_padrao.toFixed(2)}</option>
                  ))}
                </select>
              </div>

            </div>
          ))}
        </div>

        {/* OBSERVAÇÕES E TOTAL */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Observações do Orçamento</label>
            <textarea 
              value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
              placeholder="Garantia de 90 dias, validade de 15 dias, etc."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none bg-slate-50 text-sm"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-500">Desconto (R$)</label>
              <input 
                type="number" step="0.01" min="0" 
                value={desconto} onChange={e => setDesconto(Number(e.target.value))}
                placeholder="0.00"
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg outline-none text-right font-bold text-slate-700 bg-slate-50"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="block text-xs text-slate-500 uppercase font-bold tracking-wider">Valor Total</span>
              <span className="text-3xl font-black text-brand-orange">R$ {calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <button 
            type="submit" disabled={saving || !clienteSelecionado}
            className="w-full py-4 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
          >
            <Save size={20}/> {saving ? 'Salvando...' : 'Atualizar Orçamento'}
          </button>
        </div>

      </form>
    </div>
  );
}
