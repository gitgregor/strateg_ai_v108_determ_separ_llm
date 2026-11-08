import React from 'react';

export default function MarketControls({
  symbol,
  setSymbol,
  assetClass,
  setAssetClass,
  marketType,
  setMarketType,
  timeframe,
  setTimeframe,
  onAnalyze,
  isLoading
}) {
  const cryptoPresets = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'];
  const equityPresets = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'SPY'];

  const presets = assetClass === 'CRYPTO' ? cryptoPresets : equityPresets;

  const handleAssetClassToggle = (cls) => {
    setAssetClass(cls);
    if (cls === 'CRYPTO' && !symbol.includes('/')) {
      setSymbol('BTC/USDT');
    } else if (cls === 'EQUITY' && symbol.includes('/')) {
      setSymbol('AAPL');
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Asset Class & Market Type Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Asset Class */}
          <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            <button
              onClick={() => handleAssetClassToggle('CRYPTO')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                assetClass === 'CRYPTO'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🪙 Crypto
            </button>
            <button
              onClick={() => handleAssetClassToggle('EQUITY')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                assetClass === 'EQUITY'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📈 Equities
            </button>
          </div>

          {/* Market Type */}
          <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            <button
              onClick={() => setMarketType('SPOT')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                marketType === 'SPOT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Spot
            </button>
            <button
              onClick={() => setMarketType('FUTURES')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                marketType === 'FUTURES'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Futures (Perp)
            </button>
          </div>

          {/* Timeframe selector: 15s, 30s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 1d, 1W, 1M, 3M, 6M, 1Y */}
          <div className="flex items-center space-x-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800 overflow-x-auto max-w-[400px] scrollbar-none">
            {[
              '15s', '30s',
              '1m', '3m', '5m', '15m', '30m',
              '1h', '2h', '4h', '8h',
              '1d', '1W',
              '1M', '3M', '6M', '1Y'
            ].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-md px-2 py-1 font-mono text-xs font-semibold whitespace-nowrap transition-colors ${
                  timeframe === tf
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Symbol Input & Presets */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Presets */}
          <div className="flex items-center space-x-1.5">
            {presets.map((item) => (
              <button
                key={item}
                onClick={() => setSymbol(item)}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-medium border transition-all ${
                  symbol === item
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="relative">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. BTC/USDT"
              className="w-32 sm:w-36 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Action CTA */}
          <button
            onClick={onAnalyze}
            disabled={isLoading}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 font-semibold text-xs sm:text-sm text-slate-950 shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Obliczanie TA & SMC...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Generuj Wycenę Deterministyczną</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
