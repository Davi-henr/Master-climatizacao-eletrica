'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowUpCircle, ArrowDownCircle, Plus, Trash2, Wallet, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Movimentacao = {
  id: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  valor: number;
  data_lancamento: string;
  descricao: string;
};

export default function FinanceiroPage() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Totais
  const [saldo, setSaldo] = useState(0);
  const [receitas, setReceitas] = useState(0);
  const [despesas, setDespesas] = useState(0);

  // Formulario Lançamento Manual
  const [showForm, setShowForm] = useState(false);
  const [novoLancamento, setNovoLancamento] = useState({
    tipo: 'despesa',
    categoria: 'outros',
    valor: '',
    descricao: ''
  });

  useEffect(() => {
    fetchFinanceiro();
  }, []);

  const fetchFinanceiro = async () => {
    try {
      const { data, error } = await supabase
        .from('financeiro')
        .select('*')
        .order('data_lancamento', { ascending: false });

      if (error) throw error;
      
      const movs = data || [];
      setMovimentacoes(movs);

      // Calcular totais
      let totalRec = 0;
      let totalDesp = 0;
      movs.forEach(m => {
        if (m.tipo === 'receita') totalRec += Number(m.valor);
        else totalDesp += Number(m.valor);
      });

      setReceitas(totalRec);
      setDespesas(totalDesp);
      setSaldo(totalRec - totalDesp);

    } catch (error) {
      console.error('Erro ao buscar financeiro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLancar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoLancamento.valor || !novoLancamento.descricao) return;

    try {
      const { error } = await supabase
        .from('financeiro')
        .insert({
          tipo: novoLancamento.tipo,
          categoria: novoLancamento.categoria,
          valor: Number(novoLancamento.valor.replace(',', '.')),
          descricao: novoLancamento.descricao
        });

      if (error) throw error;

      setShowForm(false);
      setNovoLancamento({ tipo: 'despesa', categoria: 'outros', valor: '', descricao: '' });
      fetchFinanceiro();
    } catch (error) {
      console.error('Erro ao lançar:', error);
      alert('Erro ao realizar lançamento.');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Fluxo de Caixa" subtitle="Controle financeiro da empresa" />

      <div className="flex justify-end">
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          Lançamento Manual
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Saldo Atual</p>
            <h3 className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {saldo.toFixed(2).replace('.', ',')}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Total de Entradas</p>
            <h3 className="text-2xl font-bold text-slate-800">R$ {receitas.toFixed(2).replace('.', ',')}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Total de Saídas</p>
            <h3 className="text-2xl font-bold text-slate-800">R$ {despesas.toFixed(2).replace('.', ',')}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <TrendingDown size={24} />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Novo Lançamento Manual</h2>
          <form onSubmit={handleLancar} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select 
                value={novoLancamento.tipo} onChange={e => setNovoLancamento({...novoLancamento, tipo: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none"
              >
                <option value="despesa">Saída (Despesa)</option>
                <option value="receita">Entrada (Receita)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select 
                value={novoLancamento.categoria} onChange={e => setNovoLancamento({...novoLancamento, categoria: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none"
              >
                <option value="combustivel">Combustível</option>
                <option value="peca">Compra de Peças</option>
                <option value="servico">Serviço/O.S.</option>
                <option value="folha_pagamento">Folha de Pagamento</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input 
                type="text" required
                value={novoLancamento.descricao} onChange={e => setNovoLancamento({...novoLancamento, descricao: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" 
                placeholder="Ex: Gasolina carro 1" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <input 
                type="text" required
                value={novoLancamento.valor} onChange={e => setNovoLancamento({...novoLancamento, valor: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" 
                placeholder="0,00" 
              />
            </div>
            <div className="md:col-span-5 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-brand-blue text-white rounded-lg font-medium">Lançar no Caixa</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 text-slate-700">
          <h3 className="font-bold flex items-center gap-2"><Filter size={18}/> Histórico de Movimentações</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-sm border-b border-slate-100">
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Carregando movimentações...</td>
                </tr>
              ) : movimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum lançamento no caixa.</td>
                </tr>
              ) : (
                movimentacoes.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600">
                      {format(new Date(mov.data_lancamento), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      {mov.descricao}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium uppercase tracking-wider">
                        {mov.categoria.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`p-4 font-bold text-right ${mov.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {mov.tipo === 'receita' ? '+' : '-'} R$ {mov.valor.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
