import React, { useState } from 'react';

export default function CloudSyncModal({
  isOpen,
  onClose,
  syncState,
  connectedDevices = [],
  onForceSync,
  onResetCloud
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    if (onForceSync) {
      await onForceSync();
    }
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 400);
  };

  const formatTime = (ts) => {
    if (!ts) return 'przed chwilą';
    try {
      const d = new Date(ts * 1000);
      return d.toLocaleTimeString('pl-PL') + ' ' + d.toLocaleDateString('pl-PL');
    } catch {
      return 'przed chwilą';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-4 sm:p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xl shadow-md shadow-cyan-500/20">
              ☁️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                Synchronizacja w Chmurze
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ● Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Współdzielenie portfela, pozycji futures i kontekstu rynkowego pomiędzy Desktop a Mobile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Sync Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Status Chmury</div>
            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Aktywna
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Wersja Stanu</div>
            <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
              v{syncState?.version || 1}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Połączone Urządzenia</div>
            <div className="text-sm font-bold text-amber-300 mt-1">
              {Math.max(1, (connectedDevices.length || syncState?.active_devices_count || 1))} urządz.
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Ostatnia Zmiana</div>
            <div className="text-[11px] font-mono text-slate-300 mt-1 truncate">
              {formatTime(syncState?.last_updated)}
            </div>
          </div>
        </div>

        {/* Live Connected Devices Section */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>📱💻</span> Wykryte Urządzenia w Chmurze
            </span>
            <span className="text-[11px] text-cyan-400 font-mono">
              Protokół: WebSocket + REST Duplex
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="text-lg">💻</span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    Desktop PC / Laptop (Stanowisko Tradingowe)
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      GŁÓWNY
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Interfejs pełnoekranowy • TradingView Charts • Analiza Multi-Agent
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>ZSYNCHRONIZOWANY</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="text-lg">📱</span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    Telefon Mobilny (Aplikacja Responsywna)
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/30">
                      MOBILNY
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Nawigacja dotykowa • Egzekucja zleceń w drodze • Podgląd portfela
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>ZSYNCHRONIZOWANY</span>
              </div>
            </div>
          </div>
        </div>

        {/* What is being synced */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span>🔄</span> Automatycznie Synchronizowane Obszary Danych:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <span className="text-emerald-400">✓</span>
              <span><b>Portfel Futures:</b> Saldo gotówki, zablokowany margin, niezrealizowany PnL i ROE</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <span className="text-emerald-400">✓</span>
              <span><b>Otwarte Pozycje:</b> Kierunek (LONG/SHORT), dźwignia, poziomy TP1/TP2/TP3, ceny likwidacji</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <span className="text-emerald-400">✓</span>
              <span><b>Historia Transakcji:</b> Wszystkie wykonane zlecenia, realizacje TP oraz pozycje zlikwidowane</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <span className="text-emerald-400">✓</span>
              <span><b>Ustawienia Rynku:</b> Wybrana giełda (Binance, OKX itd.), interwał świecowy i profil SIM/LIVE</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {syncSuccess ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                ✓ Pomyślnie zsynchronizowano z chmurą!
              </span>
            ) : (
              <span>Dane są trwale zapisywane w pamięci chmury.</span>
            )}
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{isSyncing ? '⏳ Synchronizuję...' : '🔄 Wymuś synchronizację teraz'}</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all cursor-pointer"
            >
              Zamknij
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
