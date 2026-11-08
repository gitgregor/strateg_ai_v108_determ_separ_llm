import React, { useState, useEffect, useMemo } from 'react';

export default function FuturesTerminalModal({
  isOpen,
  onClose,
  symbol = 'BTC/USDT',
  currentPrice = 75800.0,
  advice = null,
  profile = 'SIM',
  onPositionChanged
}) {
  // Terminal Form State
  const [direction, setDirection] = useState('LONG'); // 'LONG' or 'SHORT'
  const [orderType, setOrderType] = useState('MARKET'); // 'MARKET' or 'LIMIT'
  const [limitPrice, setLimitPrice] = useState(currentPrice ? currentPrice.toString() : '75800');
  const [quantity, setQuantity] = useState('0.5');
  const [leverage, setLeverage] = useState(10);
  const [stopLoss, setStopLoss] = useState('');
  
  // TP Mode
  const [tpMode, setTpMode] = useState('MULTI'); // 'MULTI' or 'SINGLE'
  const [singleTp, setSingleTp] = useState('');
  const [tp1Price, setTp1Price] = useState('');
  const [tp2Price, setTp2Price] = useState('');
  const [tp3Price, setTp3Price] = useState('');
  
  // State from backend
  const [portfolio, setPortfolio] = useState({
    cash: 100000.0,
    used_margin: 0.0,
    total_equity: 100000.0,
    unrealized_pnl: 0.0,
    realized_pnl_total: 0.0
  });
  const [activePositions, setActivePositions] = useState([]);
  const [closedPositions, setClosedPositions] = useState([]);
  const [recentTransaction, setRecentTransaction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Synchronize limit price when currentPrice changes initially
  useEffect(() => {
    if (!limitPrice || limitPrice === '0') {
      setLimitPrice(currentPrice ? currentPrice.toString() : '75800');
    }
  }, [currentPrice]);

  // Fetch full portfolio and positions state
  const fetchState = async () => {
    try {
      const res = await fetch(`/api/v1/futures/portfolio?price=${currentPrice}`);
      if (res.ok) {
        const data = await res.json();
        if (data.portfolio) setPortfolio(data.portfolio);
        if (data.active_positions) setActivePositions(data.active_positions);
        if (data.closed_positions) setClosedPositions(data.closed_positions);
      }
    } catch (err) {
      console.warn('Błąd pobierania stanu terminala futures:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchState();
    }
  }, [isOpen]);

  // Push real-time price tick into the active futures positions
  useEffect(() => {
    if (!isOpen || activePositions.length === 0 || !currentPrice) return;

    const pushTick = async () => {
      try {
        const res = await fetch('/api/v1/futures/tick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, current_price: currentPrice })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.portfolio) setPortfolio(data.portfolio);
          if (data.active_positions) setActivePositions(data.active_positions);
          if (data.events && data.events.length > 0) {
            setActionNotice(data.events[0]);
            fetchState(); // refresh closed positions if any liquidated/closed
            if (onPositionChanged) onPositionChanged();
          }
        }
      } catch (e) {}
    };

    pushTick();
  }, [currentPrice, isOpen]);

  // Apply AI strategy hints & compute TP1, TP2, TP3 for R:R > 2.0
  const handleApplyAiStrategy = () => {
    const entry = currentPrice || 75800.0;
    const dec = advice?.decision;
    
    // Determine direction from AI
    const aiDir = (dec?.direction === 'SHORT' || dec?.action === 'SELL') ? 'SHORT' : 'LONG';
    setDirection(aiDir);

    // Calculate intelligent risk & SL
    let sl = dec?.stop_loss;
    if (!sl) {
      sl = aiDir === 'LONG' ? entry * 0.985 : entry * 1.015;
    }
    setStopLoss(sl.toFixed(2));

    const risk = Math.abs(entry - sl);

    // Multi-stage TP for R:R > 2.0
    if (aiDir === 'LONG') {
      const tp1 = entry + risk * 2.0;
      const tp2 = entry + risk * 3.0;
      const tp3 = entry + risk * 4.5;
      setTp1Price(tp1.toFixed(2));
      setTp2Price(tp2.toFixed(2));
      setTp3Price(tp3.toFixed(2));
      setSingleTp((entry + risk * 2.5).toFixed(2));
    } else {
      const tp1 = entry - risk * 2.0;
      const tp2 = entry - risk * 3.0;
      const tp3 = entry - risk * 4.5;
      setTp1Price(tp1.toFixed(2));
      setTp2Price(tp2.toFixed(2));
      setTp3Price(tp3.toFixed(2));
      setSingleTp((entry - risk * 2.5).toFixed(2));
    }

    setTpMode('MULTI');
    setLeverage(10);
    setQuantity('0.5');
    setOrderType('MARKET');
  };

  // Entry price used for calculations
  const effectiveEntry = useMemo(() => {
    if (orderType === 'LIMIT' && limitPrice && !isNaN(parseFloat(limitPrice))) {
      return parseFloat(limitPrice);
    }
    return currentPrice || 75800.0;
  }, [orderType, limitPrice, currentPrice]);

  const numQty = parseFloat(quantity) || 0;
  const notionalValue = effectiveEntry * numQty;
  const marginRequired = leverage > 0 ? notionalValue / leverage : 0;
  const takerFee = notionalValue * 0.0004;

  // Liquidation calculation (90% maintenance margin threshold)
  const estimatedLiqPrice = useMemo(() => {
    if (!effectiveEntry || leverage <= 0) return 0;
    if (direction === 'LONG') {
      return effectiveEntry * (1 - (0.9 / leverage));
    } else {
      return effectiveEntry * (1 + (0.9 / leverage));
    }
  }, [effectiveEntry, leverage, direction]);

  // Risk:Reward calculations for preview
  const rrValues = useMemo(() => {
    const sl = parseFloat(stopLoss);
    if (!sl || isNaN(sl)) return { risk: 0, tp1RR: 0, tp2RR: 0, tp3RR: 0 };
    const risk = Math.abs(effectiveEntry - sl);
    if (risk <= 0) return { risk: 0, tp1RR: 0, tp2RR: 0, tp3RR: 0 };

    const t1 = parseFloat(tp1Price);
    const t2 = parseFloat(tp2Price);
    const t3 = parseFloat(tp3Price);

    return {
      risk,
      tp1RR: t1 ? (Math.abs(t1 - effectiveEntry) / risk).toFixed(1) : 0,
      tp2RR: t2 ? (Math.abs(t2 - effectiveEntry) / risk).toFixed(1) : 0,
      tp3RR: t3 ? (Math.abs(t3 - effectiveEntry) / risk).toFixed(1) : 0
    };
  }, [effectiveEntry, stopLoss, tp1Price, tp2Price, tp3Price]);

  // Submit Futures Order
  const handleOpenPosition = async (e) => {
    e.preventDefault();
    if (marginRequired + takerFee > portfolio.cash) {
      alert(`Niewystarczające środki w portfelu! Wymagane: $${(marginRequired + takerFee).toFixed(2)}, Dostępne: $${portfolio.cash.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        symbol,
        direction,
        order_type: orderType,
        quantity: numQty,
        price: effectiveEntry,
        leverage,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        tp_mode: tpMode,
        take_profit: singleTp ? parseFloat(singleTp) : null,
        tp1_price: tp1Price ? parseFloat(tp1Price) : null,
        tp1_pct: 0.33,
        tp2_price: tp2Price ? parseFloat(tp2Price) : null,
        tp2_pct: 0.33,
        tp3_price: tp3Price ? parseFloat(tp3Price) : null,
        tp3_pct: 0.34
      };

      const res = await fetch(`/api/v1/futures/order?current_price=${currentPrice}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setRecentTransaction(data);
        if (data.portfolio_after) setPortfolio(data.portfolio_after);
        await fetchState();
        if (onPositionChanged) onPositionChanged();
      } else {
        const errData = await res.json();
        alert(`Błąd otwierania pozycji: ${errData.detail || 'Sprawdź parametry'}`);
      }
    } catch (err) {
      console.error('Błąd otwarcia pozycji futures:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close Active Position at Market
  const handleClosePosition = async (posId) => {
    try {
      const res = await fetch('/api/v1/futures/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_id: posId, current_price: currentPrice })
      });
      if (res.ok) {
        await fetchState();
        if (onPositionChanged) onPositionChanged();
      }
    } catch (err) {
      console.error('Błąd zamykania pozycji:', err);
    }
  };

  // Reset Futures Portfolio
  const handleResetPortfolio = async () => {
    if (!window.confirm('Czy na pewno zresetować portfel futures do $100,000 i wyczyścić pozycje?')) return;
    try {
      const res = await fetch('/api/v1/futures/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.portfolio) setPortfolio(data.portfolio);
        setActivePositions([]);
        setClosedPositions([]);
        setRecentTransaction(null);
        if (onPositionChanged) onPositionChanged();
      }
    } catch (err) {
      console.error('Błąd resetu portfela:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-panel-glow w-full max-w-6xl rounded-2xl border border-slate-700 bg-slate-900/95 p-3 sm:p-5 shadow-2xl space-y-3 max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* ========================================================================= */}
        {/* HEADER */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 font-mono font-bold text-lg border border-purple-500/30">
              ⚡
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  Terminal Egzekucji Kontraktów Futures
                </h3>
                <span className="rounded bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300">
                  {symbol}
                </span>
                <span className="rounded bg-blue-600 px-2 py-0.5 text-[11px] font-mono font-extrabold text-yellow-300 shadow">
                  ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  profile === 'LIVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {profile}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Wielopoziomowe TP (R:R &gt; 2.0), kalkulacja likwidacji i monitor stanu aktywa w czasie rzeczywistym
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetPortfolio}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold transition-all cursor-pointer"
              title="Resetuj portfel do początkowych $100,000"
            >
              🔄 Reset $100k
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer border border-transparent hover:border-slate-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PORTFOLIO SNAPSHOT BAR (Stan portfela przed / po / live) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-shrink-0 text-xs font-mono">
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Całkowite Equity</div>
            <div className="text-sm sm:text-base font-bold text-white mt-0.5">
              ${portfolio.total_equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Dostępna gotówka</div>
            <div className="text-sm sm:text-base font-bold text-cyan-400 mt-0.5">
              ${portfolio.cash?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Zablokowany Margin</div>
            <div className="text-sm sm:text-base font-bold text-amber-300 mt-0.5">
              ${portfolio.used_margin?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Niezrealizowany PnL (Live)</div>
            <div className={`text-sm sm:text-base font-bold mt-0.5 ${portfolio.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolio.unrealized_pnl >= 0 ? '+' : ''}${portfolio.unrealized_pnl?.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Zrealizowany Zysk Łączny</div>
            <div className={`text-sm sm:text-base font-bold mt-0.5 ${portfolio.realized_pnl_total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolio.realized_pnl_total >= 0 ? '+' : ''}${portfolio.realized_pnl_total?.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action / Event Alert notification if TP or Liquidation occurred */}
        {actionNotice && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between animate-pulse flex-shrink-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-amber-400">⚡ Zdarzenie:</span>
              <span>{actionNotice.event}</span>
              <span className="font-mono font-bold text-white">({actionNotice.details})</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5">✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TWO-COLUMN WORKSPACE: LEFT = ORDER FORM | RIGHT = REAL-TIME POSITION MONITOR */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 overflow-y-auto lg:overflow-hidden min-h-0">
          
          {/* ======================================================================= */}
          {/* LEFT COLUMN: FUTURES ORDER SETUP FORM (5 COLUMNS) */}
          {/* ======================================================================= */}
          <div className="lg:col-span-5 flex flex-col overflow-y-visible lg:overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            
            {/* AI STRATEGY HINT BOX */}
            <div className="rounded-xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center space-x-1">
                  <span>💡</span>
                  <span>Strategia AI (TradingAgents)</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">R:R &gt; 2.0</span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center justify-between font-mono bg-slate-950/60 p-1.5 rounded-lg border border-purple-500/20">
                <div>
                  <span className="text-slate-400">Sygnał:</span>{' '}
                  <span className={`font-bold ${(advice?.decision?.action === 'BUY' || advice?.decision?.direction === 'LONG') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {advice?.decision?.direction || advice?.decision?.action || 'LONG'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">SL:</span>{' '}
                  <span className="text-rose-300 font-bold">${advice?.decision?.stop_loss || (currentPrice * 0.985).toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-slate-400">TP Target:</span>{' '}
                  <span className="text-emerald-300 font-bold">${advice?.decision?.take_profit || (currentPrice * 1.04).toFixed(0)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyAiStrategy}
                className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                title="Wypełnij terminal parametrami ze strategii AI i wylicz TP1, TP2, TP3"
              >
                <span>⚡ Zastosuj strategię AI & wylicz TP1/TP2/TP3</span>
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleOpenPosition} className="space-y-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
              
              {/* DIRECTION SELECTOR (LONG vs SHORT) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('LONG')}
                  className={`py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 border ${
                    direction === 'LONG'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm">▲</span>
                  <span>LONG (Kupno)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SHORT')}
                  className={`py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 border ${
                    direction === 'SHORT'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/30 ring-2 ring-rose-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm">▼</span>
                  <span>SHORT (Sprzedaż)</span>
                </button>
              </div>

              {/* LEVERAGE SELECTOR */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold uppercase">Dźwignia (Leverage):</span>
                  <span className="font-mono font-extrabold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                    {leverage}x
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 font-mono text-[11px]">
                  {[2, 5, 10, 20, 25, 50].map((lev) => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setLeverage(lev)}
                      className={`py-1 rounded font-bold transition-all cursor-pointer border ${
                        leverage === lev
                          ? 'bg-purple-600 text-white border-purple-400 font-extrabold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>

              {/* ORDER TYPE & ENTRY PRICE */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">Typ zlecenia</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-white text-xs"
                  >
                    <option value="MARKET">MARKET (Cena rynkowa)</option>
                    <option value="LIMIT">LIMIT (Cena określona)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    {orderType === 'LIMIT' ? 'Cena wejścia (Limit)' : 'Cena wejścia (Market)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={orderType === 'MARKET'}
                    value={orderType === 'MARKET' ? currentPrice : limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-white text-xs disabled:opacity-75"
                  />
                </div>
              </div>

              {/* QUANTITY */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400 font-bold uppercase">Wielkość pozycji ({symbol}):</span>
                  <span className="font-mono text-slate-400">
                    Wartość: ${(notionalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="col-span-2 bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-white text-xs font-bold"
                    placeholder="np. 0.5"
                    required
                  />
                  {['0.1', '0.25', '0.5', '1.0'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded font-mono text-[10px] py-1 cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* STOP LOSS */}
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                  Stop Loss ($) {rrValues.risk > 0 && <span className="text-rose-400 font-mono">(Ryzyko: ${rrValues.risk.toFixed(1)})</span>}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder={direction === 'LONG' ? (effectiveEntry * 0.985).toFixed(2) : (effectiveEntry * 1.015).toFixed(2)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-rose-300 text-xs font-bold"
                />
              </div>

              {/* MULTI-STAGE TAKE PROFIT (TP1, TP2, TP3 dla R:R > 2.0) */}
              <div className="space-y-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Księgowanie Profitów (Take Profit):</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setTpMode('MULTI')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        tpMode === 'MULTI' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      TP1 / TP2 / TP3
                    </button>
                    <button
                      type="button"
                      onClick={() => setTpMode('SINGLE')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        tpMode === 'SINGLE' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Pojedynczy TP
                    </button>
                  </div>
                </div>

                {tpMode === 'MULTI' ? (
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-16 font-bold text-emerald-400 text-[11px]">TP1 (33%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={tp1Price}
                        onChange={(e) => setTp1Price(e.target.value)}
                        placeholder="TP1 (R:R 2.0)"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded p-1 text-emerald-300 font-bold"
                      />
                      <span className="text-[10px] text-slate-400 font-sans w-16 text-right">R:R {rrValues.tp1RR}:1</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-16 font-bold text-emerald-400 text-[11px]">TP2 (33%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={tp2Price}
                        onChange={(e) => setTp2Price(e.target.value)}
                        placeholder="TP2 (R:R 3.0)"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded p-1 text-emerald-300 font-bold"
                      />
                      <span className="text-[10px] text-slate-400 font-sans w-16 text-right">R:R {rrValues.tp2RR}:1</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-16 font-bold text-emerald-400 text-[11px]">TP3 (34%):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={tp3Price}
                        onChange={(e) => setTp3Price(e.target.value)}
                        placeholder="TP3 (R:R 4.5)"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded p-1 text-emerald-300 font-bold"
                      />
                      <span className="text-[10px] text-slate-400 font-sans w-16 text-right">R:R {rrValues.tp3RR}:1</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      value={singleTp}
                      onChange={(e) => setSingleTp(e.target.value)}
                      placeholder="Cena docelowa TP ($)"
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 font-mono text-emerald-300 font-bold"
                    />
                  </div>
                )}
              </div>

              {/* ORDER PREVIEW & LIQUIDATION WARNING */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-2 font-mono text-[11px] space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Wymagany depozyt (Margin):</span>
                  <span className="font-bold text-white">${marginRequired.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Prowizja otwarcia (Fee):</span>
                  <span className="text-amber-300">${takerFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800/80 pt-1">
                  <span>Szacowana cena likwidacji:</span>
                  <span>${estimatedLiqPrice > 0 ? estimatedLiqPrice.toFixed(2) : '–'}</span>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || numQty <= 0}
                className={`w-full py-2.5 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2 ${
                  direction === 'LONG'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30'
                }`}
              >
                <span>⚡</span>
                <span>{isSubmitting ? 'Wysyłanie zlecenia...' : `Otwórz pozycję ${direction} (${leverage}x)`}</span>
              </button>

            </form>

            {/* PREVIEW OF PORTFOLIO BEFORE VS AFTER (RECENT TRANSACTION) */}
            {recentTransaction && (
              <div className="rounded-xl bg-slate-950 border border-cyan-500/30 p-2.5 font-mono text-[11px] space-y-1.5 animate-fadeIn">
                <div className="font-bold text-cyan-300 flex items-center justify-between font-sans">
                  <span>📊 Stan Portfela Przed i Po Zleceniu:</span>
                  <span className="text-[10px] text-slate-400">#{recentTransaction.position?.id}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 font-sans uppercase">Przed transakcją</div>
                    <div className="text-slate-300">Gotówka: ${recentTransaction.portfolio_before?.cash?.toFixed(2)}</div>
                    <div className="text-slate-300">Margin: ${recentTransaction.portfolio_before?.used_margin?.toFixed(2)}</div>
                    <div className="text-white font-bold">Equity: ${recentTransaction.portfolio_before?.total_equity?.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-400 font-sans uppercase">Po transakcji</div>
                    <div className="text-cyan-300 font-bold">Gotówka: ${recentTransaction.portfolio_after?.cash?.toFixed(2)}</div>
                    <div className="text-amber-300 font-bold">Margin: ${recentTransaction.portfolio_after?.used_margin?.toFixed(2)}</div>
                    <div className="text-white font-bold">Equity: ${recentTransaction.portfolio_after?.total_equity?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ======================================================================= */}
          {/* RIGHT COLUMN: REAL-TIME POSITION MONITOR & LIQUIDATION TRACKER (7 COLS) */}
          {/* ======================================================================= */}
          <div className="lg:col-span-7 flex flex-col overflow-y-visible lg:overflow-y-auto space-y-3 pl-0 lg:pl-1 scrollbar-thin">
            
            {/* ACTIVE POSITIONS HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-bold text-white text-xs uppercase tracking-wide">
                  Aktywne Pozycje Futures na Żywo ({activePositions.length})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Cena rynkowa: ${currentPrice?.toFixed(2)}
              </span>
            </div>

            {/* ACTIVE POSITIONS CARDS */}
            {activePositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-500 text-xs font-sans space-y-2">
                <span className="text-2xl">💤</span>
                <p>Brak otwartych pozycji futures. Użyj formularza po lewej stronie, aby otworzyć pozycję.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activePositions.map((pos) => {
                  const isLong = pos.direction === 'LONG';
                  const isPartClosed = pos.status === 'PARTIALLY_CLOSED';

                  return (
                    <div
                      key={pos.id}
                      className="rounded-2xl border border-slate-700/80 bg-slate-950/90 p-3 shadow-xl space-y-2.5 font-mono text-xs relative overflow-hidden"
                    >
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                            isLong 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}>
                            {isLong ? '▲ LONG' : '▼ SHORT'} {pos.leverage}x
                          </span>
                          <span className="text-white font-bold text-sm">{pos.symbol}</span>
                          <span className="text-slate-500 text-[10px]">#{pos.id}</span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center space-x-1.5">
                          {isPartClosed ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                              CZĘŚCIOWO ZREALIZOWANO (TP)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              AKTYWNA (OPEN)
                            </span>
                          )}
                          <button
                            onClick={() => handleClosePosition(pos.id)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all text-[10px] font-bold cursor-pointer border border-slate-700"
                            title="Zamknij całą pozostałą pozycję natychmiast po cenie rynkowej"
                          >
                            Zamknij Market
                          </button>
                        </div>
                      </div>

                      {/* Main Metrics: Entry, Current, PnL & ROE */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                        <div>
                          <div className="text-[10px] text-slate-400 font-sans">Cena wejścia</div>
                          <div className="font-bold text-white">${pos.entry_price?.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-sans">Aktualna cena</div>
                          <div className="font-bold text-yellow-300">${currentPrice?.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-sans">Pozostała ilość</div>
                          <div className="font-bold text-slate-200">{pos.remaining_quantity?.toFixed(4)} / {pos.initial_quantity}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-sans">Niezrealizowany PnL (ROE)</div>
                          <div className={`font-extrabold ${pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl?.toFixed(2)} ({pos.unrealized_roe_pct >= 0 ? '+' : ''}{pos.unrealized_roe_pct?.toFixed(1)}%)
                          </div>
                        </div>
                      </div>

                      {/* Realized PnL & Liquidation Warning */}
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <div>
                          <span className="text-slate-400">Zrealizowany profit z TP:</span>{' '}
                          <span className={`font-bold ${pos.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos.realized_pnl >= 0 ? '+' : ''}${pos.realized_pnl?.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-rose-400 font-bold flex items-center space-x-1">
                          <span>🚨 Cena likwidacji:</span>
                          <span>${pos.liquidation_price?.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* MULTI-STAGE TAKE PROFIT PROGRESS */}
                      {pos.tp_levels && pos.tp_levels.length > 0 && (
                        <div className="space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                          <div className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-1">
                            Status Poziomów Take Profit (R:R &gt; 2.0):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                            {pos.tp_levels.map((tp) => (
                              <div
                                key={tp.level}
                                className={`p-1.5 rounded-lg border text-[11px] ${
                                  tp.filled
                                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                                    : 'bg-slate-950 border-slate-800 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">TP{tp.level} ({intToStr(tp.pct*100)}%)</span>
                                  {tp.filled ? (
                                    <span className="text-[10px] font-bold text-emerald-400">✔ ZREALIZOWANO</span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500">OCZEKUJE</span>
                                  )}
                                </div>
                                <div className="font-bold text-white mt-0.5">${tp.price?.toFixed(2)}</div>
                                <div className="text-[10px] text-slate-400">R:R {tp.rr_ratio}:1 {tp.filled && <span className="text-emerald-400 font-bold">+${tp.realized_pnl?.toFixed(2)}</span>}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* RECENT POSITION EVENTS LOG */}
                      {pos.history_events && pos.history_events.length > 0 && (
                        <div className="text-[10px] text-slate-400 bg-slate-900 p-1.5 rounded-lg space-y-0.5 max-h-20 overflow-y-auto font-sans">
                          {pos.history_events.slice(-3).map((ev, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="font-bold text-slate-300">{ev.event}</span>
                              <span className="font-mono text-slate-400">{ev.details}</span>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* CLOSED & LIQUIDATED POSITIONS HISTORY */}
            {closedPositions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="font-bold text-slate-400 text-xs uppercase tracking-wide">
                  Historia Zamkniętych / Zlikwidowanych Pozycji ({closedPositions.length})
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px] scrollbar-thin">
                  {closedPositions.map((cp) => (
                    <div
                      key={cp.id}
                      className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <span className={cp.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                            {cp.direction} {cp.leverage}x
                          </span>
                          <span>{cp.symbol}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            cp.status === 'LIQUIDATED' ? 'bg-rose-600 text-white animate-pulse' :
                            cp.status === 'CLOSED_TP' ? 'bg-emerald-600 text-white' :
                            cp.status === 'CLOSED_SL' ? 'bg-rose-900/60 text-rose-300 border border-rose-700' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {cp.status === 'LIQUIDATED' ? '🚨 ZLIKWIDOWANE' :
                             cp.status === 'CLOSED_TP' ? '🎯 PEŁNY PROFIT TP' :
                             cp.status === 'CLOSED_SL' ? '🛑 STOP LOSS' : cp.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Entry: ${cp.entry_price?.toFixed(2)} | Ilość: {cp.initial_quantity}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-extrabold ${cp.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {cp.realized_pnl >= 0 ? '+' : ''}${cp.realized_pnl?.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          {cp.status === 'LIQUIDATED' ? 'Utrata marginu' : 'Wynik zrealizowany'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ========================================================================= */}
        {/* FOOTER */}
        {/* ========================================================================= */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800 flex-shrink-0 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Silnik egzekucji futures aktywny: obsługa likwidacji i częściowych TP w czasie rzeczywistym</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
}

function intToStr(num) {
  return Math.round(num);
}
