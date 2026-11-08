import React from 'react';

export default function AdvisorDecisionsView({ advice, portfolio, onExecuteAction, profile }) {
  if (!advice) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-slate-400">
        Brak decyzji doradczej. Uruchom analizę, aby aktywować graf TradingAgents v0.6.0.
      </div>
    );
  }

  const { decision, deterministic_features, sentiment_analysis, vibe_trading_bridge } = advice;

  const getActionBadge = (action) => {
    switch (action) {
      case 'BUY':
        return 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30';
      case 'SELL':
        return 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/30';
      case 'REDUCE':
        return 'bg-amber-500 text-slate-950 font-black';
      case 'HOLD':
      default:
        return 'bg-slate-700 text-slate-200 font-bold';
    }
  };

  return (
    <div className="glass-panel-glow rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
      {/* Title & Multi-Agent LangGraph Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">4</span>
            <h3 className="font-extrabold text-slate-100 text-lg">Orkiestracja Wieloagentowa (TradingAgents v0.6.0)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Framework LangGraph ze ścisłym egzekwowaniem <span className="text-cyan-400 font-semibold">Zasady nr 1</span> (agenci konsumują wyliczenia kwantytatywne).
          </p>
        </div>

        {/* Vibe-Trading Bridge Status Tag */}
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-right font-mono">
            <span className="text-[10px] text-slate-400 block">vibe-trading [smc] bridge:</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Port 8899 (Auth Guarded)
            </span>
          </div>
        </div>
      </div>

      {/* Main Trade Recommendation Board */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-inner">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Action Badge & Ticker */}
          <div className="flex items-center space-x-4">
            <div className={`px-6 py-3 rounded-2xl text-xl tracking-wider uppercase ${getActionBadge(decision.action)}`}>
              {decision.action}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black font-mono text-white">{decision.ticker}</span>
                <span className="rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-xs px-2 py-0.5 font-bold">
                  {decision.direction} ({decision.market_type})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Alokacja kapitału: <span className="font-mono text-cyan-300 font-bold">{(decision.target_allocation_pct * 100).toFixed(0)}%</span> portfela
              </p>
            </div>
          </div>

          {/* Price Metrics: Entry, SL, TP, R:R */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto font-mono">
            {/* Entry */}
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Wejście (Entry)</span>
              <span className="text-sm font-bold text-white">${decision.entry_price?.toFixed(2)}</span>
            </div>

            {/* Stop Loss */}
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-rose-900/40 text-center">
              <span className="text-[10px] text-rose-400 uppercase block font-sans">Stop Loss</span>
              <span className="text-sm font-bold text-rose-300">${decision.stop_loss?.toFixed(2)}</span>
            </div>

            {/* Take Profit */}
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-emerald-900/40 text-center">
              <span className="text-[10px] text-emerald-400 uppercase block font-sans">Take Profit</span>
              <span className="text-sm font-bold text-emerald-300">${decision.take_profit?.toFixed(2)}</span>
            </div>

            {/* Risk to Reward */}
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-cyan-900/40 text-center">
              <span className="text-[10px] text-cyan-400 uppercase block font-sans">Risk : Reward</span>
              <span className="text-sm font-black text-cyan-300">1 : {decision.risk_reward_ratio?.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Safety Checks & Warnings */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
              decision.safety_passed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {decision.safety_passed ? '✓ Risk Guardian Zatwierdzony' : '✗ Risk Guardian Odrzucony'}
            </span>
            <span className="text-slate-400">Pewność orkiestratora: {(decision.confidence_score * 100).toFixed(0)}%</span>
          </div>

          {/* Quick Execution Button */}
          {decision.action !== 'HOLD' && (
            <button
              onClick={() => onExecuteAction(decision)}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Wykonaj Zlecenie ({profile})
            </button>
          )}
        </div>
      </div>

      {/* Multi-Agent Collaborative Debate Synthesis */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Synteza Debaty Agentów Finansowych (Sub-Agents Reasoning):
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          {/* Agent 1: Technical Analyst */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between font-sans">
              <span className="font-bold text-slate-200">📊 Technical Analyst</span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded">
                {decision.reasoning?.technical?.signal}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Ocena: RSI {decision.reasoning?.technical?.indicators_used?.rsi?.toFixed(1)}, MACD Hist {decision.reasoning?.technical?.indicators_used?.macd_hist?.toFixed(2)}.
            </p>
          </div>

          {/* Agent 2: SMC Specialist */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between font-sans">
              <span className="font-bold text-slate-200">🏛️ SMC / Order Flow</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                {decision.reasoning?.smc?.smc_bias}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Kluczowy poziom instytucjonalny: ${decision.reasoning?.smc?.key_institutional_level?.toFixed(2)}. FVG: {decision.reasoning?.smc?.active_fvgs_count}.
            </p>
          </div>

          {/* Agent 3: Sentiment & Macro */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between font-sans">
              <span className="font-bold text-slate-200">🧠 Sentiment & Macro</span>
              <span className="text-[10px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded">
                {decision.reasoning?.sentiment?.composite_label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Wynik zagregowany: {decision.reasoning?.sentiment?.composite_score > 0 ? `+${decision.reasoning?.sentiment?.composite_score}` : decision.reasoning?.sentiment?.composite_score}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
