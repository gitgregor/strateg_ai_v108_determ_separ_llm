import React, { useState } from 'react';

export default function ExecutionView({ profile, symbol, assetClass, marketType, currentPrice, onPlaceOrder }) {
  // VectorBT Grid Optimization State
  const [fastMaStr, setFastMaStr] = useState('10, 15, 20');
  const [slowMaStr, setSlowMaStr] = useState('50, 100, 200');
  const [gridResult, setGridResult] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Nautilus Tick Simulation State
  const [nautilusResult, setNautilusResult] = useState(null);
  const [isTickSimulating, setIsTickSimulating] = useState(false);

  // Manual Order Form State
  const [orderAction, setOrderAction] = useState('BUY');
  const [orderType, setOrderType] = useState('LIMIT');
  const [quantity, setQuantity] = useState(assetClass === 'CRYPTO' ? '0.25' : '50');
  const [price, setPrice] = useState(currentPrice ? currentPrice.toString() : '65000');
  const [leverage, setLeverage] = useState('3');
  const [executionLog, setExecutionLog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Run VectorBT Grid Optimization
  const handleRunGridOptimization = async () => {
    setIsOptimizing(true);
    try {
      const fastList = fastMaStr.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
      const slowList = slowMaStr.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));

      const res = await fetch('/api/v1/backtest/grid-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol || 'BTC/USDT',
          fast_ma_range: fastList.length ? fastList : [10, 20],
          slow_ma_range: slowList.length ? slowList : [50, 100]
        })
      });
      const data = await res.json();
      setGridResult(data);
    } catch (err) {
      console.error('VectorBT optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Run Nautilus Tick Simulation
  const handleRunNautilusSim = async () => {
    setIsTickSimulating(true);
    try {
      const res = await fetch('/api/v1/backtest/nautilus-tick-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol || 'BTC/USDT',
          asset_class: assetClass,
          market_type: marketType,
          action: orderAction,
          order_type: orderType,
          quantity: parseFloat(quantity) || 1.0,
          price: parseFloat(price) || 100.0,
          leverage: parseInt(leverage) || 1
        })
      });
      const data = await res.json();
      setNautilusResult(data);
    } catch (err) {
      console.error('Nautilus sim error:', err);
    } finally {
      setIsTickSimulating(false);
    }
  };

  // Submit Order via CCXT / IBKR through Active Profile
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        symbol: symbol || 'BTC/USDT',
        asset_class: assetClass,
        market_type: marketType,
        action: orderAction,
        order_type: orderType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        leverage: parseInt(leverage)
      };
      const res = await fetch('/api/v1/execution/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setExecutionLog(data);
      if (onPlaceOrder) onPlaceOrder(data);
    } catch (err) {
      console.error('Order submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. VectorBT & Nautilus Backtesting Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">5</span>
              <h3 className="font-bold text-slate-100">Optymalizacja Siatek VectorBT & NautilusTrader</h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              vectorbt + nautilus_trader
            </span>
          </div>

          {/* VectorBT Parameter Inputs */}
          <div className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-sans block mb-1">Szybka Średnia (Fast MA Range):</label>
                <input
                  type="text"
                  value={fastMaStr}
                  onChange={(e) => setFastMaStr(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-sans block mb-1">Wolna Średnia (Slow MA Range):</label>
                <input
                  type="text"
                  value={slowMaStr}
                  onChange={(e) => setSlowMaStr(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-1 font-sans">
              <button
                onClick={handleRunGridOptimization}
                disabled={isOptimizing}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                {isOptimizing ? 'Optymalizowanie w VectorBT...' : '⚡ Uruchom Siatkę VectorBT'}
              </button>
              <button
                onClick={handleRunNautilusSim}
                disabled={isTickSimulating}
                className="flex-1 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 font-bold text-xs transition-all cursor-pointer"
              >
                {isTickSimulating ? 'Symulacja Tickowa...' : '🎯 Egzekucja Tickowa Nautilus'}
              </button>
            </div>
          </div>

          {/* Grid Optimization Result Display */}
          {gridResult && (
            <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-emerald-400">Wyniki Optymalizacji VectorBT:</span>
                <span className="text-[10px] text-slate-400">Przetestowano: {gridResult.param_grid_tested} kombinacji</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-sans">Optymalne MA</span>
                  <span className="font-bold text-cyan-300">{gridResult.best_fast_ma} / {gridResult.best_slow_ma}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-sans">Sharpe Ratio</span>
                  <span className="font-bold text-emerald-300">{gridResult.sharpe_ratio}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-sans">Zwrot Całkowity</span>
                  <span className="font-bold text-white">+{gridResult.total_return_pct}%</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-sans">Max Drawdown</span>
                  <span className="font-bold text-rose-400">{gridResult.max_drawdown_pct}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Nautilus Tick Simulation Display */}
          {nautilusResult && (
            <div className="rounded-xl bg-indigo-950/30 p-3.5 border border-indigo-900/50 space-y-1 font-mono text-xs">
              <span className="font-bold text-indigo-300 font-sans block">NautilusTrader Event Simulator:</span>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Cena realizacji: ${nautilusResult.simulated_fill_price}</span>
                <span>Poślizg: {nautilusResult.slippage_bps} bps</span>
                <span>Latencja: {nautilusResult.microsecond_latency} µs</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Order Ticket (CCXT / IBKR - Read, Sim, Live) */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-bold">6</span>
              <h3 className="font-bold text-slate-100">Terminal Egzekucji (CCXT & IBKR)</h3>
            </div>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold border ${
              profile === 'LIVE' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : (profile === 'SIM' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/40')
            }`}>
              Profil: {profile}
            </span>
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-3 font-mono text-xs">
            {/* Action (BUY / SELL) & Type (LIMIT / MARKET) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-sans block mb-1">Kierunek (Side):</label>
                <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOrderAction('BUY')}
                    className={`flex-1 py-1 rounded font-bold ${orderAction === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderAction('SELL')}
                    className={`flex-1 py-1 rounded font-bold ${orderAction === 'SELL' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                  >
                    SELL / SHORT
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-sans block mb-1">Typ Zlecenia:</label>
                <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOrderType('LIMIT')}
                    className={`flex-1 py-1 rounded font-bold ${orderType === 'LIMIT' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                  >
                    LIMIT
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('MARKET')}
                    className={`flex-1 py-1 rounded font-bold ${orderType === 'MARKET' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                  >
                    MARKET
                  </button>
                </div>
              </div>
            </div>

            {/* Quantity, Price, Leverage */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-sans block mb-1">Ilość (Quantity):</label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-sans block mb-1">Cena (Price):</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={orderType === 'MARKET'}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-white disabled:opacity-40"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-sans block mb-1">Dźwignia (Leverage):</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  disabled={marketType !== 'FUTURES'}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-white disabled:opacity-40"
                />
              </div>
            </div>

            {/* Broker Driver Info */}
            <div className="text-[11px] text-slate-400 font-sans pt-1">
              Ruting giełdowy: <span className="font-mono text-cyan-300 font-semibold">{assetClass === 'CRYPTO' ? 'CCXT (Binance/Bybit Perp)' : 'ib_async / ibkr-httpapi (Interactive Brokers)'}</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 rounded-xl font-bold font-sans text-xs sm:text-sm tracking-wider uppercase transition-all shadow-lg ${
                orderAction === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              }`}
            >
              {isSubmitting ? 'Wysyłanie zlecenia...' : `Złóż Zlecenie [${profile}]`}
            </button>
          </form>

          {/* Execution Result Log */}
          {executionLog && (
            <div className={`p-3 rounded-xl border font-mono text-xs ${
              executionLog.status === 'FILLED'
                ? 'bg-emerald-950/30 border-emerald-900 text-emerald-300'
                : (executionLog.status === 'BLOCKED_BY_PROFILE' ? 'bg-amber-950/30 border-amber-900 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-300')
            }`}>
              <div className="flex justify-between font-bold">
                <span>Status: {executionLog.status}</span>
                <span>ID: {executionLog.order_id}</span>
              </div>
              <div className="mt-1 flex justify-between text-[11px]">
                <span>Cena wykonania: ${executionLog.executed_price}</span>
                <span>Poślizg: ${executionLog.slippage}</span>
                <span>Prowizja: ${executionLog.commission}</span>
              </div>
              {executionLog.details?.reason && (
                <div className="mt-1 text-[11px] text-amber-400 italic">
                  Uwaga: {executionLog.details.reason}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
