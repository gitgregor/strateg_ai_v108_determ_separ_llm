import React, { useState, useEffect } from 'react';

export default function OrderHistoryModal({
  isOpen,
  onClose,
  symbol = 'BTC/USDT',
  currentPrice = 75800.0,
  marketType = 'FUTURES',
  profile = 'SIM',
  onOrderPlaced
}) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'FILLED' | 'BLOCKED' | 'SIM' | 'LIVE'
  const [isLoading, setIsLoading] = useState(false);
  const [isPlacingTest, setIsPlacingTest] = useState(false);
  const [testAction, setTestAction] = useState('BUY');
  const [testQty, setTestQty] = useState('0.25');

  // Fetch orders from backend
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/execution/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.warn('Błąd pobierania historii zleceń:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  // Submit interactive test order
  const handlePlaceTestOrder = async () => {
    setIsPlacingTest(true);
    try {
      const payload = {
        symbol: symbol || 'BTC/USDT',
        asset_class: 'CRYPTO',
        market_type: marketType === 'FUTURES' ? 'FUTURES' : 'SPOT',
        action: testAction,
        order_type: 'LIMIT',
        quantity: parseFloat(testQty) || 0.25,
        price: parseFloat(currentPrice) || 75800.0,
        leverage: marketType === 'FUTURES' ? 5 : 1
      };

      const res = await fetch('/api/v1/execution/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newOrder = await res.json();
        await fetchOrders();
        if (onOrderPlaced) onOrderPlaced(newOrder);
      }
    } catch (err) {
      console.error('Błąd składania zlecenia testowego:', err);
    } finally {
      setIsPlacingTest(false);
    }
  };

  // Clear orders history
  const handleClearOrders = async () => {
    if (!window.confirm('Czy na pewno chcesz wyczyścić historię zleceń?')) return;
    try {
      await fetch('/api/v1/execution/orders', { method: 'DELETE' });
      setOrders([]);
    } catch (err) {
      console.error('Błąd czyszczenia historii:', err);
    }
  };

  if (!isOpen) return null;

  // Filtered orders
  const filteredOrders = orders.filter((ord) => {
    if (filter === 'ALL') return true;
    if (filter === 'FILLED') return ord.status === 'FILLED';
    if (filter === 'BLOCKED') return ord.status === 'BLOCKED_BY_PROFILE';
    if (filter === 'SIM') return ord.profile === 'SIM';
    if (filter === 'LIVE') return ord.profile === 'LIVE';
    return true;
  });

  // Aggregate stats
  const totalOrders = orders.length;
  const filledOrders = orders.filter((o) => o.status === 'FILLED').length;
  const totalVolumeUsd = orders
    .filter((o) => o.status === 'FILLED')
    .reduce((sum, o) => sum + (o.quantity * o.executed_price), 0);
  const totalFeesUsd = orders
    .filter((o) => o.status === 'FILLED')
    .reduce((sum, o) => sum + (o.commission || 0), 0);

  const formatTime = (ts) => {
    if (!ts) return '–';
    const d = new Date(ts * 1000);
    return d.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-panel-glow w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-900/95 p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ========================================================================= */}
        {/* HEADER */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-mono font-bold text-lg border border-amber-500/30">
              📋
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  Historia Złożonych Zleceń
                </h3>
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-mono font-bold text-cyan-400">
                  {totalOrders} zleceń
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  profile === 'LIVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  profile === 'SIM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  Tryb: {profile}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Dziennik egzekucji algorytmicznej i manualnej silnika Strateg.AI (CCXT / IBKR / SIM)
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer border border-transparent hover:border-slate-700"
            title="Zamknij okno"
          >
            ✕
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SUMMARY STATS TILES */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-shrink-0 text-xs font-mono">
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-medium">Liczba zleceń</div>
            <div className="text-base font-bold text-white mt-0.5">{totalOrders}</div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-medium">Wypełnione (Filled)</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {filledOrders} <span className="text-[10px] text-slate-500 font-sans">({totalOrders > 0 ? Math.round((filledOrders / totalOrders) * 100) : 0}%)</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-medium">Wolumen zrealizowany</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">
              ${totalVolumeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
            <div className="text-[10px] text-slate-400 uppercase font-sans font-medium">Prowizje łączne</div>
            <div className="text-base font-bold text-amber-300 mt-0.5">
              ${totalFeesUsd.toFixed(2)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ACTION BAR: QUICK TEST ORDER FORM + FILTERS */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex-shrink-0 text-xs">
          
          {/* Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            {['ALL', 'FILLED', 'BLOCKED', 'SIM', 'LIVE'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {f === 'ALL' ? 'Wszystkie' : f}
              </button>
            ))}
          </div>

          {/* Quick Order Actions */}
          <div className="flex items-center space-x-2 flex-wrap">
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
              <button
                onClick={() => setTestAction('BUY')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  testAction === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => setTestAction('SELL')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  testAction === 'SELL' ? 'bg-rose-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                SELL
              </button>
              <input
                type="number"
                step="0.05"
                min="0.01"
                value={testQty}
                onChange={(e) => setTestQty(e.target.value)}
                className="w-16 bg-slate-950 border border-slate-700 px-1 py-0.5 rounded text-[11px] font-mono text-white text-center"
                placeholder="Ilość"
                title="Wielkość zlecenia testowego"
              />
              <button
                onClick={handlePlaceTestOrder}
                disabled={isPlacingTest}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1 shadow-sm"
                title="Złóż natychmiastowe zlecenie testowe w aktywnym profilu"
              >
                {isPlacingTest ? <span>⏳ Wysyłanie...</span> : <span>+ Złóż zlecenie</span>}
              </button>
            </div>

            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition-all cursor-pointer border border-slate-700"
              title="Odśwież listę zleceń z backendu"
            >
              🔄
            </button>
            <button
              onClick={handleClearOrders}
              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px] transition-all cursor-pointer border border-rose-500/30"
              title="Wyczyść całą historię zleceń"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ORDERS TABLE CONTAINER */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 scrollbar-thin">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs font-sans space-y-2">
              <span className="text-3xl">📭</span>
              <p>Brak zleceń w wybranej kategorii filtru.</p>
              <button
                onClick={handlePlaceTestOrder}
                className="px-3 py-1 rounded-lg bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-600/40 transition-all cursor-pointer"
              >
                Kliknij tutaj, aby złożyć zlecenie testowe
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Czas & ID</th>
                  <th className="py-2.5 px-3">Symbol / Rynek</th>
                  <th className="py-2.5 px-3">Strona</th>
                  <th className="py-2.5 px-3 text-right">Ilość</th>
                  <th className="py-2.5 px-3 text-right">Cena</th>
                  <th className="py-2.5 px-3 text-right">Wartość</th>
                  <th className="py-2.5 px-3 text-right">Koszty</th>
                  <th className="py-2.5 px-3 text-center">Tryb</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((ord, idx) => {
                  const isBuy = ord.action?.toUpperCase() === 'BUY';
                  const totalVal = (ord.quantity || 0) * (ord.executed_price || 0);

                  return (
                    <tr key={ord.order_id || idx} className="hover:bg-slate-800/40 transition-colors">
                      {/* Czas & ID */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-200">{formatTime(ord.timestamp)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">#{ord.order_id}</div>
                      </td>

                      {/* Symbol / Rynek */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <span>{ord.symbol}</span>
                          {ord.details?.market_type && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              {ord.details.market_type}
                            </span>
                          )}
                        </div>
                        {ord.details?.leverage && (
                          <div className="text-[10px] text-slate-400">Dźwignia: {ord.details.leverage}x</div>
                        )}
                      </td>

                      {/* Strona (BUY / SELL) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}>
                          {isBuy ? '▲ BUY' : '▼ SELL'}
                        </span>
                        {ord.details?.type && (
                          <span className="ml-1 text-[9px] text-slate-500 font-sans">
                            {ord.details.type}
                          </span>
                        )}
                      </td>

                      {/* Ilość */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-200 whitespace-nowrap">
                        {ord.quantity}
                      </td>

                      {/* Cena realizacji */}
                      <td className="py-2.5 px-3 text-right font-bold text-yellow-300 whitespace-nowrap">
                        {ord.executed_price > 0 ? (
                          `$${ord.executed_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-slate-500">–</span>
                        )}
                      </td>

                      {/* Wartość */}
                      <td className="py-2.5 px-3 text-right font-bold text-white whitespace-nowrap">
                        {totalVal > 0 ? (
                          `$${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-slate-500">–</span>
                        )}
                      </td>

                      {/* Koszty (Slippage / Fee) */}
                      <td className="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap text-[11px]">
                        <div>Prowizja: <span className="text-amber-300 font-bold">${(ord.commission || 0).toFixed(2)}</span></div>
                        {ord.slippage > 0 && (
                          <div className="text-[10px] text-slate-500">Poślizg: ${ord.slippage.toFixed(2)}</div>
                        )}
                      </td>

                      {/* Tryb */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ord.profile === 'LIVE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          ord.profile === 'SIM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}>
                          {ord.profile}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {ord.status === 'FILLED' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            <span>✔</span>
                            <span>FILLED</span>
                          </span>
                        ) : ord.status === 'BLOCKED_BY_PROFILE' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold" title={ord.details?.reason || 'Zablokowane przez profil READ'}>
                            <span>🔒</span>
                            <span>BLOCKED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            <span>{ord.status}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER */}
        {/* ========================================================================= */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800 flex-shrink-0 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Synchronizacja z silnikiem egzekucji w czasie rzeczywistym</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
}
