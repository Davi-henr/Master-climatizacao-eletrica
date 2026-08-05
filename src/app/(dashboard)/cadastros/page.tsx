'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Briefcase, Wrench, Settings, Plus, Image as ImageIcon, Trash2, Edit } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default function CadastrosPage() {
  const [activeTab, setActiveTab] = useState<'clientes' | 'funcionarios' | 'servicos' | 'empresa'>('clientes');
  const [loading, setLoading] = useState(false);

  // Estados dos Formulários e Listas
  const [clientes, setClientes] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [logo, setLogo] = useState<string>('');

  // Estados de Edição
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [editingFuncionarioId, setEditingFuncionarioId] = useState<string | null>(null);
  const [editingServicoId, setEditingServicoId] = useState<string | null>(null);

  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone_whatsapp: '', endereco_rua: '', endereco_numero: '', endereco_bairro: '', tipo_pessoa: 'F', documento: '' });
  const [equipamentosCliente, setEquipamentosCliente] = useState<any[]>([{ descricao: '', local: '' }]);
  
  const [novoFuncionario, setNovoFuncionario] = useState({ nome: '', cargo: '', valor_diaria: '', chave_pix: '' });
  const [novoServico, setNovoServico] = useState({ nome_item: '', tipo: 'mao_de_obra', valor_padrao: '' });
  const [materiaisVinculados, setMateriaisVinculados] = useState<any[]>([]);

  const formatPhone = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 7) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
  };

  const formatDoc = (val: string, tipo: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (tipo === 'F') { 
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.substring(0,3)}.${cleaned.substring(3)}`;
      if (cleaned.length <= 9) return `${cleaned.substring(0,3)}.${cleaned.substring(3,6)}.${cleaned.substring(6)}`;
      return `${cleaned.substring(0,3)}.${cleaned.substring(3,6)}.${cleaned.substring(6,9)}-${cleaned.substring(9, 11)}`;
    } else { 
      if (cleaned.length <= 2) return cleaned;
      if (cleaned.length <= 5) return `${cleaned.substring(0,2)}.${cleaned.substring(2)}`;
      if (cleaned.length <= 8) return `${cleaned.substring(0,2)}.${cleaned.substring(2,5)}.${cleaned.substring(5)}`;
      if (cleaned.length <= 12) return `${cleaned.substring(0,2)}.${cleaned.substring(2,5)}.${cleaned.substring(5,8)}/${cleaned.substring(8)}`;
      return `${cleaned.substring(0,2)}.${cleaned.substring(2,5)}.${cleaned.substring(5,8)}/${cleaned.substring(8, 12)}-${cleaned.substring(12, 14)}`;
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'clientes') {
      const { data } = await supabase.from('clientes').select('*, equipamentos(id, descricao, local)').order('nome');
      setClientes(data || []);
    } else if (activeTab === 'funcionarios') {
      const { data } = await supabase.from('funcionarios').select('*').order('nome');
      setFuncionarios(data || []);
    } else if (activeTab === 'servicos') {
      const { data } = await supabase.from('tabela_precos').select('*, servico_materiais!servico_id(material_id, quantidade)').order('nome_item');
      setServicos(data || []);
    } else if (activeTab === 'empresa') {
      const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'logo_base64').single();
      if (data) setLogo(data.valor);
    }
    setLoading(false);
  };

  const resetClienteForm = () => {
    setEditingClienteId(null);
    setNovoCliente({ nome: '', telefone_whatsapp: '', endereco_rua: '', endereco_numero: '', endereco_bairro: '', tipo_pessoa: 'F', documento: '' });
    setEquipamentosCliente([{ descricao: '', local: '' }]);
  };

  const handleEditCliente = (c: any) => {
    setEditingClienteId(c.id);
    setNovoCliente({ 
      nome: c.nome, 
      telefone_whatsapp: c.telefone_whatsapp || '', 
      endereco_rua: c.endereco_rua || '',
      endereco_numero: c.endereco_numero || '',
      endereco_bairro: c.endereco_bairro || '',
      tipo_pessoa: c.tipo_pessoa || 'F',
      documento: c.documento || ''
    });
    setEquipamentosCliente(c.equipamentos?.length > 0 ? c.equipamentos : [{ descricao: '', local: '' }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let clienteId = editingClienteId;

      if (editingClienteId) {
        await supabase.from('clientes').update(novoCliente).eq('id', editingClienteId);
      } else {
        const { data: cData, error: cError } = await supabase.from('clientes').insert(novoCliente).select().single();
        if (cError) throw cError;
        clienteId = cData.id;
      }

      // Deleta equipamentos antigos e insere os novos (forma mais simples de atualizar a lista)
      if (editingClienteId) {
        await supabase.from('equipamentos').delete().eq('cliente_id', editingClienteId);
      }

      const equipToInsert = equipamentosCliente.filter(eq => eq.descricao).map(eq => ({
        cliente_id: clienteId,
        descricao: eq.descricao,
        local: eq.local
      }));

      if (equipToInsert.length > 0) {
        await supabase.from('equipamentos').insert(equipToInsert);
      }

      resetClienteForm();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar cliente.');
    }
  };

  const handleEditFuncionario = (f: any) => {
    setEditingFuncionarioId(f.id);
    setNovoFuncionario({ nome: f.nome, cargo: f.cargo, valor_diaria: String(f.valor_diaria), chave_pix: f.chave_pix || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataObj = {
      ...novoFuncionario,
      valor_diaria: Number(novoFuncionario.valor_diaria.replace(',', '.'))
    };

    if (editingFuncionarioId) {
      await supabase.from('funcionarios').update(dataObj).eq('id', editingFuncionarioId);
    } else {
      await supabase.from('funcionarios').insert(dataObj);
    }
    
    setEditingFuncionarioId(null);
    setNovoFuncionario({ nome: '', cargo: '', valor_diaria: '', chave_pix: '' });
    fetchData();
  };

  const handleEditServico = (s: any) => {
    setEditingServicoId(s.id);
    setNovoServico({ nome_item: s.nome_item, tipo: s.tipo === 'peca' ? 'peca' : 'mao_de_obra', valor_padrao: String(s.valor_padrao) });
    setMateriaisVinculados(s.servico_materiais || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveServico = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataObj = {
      nome_item: novoServico.nome_item,
      tipo: novoServico.tipo === 'peca' ? 'peca' : 'servico',
      valor_padrao: Number(novoServico.valor_padrao.replace(',', '.'))
    };

    let servicoId = editingServicoId;

    if (editingServicoId) {
      await supabase.from('tabela_precos').update(dataObj).eq('id', editingServicoId);
    } else {
      const { data: sData, error: sError } = await supabase.from('tabela_precos').insert(dataObj).select().single();
      if (sError) {
        alert('Erro ao salvar serviço. Detalhes no console.');
        console.error(sError);
        return;
      }
      servicoId = sData.id;
    }

    if (dataObj.tipo === 'servico' && servicoId) {
      await supabase.from('servico_materiais').delete().eq('servico_id', servicoId);
      
      const matToInsert = materiaisVinculados.filter(m => m.material_id).map(m => ({
        servico_id: servicoId,
        material_id: m.material_id,
        quantidade: m.quantidade
      }));

      if (matToInsert.length > 0) {
        await supabase.from('servico_materiais').insert(matToInsert);
      }
    }

    setEditingServicoId(null);
    setNovoServico({ nome_item: '', tipo: 'mao_de_obra', valor_padrao: '' });
    setMateriaisVinculados([]);
    fetchData();
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Erro ao excluir. O registro pode estar sendo usado em orçamentos.');
    }
  };

  const saveLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64Compressed = canvas.toDataURL('image/jpeg', 0.8);
        setLogo(base64Compressed);
        
        await supabase.from('configuracoes').upsert({ chave: 'logo_base64', valor: base64Compressed }, { onConflict: 'chave' });
        window.location.reload();
      };
    };
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Cadastros" subtitle="Gerencie todos os dados base do sistema" />

      <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100 p-1 no-scrollbar gap-1">
        {[
          { id: 'clientes', icon: Users, label: 'Clientes' },
          { id: 'funcionarios', icon: Briefcase, label: 'Equipe' },
          { id: 'servicos', icon: Wrench, label: 'Preços' },
          { id: 'empresa', icon: Settings, label: 'Logo' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); resetClienteForm(); setEditingFuncionarioId(null); setEditingServicoId(null); }}
            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-brand-orange text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={20} className="mb-1" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="p-4 sm:p-6 space-y-6">
            <form onSubmit={saveCliente} className="space-y-4 border-b border-slate-100 pb-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {editingClienteId ? <Edit size={18}/> : <Plus size={18}/>} 
                  {editingClienteId ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                {editingClienteId && (
                  <button type="button" onClick={resetClienteForm} className="text-sm text-slate-500 underline">Cancelar Edição</button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" required placeholder="Nome do Cliente" value={novoCliente.nome} onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                <input type="text" required placeholder="WhatsApp (14) 99999-9999" maxLength={15} value={novoCliente.telefone_whatsapp} onChange={e => setNovoCliente({...novoCliente, telefone_whatsapp: formatPhone(e.target.value)})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>

              <div className="flex gap-4 mb-2 items-center">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="radio" checked={novoCliente.tipo_pessoa === 'F'} onChange={() => setNovoCliente({...novoCliente, tipo_pessoa: 'F', documento: ''})} />
                  Pessoa Física (CPF)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="radio" checked={novoCliente.tipo_pessoa === 'J'} onChange={() => setNovoCliente({...novoCliente, tipo_pessoa: 'J', documento: ''})} />
                  Pessoa Jurídica (CNPJ)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder={novoCliente.tipo_pessoa === 'F' ? 'CPF' : 'CNPJ'} value={novoCliente.documento} onChange={e => setNovoCliente({...novoCliente, documento: formatDoc(e.target.value, novoCliente.tipo_pessoa)})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                <input type="text" placeholder="Bairro" value={novoCliente.endereco_bairro} onChange={e => setNovoCliente({...novoCliente, endereco_bairro: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <input type="text" placeholder="Rua / Avenida" value={novoCliente.endereco_rua} onChange={e => setNovoCliente({...novoCliente, endereco_rua: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                </div>
                <div>
                  <input type="text" placeholder="Nº" value={novoCliente.endereco_numero} onChange={e => setNovoCliente({...novoCliente, endereco_numero: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipamentos do Cliente</h4>
                {equipamentosCliente.map((eq, idx) => (
                  <div key={idx} className="flex gap-2 relative">
                    <input type="text" placeholder="Ex: Split 12.000 BTUs LG" value={eq.descricao} onChange={e => {
                      const list = [...equipamentosCliente]; list[idx].descricao = e.target.value; setEquipamentosCliente(list);
                    }} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm" />
                    
                    <input type="text" placeholder="Local: Quarto" value={eq.local} onChange={e => {
                      const list = [...equipamentosCliente]; list[idx].local = e.target.value; setEquipamentosCliente(list);
                    }} className="w-1/3 px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm" />
                    
                    {equipamentosCliente.length > 1 && (
                      <button type="button" onClick={() => {
                        const list = [...equipamentosCliente]; list.splice(idx, 1); setEquipamentosCliente(list);
                      }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setEquipamentosCliente([...equipamentosCliente, { descricao: '', local: '' }])} className="text-sm font-bold text-brand-blue flex items-center gap-1 mt-2">
                  <Plus size={14} /> Adicionar outro equipamento
                </button>
              </div>

              <button type="submit" className="w-full py-2 bg-brand-blue text-white rounded-lg font-medium">
                {editingClienteId ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
              </button>
            </form>
            
            <div>
              <h3 className="font-bold text-slate-800 mb-4">Clientes Ativos</h3>
              {loading ? <p>Carregando...</p> : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {clientes.map(c => (
                    <div key={c.id} className={`p-3 rounded-xl border flex justify-between items-start ${editingClienteId === c.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                        <p className="font-bold text-slate-800">{c.nome} {c.documento && <span className="text-xs font-normal text-slate-500 ml-2">({c.documento})</span>}</p>
                        <p className="text-sm text-slate-500">{c.telefone_whatsapp}</p>
                        {c.endereco_rua && (
                          <p className="text-xs text-slate-500 mt-1">
                            {c.endereco_rua}, {c.endereco_numero} - {c.endereco_bairro}
                          </p>
                        )}
                        {c.equipamentos?.length > 0 && (
                          <div className="mt-2 text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                            <span className="font-bold">Equipamentos:</span> {c.equipamentos.map((e: any) => e.descricao).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditCliente(c)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete('clientes', c.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FUNCIONÁRIOS */}
        {activeTab === 'funcionarios' && (
          <div className="p-4 sm:p-6 space-y-6">
            <form onSubmit={saveFuncionario} className="space-y-4 border-b border-slate-100 pb-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {editingFuncionarioId ? <Edit size={18}/> : <Plus size={18}/>} 
                  {editingFuncionarioId ? 'Editar Funcionário' : 'Novo Funcionário'}
                </h3>
                {editingFuncionarioId && (
                  <button type="button" onClick={() => { setEditingFuncionarioId(null); setNovoFuncionario({nome:'', cargo:'', valor_diaria:'', chave_pix:''})}} className="text-sm text-slate-500 underline">Cancelar Edição</button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" required placeholder="Nome" value={novoFuncionario.nome} onChange={e => setNovoFuncionario({...novoFuncionario, nome: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                <input type="text" placeholder="Chave PIX (Opcional)" value={novoFuncionario.chave_pix} onChange={e => setNovoFuncionario({...novoFuncionario, chave_pix: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" required placeholder="Cargo (Ex: Técnico)" value={novoFuncionario.cargo} onChange={e => setNovoFuncionario({...novoFuncionario, cargo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                <input type="text" required placeholder="Valor Diária (Ex: 150)" value={novoFuncionario.valor_diaria} onChange={e => setNovoFuncionario({...novoFuncionario, valor_diaria: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>
              <button type="submit" className="w-full py-2 bg-brand-blue text-white rounded-lg font-medium">
                {editingFuncionarioId ? 'Atualizar Funcionário' : 'Cadastrar Funcionário'}
              </button>
            </form>
            
            <div>
              <h3 className="font-bold text-slate-800 mb-4">Equipe Atual</h3>
              {loading ? <p>Carregando...</p> : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {funcionarios.map(f => (
                    <div key={f.id} className={`p-3 rounded-xl border flex justify-between items-center ${editingFuncionarioId === f.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                        <p className="font-bold text-slate-800">{f.nome}</p>
                        <p className="text-sm text-slate-500">{f.cargo}</p>
                        {f.chave_pix && <p className="text-xs text-brand-blue mt-1">PIX: {f.chave_pix}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-brand-orange mr-2">R$ {f.valor_diaria}</span>
                        <button onClick={() => handleEditFuncionario(f)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete('funcionarios', f.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SERVIÇOS E PREÇOS */}
        {activeTab === 'servicos' && (
          <div className="p-4 sm:p-6 space-y-6">
            <form onSubmit={saveServico} className="space-y-4 border-b border-slate-100 pb-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {editingServicoId ? <Edit size={18}/> : <Plus size={18}/>} 
                  {editingServicoId ? 'Editar Item' : 'Novo Item / Mão de Obra'}
                </h3>
                {editingServicoId && (
                  <button type="button" onClick={() => { setEditingServicoId(null); setNovoServico({nome_item:'', tipo:'mao_de_obra', valor_padrao:''}); setMateriaisVinculados([])}} className="text-sm text-slate-500 underline">Cancelar Edição</button>
                )}
              </div>
              
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="radio" checked={novoServico.tipo === 'mao_de_obra'} onChange={() => setNovoServico({...novoServico, tipo: 'mao_de_obra'})} />
                  Mão de Obra
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="radio" checked={novoServico.tipo === 'peca'} onChange={() => setNovoServico({...novoServico, tipo: 'peca'})} />
                  Material / Peça
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="text" required placeholder={novoServico.tipo === 'mao_de_obra' ? 'Ex: Limpeza de Split' : 'Ex: Tubulação (Metro)'} value={novoServico.nome_item} onChange={e => setNovoServico({...novoServico, nome_item: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                <input type="text" required placeholder="Valor Padrão" value={novoServico.valor_padrao} onChange={e => setNovoServico({...novoServico, valor_padrao: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
              </div>

              {novoServico.tipo === 'mao_de_obra' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Materiais Vinculados (Inclusos na Mão de Obra)</h4>
                  {materiaisVinculados.map((mv, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select 
                        value={mv.material_id} 
                        onChange={(e) => {
                          const list = [...materiaisVinculados]; list[idx].material_id = e.target.value; setMateriaisVinculados(list);
                        }} 
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white"
                      >
                        <option value="">Selecione um material...</option>
                        {servicos.filter(s => s.tipo === 'peca').map(s => (
                          <option key={s.id} value={s.id}>{s.nome_item} (R$ {s.valor_padrao})</option>
                        ))}
                      </select>
                      <input 
                        type="number" min="0.1" step="0.1" placeholder="Qtd" 
                        value={mv.quantidade} 
                        onChange={e => {
                          const list = [...materiaisVinculados]; list[idx].quantidade = Number(e.target.value); setMateriaisVinculados(list);
                        }} 
                        className="w-20 px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm" 
                      />
                      <button type="button" onClick={() => {
                        const list = [...materiaisVinculados]; list.splice(idx, 1); setMateriaisVinculados(list);
                      }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setMateriaisVinculados([...materiaisVinculados, { material_id: '', quantidade: 1 }])} className="text-sm font-bold text-brand-blue flex items-center gap-1 mt-2">
                    <Plus size={14} /> Adicionar material
                  </button>
                </div>
              )}

              <button type="submit" className="w-full py-2 bg-brand-blue text-white rounded-lg font-medium">
                {editingServicoId ? 'Atualizar Tabela' : 'Salvar na Tabela'}
              </button>
            </form>
            
            <div>
              <h3 className="font-bold text-slate-800 mb-4">Tabela de Preços Ativos</h3>
              {loading ? <p>Carregando...</p> : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {servicos.map(s => (
                    <div key={s.id} className={`p-3 rounded-xl border flex justify-between items-center ${editingServicoId === s.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                        <p className="font-medium text-slate-800">{s.nome_item}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{s.tipo === 'servico' ? 'Mão de Obra' : 'Material'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-600 mr-2">R$ {s.valor_padrao}</span>
                        <button onClick={() => handleEditServico(s)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete('tabela_precos', s.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EMPRESA (LOGO) */}
        {activeTab === 'empresa' && (
          <div className="p-4 sm:p-6 space-y-6 text-center">
            <h3 className="font-bold text-slate-800 mb-2">Identidade Visual</h3>
            <p className="text-sm text-slate-500 mb-6">Esta logo aparecerá no topo do sistema e nos PDFs de orçamento.</p>
            
            <div className="flex flex-col items-center justify-center space-y-4">
              {logo ? (
                <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50">
                  <img src={logo} alt="Logo Atual" className="h-20 object-contain" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <ImageIcon size={32} />
                </div>
              )}
              
              <label className="cursor-pointer bg-brand-orange hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                Selecionar Nova Logo
                <input type="file" accept="image/*" className="hidden" onChange={saveLogo} />
              </label>
              
              <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
                Dica: O sistema otimiza e comprime a foto automaticamente para salvar com segurança.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
