import React from 'react';

export default function Header({
  profile,
  onProfileChange,
  vibeStatus,
  onOpenSecurityModal,
  isChartOpen,
  onToggleChart,
  activeExchange = 'Binance',
  onExchangeChange,
  onOpenOrderHistory,
  onOpenFuturesTerminal,
  onOpenCloudSync,
  activePositionsCount = 0,
  syncState
}) {
  const exchanges = ['Binance', 'Bybit', 'Bybit.EU', 'OKX', 'Kraken', 'Coinbase', 'CoinMarketCap'];

  const profileTooltips = {
    READ: 'Tryb READ (Tylko Odczyt): Pobiera dane rynkowe w czasie rzeczywistym, generuje sygnały AI, wskaźniki i sentyment. Wszystkie funkcje składania zleceń są zablokowane.',
    SIM: 'Tryb SIM (Symulacja / Paper Trading): Wirtualny portfel i symulacja zleceń w czasie rzeczywistym z uwzględnieniem poślizgów (slippage) i prowizji giełdowych. Bezpieczny test strategii bez ryzyka.',
    LIVE: 'Tryb LIVE (Rzeczywisty Rynek): Składa realne zlecenia na podłączonych giełdach (CCXT, IBKR). Wymaga kluczy API i zatwierdzenia blokady ryzyka.'
  };

  const getProfileBadge = (prof) => {
    switch (prof) {
      case 'LIVE':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'SIM':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'READ':
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-slate-800/80 px-2 sm:px-4 py-2">
      {/* WSZYSTKIE PRZYCISKI MIESZCZĄ SIĘ W JEDNEJ LINII NA PEŁNEJ SZEROKOŚCI EKRANU */}
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto scrollbar-none">
        
        {/* Brand & Rule #1 Tag */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-md shadow-cyan-500/20">
            <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold tracking-tight text-white text-sm sm:text-base">
              STRATEG<span className="text-cyan-400">.AI</span>
            </span>
            <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] font-semibold text-slate-400">
              v1.0.8
            </span>
          </div>
          <p className="text-[10px] font-medium text-slate-400 hidden 2xl:flex items-center gap-1 pl-2 border-l border-slate-800">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Zasada nr 1: Deterministyczna Izolacja Obliczeń od LLM
          </p>
        </div>

        {/* Center / Right Controls: Pasek kontroli w jednej linii */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 flex-nowrap flex-shrink-0">
          
          {/* PRZYCISKI GIEŁDY DO WYBORU: Dokładnie tej samej wielkości co dotychczas */}
          <div className="flex items-center rounded-xl bg-slate-900/90 p-1 border border-slate-800 font-mono text-xs flex-shrink-0">
            <span className="hidden xl:inline text-[10px] text-slate-400 uppercase font-sans font-bold px-1.5">Giełda:</span>
            {exchanges.map((ex) => (
              <button
                key={ex}
                onClick={() => onExchangeChange && onExchangeChange(ex)}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeExchange.toLowerCase() === ex.toLowerCase()
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* PRZYCISK WYKRES */}
          <button
            onClick={onToggleChart}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide transition-all cursor-pointer shadow-sm flex-shrink-0 whitespace-nowrap ${
              isChartOpen
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-cyan-500/25 ring-1 ring-cyan-400'
                : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 hover:text-cyan-300'
            }`}
          >
            <span className="text-xs leading-none">📈</span>
            <span>Wykres</span>
            {isChartOpen && (
              <span className="rounded-full bg-slate-950 px-1 py-0.2 text-[8px] font-mono font-bold text-cyan-300">
                ON
              </span>
            )}
          </button>

          {/* PRZYCISK TERMINAL FUTURES */}
          <button
            onClick={onOpenFuturesTerminal}
            className="flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide transition-all cursor-pointer shadow-sm flex-shrink-0 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 hover:text-white hover:border-purple-400 whitespace-nowrap"
            title="Otwórz Terminal Egzekucji Kontraktów Futures (Multi-TP, R:R > 2.0, likwidacja, monitor pozycji)"
          >
            <span className="text-xs leading-none">⚡</span>
            <span>Futures</span>
            {activePositionsCount > 0 && (
              <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-mono font-bold text-black ml-0.5">
                {activePositionsCount}
              </span>
            )}
          </button>

          {/* PRZYCISK HISTORIA ZLECEŃ */}
          <button
            onClick={onOpenOrderHistory}
            className="flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide transition-all cursor-pointer shadow-sm flex-shrink-0 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-amber-300 hover:text-amber-200 hover:border-amber-500/40 whitespace-nowrap"
            title="Otwórz historię złożonych zleceń i wykonanych transakcji"
          >
            <span className="text-xs leading-none">📋</span>
            <span>Zlecenia</span>
          </button>

          {/* PRZYCISK SYNCHRONIZACJA W CHMURZE (DESKTOP <-> MOBILE) */}
          <button
            onClick={onOpenCloudSync}
            className="flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide transition-all cursor-pointer shadow-sm flex-shrink-0 bg-cyan-950/50 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 whitespace-nowrap"
            title="Synchronizacja w chmurze w czasie rzeczywistym (Desktop ⇄ Telefon Mobilny)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Chmura</span>
          </button>

          {/* CVE-2026-114108 Security Status Button */}
          <button
            onClick={onOpenSecurityModal}
            className="hidden xl:flex items-center space-x-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-1 text-[10px] font-mono text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap"
            title="Bezpieczeństwo: Ochrona przed CVE-2026-114108 aktywna"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>CVE-2026-114108</span>
          </button>

          {/* Profile Switcher (READ, SIM, LIVE) */}
          <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-900/90 p-0.5 flex-shrink-0">
            {['READ', 'SIM', 'LIVE'].map((mode) => (
              <button
                key={mode}
                onClick={() => onProfileChange(mode)}
                title={profileTooltips[mode]}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                  profile === mode
                    ? getProfileBadge(mode) + ' border shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

        </div>
      </div>
    </header>
  );
}
