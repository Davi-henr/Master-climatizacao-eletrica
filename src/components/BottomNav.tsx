'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  CalendarDays, 
  Settings,
  Menu,
  Users,
  Wallet,
  History,
  X
} from 'lucide-react';

const mainNavItems = [
  { name: 'Início', href: '/', icon: LayoutDashboard },
  { name: 'Orçamentos', href: '/orcamentos', icon: FileText },
  { name: 'Agenda', href: '/calendario', icon: CalendarDays },
  { name: 'Cadastros', href: '/cadastros', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 sm:bottom-4 left-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-auto sm:min-w-[400px] z-50">
      <div className="bg-white/70 backdrop-blur-xl sm:rounded-2xl border-t sm:border border-slate-200/50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.08)] px-4 py-2 sm:py-3 flex justify-between items-center gap-2">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-brand-orange bg-orange-50/80 shadow-inner' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
              }`}
            >
              <item.icon size={isActive ? 22 : 20} className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[9px] font-bold tracking-wide transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}

        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center justify-center w-14 h-12 rounded-xl text-slate-400 hover:text-slate-600 transition-all duration-200"
        >
          <Menu size={22} />
          <span className="text-[10px] mt-1 font-medium">Mais</span>
        </button>
      </div>
    </nav>

      {/* Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsMenuOpen(false)} />
          <div className="bg-white rounded-t-3xl w-full p-6 animate-in slide-in-from-bottom-10 shadow-2xl relative z-10 pb-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Mais Opções</h3>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Link href="/rh" onClick={() => setIsMenuOpen(false)} className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-orange-50 hover:border-orange-200 transition-colors">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-orange mb-3">
                  <Users size={24} />
                </div>
                <span className="font-bold text-slate-700">Equipe (RH)</span>
                <span className="text-xs text-slate-500 text-center mt-1">Lançar diárias e acertos</span>
              </Link>
              
              <Link href="/financeiro" onClick={() => setIsMenuOpen(false)} className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-blue mb-3">
                  <Wallet size={24} />
                </div>
                <span className="font-bold text-slate-700">Financeiro</span>
                <span className="text-xs text-slate-500 text-center mt-1">Caixa, Receitas e Despesas</span>
              </Link>
              
              <Link href="/historico" onClick={() => setIsMenuOpen(false)} className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-green-50 hover:border-green-200 transition-colors col-span-2">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-green-600 mb-3">
                  <History size={24} />
                </div>
                <span className="font-bold text-slate-700">Histórico de Serviços</span>
                <span className="text-xs text-slate-500 text-center mt-1">Busque serviços finalizados, relatórios e contagem de dias</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
