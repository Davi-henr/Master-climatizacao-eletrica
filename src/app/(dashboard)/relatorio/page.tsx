'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Sparkles, Wrench, DollarSign, Users, TrendingUp, Filter } from 'lucide-react';

export default function RelatorioPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  const [osData, setOsData] = useState<any[]>([]);
  const [rhData, setRhData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [osRes, rhRes] = await Promise.all([
      supabase.from('orcamentos_os').select('*, itens_os(*)').eq('status', 'os_finalizada'),
      supabase.from('rh_pagamentos').select('*')
    ]);
    if (osRes.data) setOsData(osRes.data);
    if (rhRes.data) setRhData(rhRes.data);
    setLoading(false);
  };

  const processedData = useMemo(() => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i],
      Instalações: 0,
      Higienizações: 0,
      Outros: 0,
    }));

    let totalInstalacoesQtd = 0;
    let totalInstalacoesValor = 0;
    let totalLimpezaQtd = 0;
    let totalLimpezaValor = 0;
    let totalOutrosQtd = 0;
    let totalOutrosValor = 0;
    let totalCustoMaterial = 0;
    let totalRH = 0;
    let receitaTotal = 0;

    osData.forEach(os => {
      // Usa data_agendamento com fallback para created_at
      const dateStr = os.data_agendamento || os.created_at;
      if (!dateStr) return;
      const date = new Date(dateStr);

      if (date.getFullYear().toString() === selectedYear) {
        const month = date.getMonth();
        const vTotal = Number(os.valor_total) || 0;
        receitaTotal += vTotal;

        // Custo de material: SOMENTE o que foi informado na finalização do serviço.
        // NÃO usa os itens do orçamento pois aqueles são preços de VENDA, não de custo.
        const osMaterialCost = Number(os.custo_materiais_informado) || 0;
        totalCustoMaterial += osMaterialCost;

        const tipo = os.tipo_servico || '';
        if (tipo === 'Instalação') {
          totalInstalacoesQtd++;
          totalInstalacoesValor += vTotal;
          monthly[month].Instalações++;
        } else if (tipo === 'Limpeza' || tipo === 'Higienização') {
          totalLimpezaQtd++;
          totalLimpezaValor += vTotal;
          monthly[month].Higienizações++;
        } else {
          totalOutrosQtd++;
          totalOutrosValor += vTotal;
          monthly[month].Outros++;
        }
      }
    });

    rhData.forEach(rh => {
      const dateStr = rh.data_pagamento || rh.created_at;
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (date.getFullYear().toString() === selectedYear) {
        totalRH += Number(rh.total_pago) || 0;
      }
    });

    const lucroLiquido = receitaTotal - totalCustoMaterial - totalRH;

    return {
      monthly,
      totalInstalacoesQtd,
      totalInstalacoesValor,
      totalLimpezaQtd,
      totalLimpezaValor,
      totalOutrosQtd,
      totalOutrosValor,
      totalCustoMaterial,
      totalRH,
      lucroLiquido,
      receitaTotal
    };
  }, [osData, rhData, selectedYear]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    osData.forEach(os => {
      const d = os.data_agendamento || os.created_at;
      if (d) years.add(new Date(d).getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [osData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Relatório Geral</h1>
          <p className="text-sm text-slate-500">Visão estratégica e financeira da empresa</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <Filter size={18} className="text-slate-400 ml-2" />
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent border-none outline-none font-bold text-slate-700 pr-2 cursor-pointer"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Principais — 3 tipos de serviço */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Higienização */}
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
          <div className="absolute -top-6 -right-6 p-4 opacity-10 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="font-medium text-emerald-100 flex items-center gap-2 mb-1">
              <Sparkles size={18} /> Total Higienizações
            </h3>
            <div className="flex items-end gap-3 mt-4">
              <h2 className="text-3xl font-black">R$ {processedData.totalLimpezaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <p className="text-emerald-50 text-sm mt-3 font-medium bg-white/10 inline-block px-3 py-1 rounded-lg backdrop-blur-sm border border-white/20">
              {processedData.totalLimpezaQtd} serviços realizados
            </p>
          </div>
        </div>

        {/* Instalações */}
        <div className="bg-gradient-to-br from-brand-blue to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group">
          <div className="absolute -top-6 -right-6 p-4 opacity-10 transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500">
            <Wrench size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="font-medium text-blue-100 flex items-center gap-2 mb-1">
              <Wrench size={18} /> Total Instalações
            </h3>
            <div className="flex items-end gap-3 mt-4">
              <h2 className="text-3xl font-black">R$ {processedData.totalInstalacoesValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <p className="text-blue-50 text-sm mt-3 font-medium bg-white/10 inline-block px-3 py-1 rounded-lg backdrop-blur-sm border border-white/20">
              {processedData.totalInstalacoesQtd} serviços realizados
            </p>
          </div>
        </div>

        {/* Outros Serviços */}
        <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-3xl p-6 text-white shadow-lg shadow-slate-500/20 relative overflow-hidden group">
          <div className="absolute -top-6 -right-6 p-4 opacity-10 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
            <DollarSign size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="font-medium text-slate-300 flex items-center gap-2 mb-1">
              <DollarSign size={18} /> Outros Serviços
            </h3>
            <div className="flex items-end gap-3 mt-4">
              <h2 className="text-3xl font-black">R$ {processedData.totalOutrosValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
            <p className="text-slate-300 text-sm mt-3 font-medium bg-white/10 inline-block px-3 py-1 rounded-lg backdrop-blur-sm border border-white/20">
              {processedData.totalOutrosQtd} serviços realizados
            </p>
          </div>
        </div>

      </div>

      {/* Cards Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Receita Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">Receita Total (Lucro Bruto)</p>
            <h3 className="text-2xl font-black text-slate-800">R$ {processedData.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-400 mt-1">Total recebido de serviços finalizados</p>
          </div>
        </div>

        {/* Custo RH */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-brand-orange shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">Custo Total com Equipe (RH)</p>
            <h3 className="text-2xl font-black text-slate-800">R$ {processedData.totalRH.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-slate-400 mt-1">Baseado nos pagamentos realizados</p>
          </div>
        </div>

        {/* Lucro Líquido */}
        <div className={`bg-white p-5 rounded-2xl border shadow-sm flex items-start gap-4 ${processedData.lucroLiquido >= 0 ? 'border-green-200' : 'border-red-200'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${processedData.lucroLiquido >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">Lucro Líquido</p>
            <h3 className={`text-2xl font-black ${processedData.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              R$ {processedData.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Materiais: <span className="font-medium text-red-400">-R$ {processedData.totalCustoMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              {' | '}RH: <span className="font-medium text-red-400">-R$ {processedData.totalRH.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

      </div>

      {/* Gráfico Moderno */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800">Volume de Serviços no Ano</h2>
          <p className="text-sm text-slate-500">Comparativo mensal por tipo de serviço</p>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 500 }}
              />
              <Bar dataKey="Instalações" fill="#3b82f6" radius={[6, 6, 6, 6]} barSize={12} />
              <Bar dataKey="Higienizações" fill="#10b981" radius={[6, 6, 6, 6]} barSize={12} />
              <Bar dataKey="Outros" fill="#64748b" radius={[6, 6, 6, 6]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
