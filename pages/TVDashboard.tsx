
import React, { useState, useEffect } from 'react';
import { 
  Maximize, 
  Clock, 
  ChevronLeft,
  LayoutDashboard
} from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { useNavigate } from 'react-router-dom';

const TVDashboard: React.FC = () => {
  const { requests } = useExtras();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRequests = requests.filter(r => r.workDate === todayStr && r.status !== 'REPROVADO' && r.status !== 'CANCELADO');

  // Group by Sector
  const sectors = Array.from(new Set(todayRequests.map(r => r.sector))).sort();

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 border-b border-gray-800 pb-8">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors no-print"
          >
            <ChevronLeft size={32} />
          </button>
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-lg shadow-emerald-900/40">V</div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Painel de Extras 24h</h1>
            <p className="text-emerald-400 text-xl font-bold tracking-widest uppercase">Vivaz Cataratas Resort</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-mono font-black tabular-nums">{currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          <p className="text-xl text-gray-400 font-bold uppercase mt-1">
            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
      </header>

      {/* Grid of Sectors */}
      <div className="flex-1 overflow-y-auto">
        {todayRequests.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-6">
            <LayoutDashboard size={120} />
            <p className="text-4xl font-bold uppercase tracking-widest">Nenhuma solicitação para hoje</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sectors.map(sectorName => {
              const sectorReqs = todayRequests.filter(r => r.sector === sectorName);
              return (
                <div key={sectorName} className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 backdrop-blur-md">
                  <h2 className="text-3xl font-black text-emerald-500 mb-6 uppercase tracking-tighter border-b border-gray-800 pb-4">{sectorName}</h2>
                  <div className="space-y-6">
                    {sectorReqs.map(req => (
                      <div key={req.id} className="flex flex-col gap-1 border-b border-gray-800/50 pb-4 last:border-0">
                        <div className="flex justify-between items-start">
                          <p className="text-2xl font-bold leading-tight">{req.extraName}</p>
                          <span className={`
                            px-3 py-1 rounded-lg text-sm font-black uppercase
                            ${req.status === 'APROVADO' ? 'bg-emerald-500 text-emerald-950' : 'bg-amber-500 text-amber-950'}
                          `}>
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                           <p className="text-emerald-400/70 text-lg font-bold uppercase">{req.role}</p>
                           <p className="text-gray-400 text-lg flex items-center gap-2">
                             <Clock size={18} /> {req.shift}
                           </p>
                        </div>
                        <p className="text-gray-500 text-sm mt-2 font-medium uppercase tracking-tighter">Líder: {req.leaderName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-8 pt-8 border-t border-gray-800 flex justify-between items-center text-gray-600 font-bold uppercase text-xs tracking-[0.2em]">
        <p>Sistema de Gestão Vivaz v1.0 • Atualização Automática Ativada</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Conectado</span>
          </div>
          <p>Total de Extras Hoje: {todayRequests.length}</p>
        </div>
      </footer>
    </div>
  );
};

export default TVDashboard;
