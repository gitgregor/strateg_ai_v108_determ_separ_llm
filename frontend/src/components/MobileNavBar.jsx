import React from 'react';

export default function MobileNavBar({
  isChartOpen,
  onToggleChart,
  onOpenFuturesTerminal,
  onOpenOrderHistory,
  onOpenCloudSync,
  activePositionsCount = 0,
  syncState
}) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 px-2 py-1.5 shadow-2xl select-none">
      <div className="flex items-center justify-around">
        
        {/* Wykres */}
        <button
          onClick={onToggleChart}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            isChartOpen
              ? 'text-cyan-300 bg-cyan-950/60 font-bold border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-base leading-none">📈</span>
          <span className="text-[10px] mt-0.5">Wykres</span>
        </button>

        {/* Futures Terminal */}
        <button
          onClick={onOpenFuturesTerminal}
          className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-purple-300 hover:text-white transition-all cursor-pointer bg-purple-950/40 border border-purple-500/30"
        >
          <span className="text-base leading-none">⚡</span>
          <span className="text-[10px] mt-0.5 font-bold">Futures</span>
          {activePositionsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-black">
              {activePositionsCount}
            </span>
          )}
        </button>

        {/* Historia Zleceń */}
        <button
          onClick={onOpenOrderHistory}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-amber-300 hover:text-white transition-all cursor-pointer hover:bg-slate-900"
        >
          <span className="text-base leading-none">📋</span>
          <span className="text-[10px] mt-0.5">Zlecenia</span>
        </button>

        {/* Synchronizacja w Chmurze */}
        <button
          onClick={onOpenCloudSync}
          className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-cyan-300 hover:text-white transition-all cursor-pointer hover:bg-slate-900"
        >
          <span className="text-base leading-none">☁️</span>
          <span className="text-[10px] mt-0.5">Chmura</span>
          <span className="absolute 1 top-1 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        {/* Kokpit / Analiza */}
        <button
          onClick={() => {
            if (isChartOpen) onToggleChart();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            !isChartOpen
              ? 'text-cyan-300 bg-cyan-950/60 font-bold border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-base leading-none">⚙️</span>
          <span className="text-[10px] mt-0.5">Kokpit</span>
        </button>

      </div>
    </div>
  );
}
