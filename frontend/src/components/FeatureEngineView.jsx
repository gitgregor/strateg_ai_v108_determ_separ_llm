import React from 'react';

export default function FeatureEngineView({ features }) {
  if (!features) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-slate-400">
        Brak danych analitycznych. Kliknij "Generuj Wycenę Deterministyczną", aby uruchomić feature engine.
      </div>
    );
  }

  const {
    symbol,
    timeframe,
    latest_close,
    latest_volume,
    sma_20,
    sma_50,
    sma_200,
    hma_20,
    rsi_14,
    macd,
    macd_signal,
    macd_hist,
    bbands_upper,
    bbands_middle,
    bbands_lower,
    squeeze_on,
    obv,
    aroon_up,
    aroon_down,
    active_candlestick_patterns,
    fair_value_gaps,
    order_blocks,
    structure_breaks,
    breaker_blocks,
    trend_regime,
    volatility_regime,
    smc_bias
  } = features;

  const getRsiColor = (val) => {
    if (val >= 70) return 'text-rose-400 font-bold';
    if (val <= 30) return 'text-emerald-400 font-bold';
    return 'text-cyan-300 font-semibold';
  };

  const getMacdHistColor = (val) => {
    if (val > 0) return 'text-emerald-400';
    if (val < 0) return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Price & Regime Summaries */}
      <div className="glass-panel-glow rounded-2xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-black tracking-tight text-white font-mono">{symbol}</h2>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">{timeframe}</span>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                Deterministyczne wyliczenia (Rule #1)
              </span>
            </div>
            <div className="mt-1 flex items-baseline space-x-3">
              <span className="text-3xl font-extrabold text-white font-mono">
                ${latest_close?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              <span className="text-xs text-slate-400 font-mono">Vol: {latest_volume?.toLocaleString()}</span>
            </div>
          </div>

          {/* Regime Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Trend Regime */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 text-center min-w-[120px]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Trend Regime</span>
              <span className={`text-xs font-bold font-mono ${
                trend_regime.includes('BULLISH') ? 'text-emerald-400' : (trend_regime.includes('BEARISH') ? 'text-rose-400' : 'text-slate-300')
              }`}>
                {trend_regime}
              </span>
            </div>

            {/* Volatility Regime */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 text-center min-w-[120px]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Volatility</span>
              <span className={`text-xs font-bold font-mono ${squeeze_on ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`}>
                {squeeze_on ? '🔥 SQUEEZE ON' : volatility_regime}
              </span>
            </div>

            {/* SMC Bias */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 text-center min-w-[140px]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">SMC Order Flow</span>
              <span className={`text-xs font-bold font-mono ${
                smc_bias.includes('BULLISH') ? 'text-emerald-400' : (smc_bias.includes('BEARISH') ? 'text-rose-400' : 'text-slate-300')
              }`}>
                {smc_bias}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 1. Quantitative Indicators & 2. Smart Money Concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Technical Analysis (pandas-ta-classic + numba) */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-bold">1</span>
              <h3 className="font-bold text-slate-100">Warstwa Wskaźników Technicznych</h3>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              pandas-ta-classic + numba
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* SMA 20 */}
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">SMA (20)</span>
              <p className="mt-1 font-mono text-sm font-bold text-slate-200">${sma_20 ? sma_20.toFixed(2) : '—'}</p>
            </div>

            {/* SMA 50 */}
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">SMA (50)</span>
              <p className="mt-1 font-mono text-sm font-bold text-slate-200">${sma_50 ? sma_50.toFixed(2) : '—'}</p>
            </div>

            {/* HMA 20 (Hull MA) */}
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">HMA (20) Hull</span>
              <p className="mt-1 font-mono text-sm font-bold text-indigo-300">${hma_20 ? hma_20.toFixed(2) : '—'}</p>
            </div>

            {/* RSI 14 */}
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">RSI (14)</span>
              <p className={`mt-1 font-mono text-sm ${getRsiColor(rsi_14 || 50)}`}>
                {rsi_14 ? rsi_14.toFixed(2) : '—'}
              </p>
            </div>

            {/* MACD */}
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">MACD Hist</span>
              <p className={`mt-1 font-mono text-sm font-bold ${getMacdHistColor(macd_hist || 0)}`}>
                {macd_hist ? macd_hist.toFixed(2) : '—'}
              </p>
            </div>

            {/* Squeeze Momentum */}
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">John Carter Squeeze</span>
              <p className="mt-1 font-mono text-sm font-bold">
                {squeeze_on ? (
                  <span className="text-amber-400 font-extrabold animate-pulse">ON (Kompresja)</span>
                ) : (
                  <span className="text-slate-400">OFF (Ekspansja)</span>
                )}
              </p>
            </div>

            {/* Bollinger Bands */}
            <div className="col-span-2 rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Bollinger Bands (20, 2.0)</span>
              <div className="mt-1 flex justify-between font-mono text-xs">
                <span className="text-rose-400">Góra: ${bbands_upper?.toFixed(2)}</span>
                <span className="text-slate-400">Śr: ${bbands_middle?.toFixed(2)}</span>
                <span className="text-emerald-400">Dół: ${bbands_lower?.toFixed(2)}</span>
              </div>
            </div>

            {/* Aroon Up/Down */}
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Aroon (14)</span>
              <p className="mt-1 font-mono text-xs text-slate-300">
                <span className="text-emerald-400">▲{aroon_up?.toFixed(0)}</span> / <span className="text-rose-400">▼{aroon_down?.toFixed(0)}</span>
              </p>
            </div>
          </div>

          {/* Formacje Świecowe CDL */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <span className="text-xs font-semibold text-slate-300 block mb-2">Formacje Świecowe (CDL Formations):</span>
            {active_candlestick_patterns && active_candlestick_patterns.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {active_candlestick_patterns.map((cdl, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                      cdl.includes('BULLISH') ? 'bullish-badge' : 'bearish-badge'
                    }`}
                  >
                    {cdl}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">Brak wyraźnych skrajnych formacji świecowych w bieżącym oknie.</span>
            )}
          </div>
        </div>

        {/* Card 2: Smart Money Concepts (smartmoneyconcepts / SMC) */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-bold">2</span>
              <h3 className="font-bold text-slate-100">Struktura Rynku ICT / Smart Money Concepts</h3>
            </div>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              smartmoneyconcepts (smc)
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {/* Fair Value Gaps (FVG) Table */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">Fair Value Gaps (FVG - Dysbalans Płynności):</span>
                <span className="text-[11px] font-mono text-slate-400">Wykryto: {fair_value_gaps?.length || 0}</span>
              </div>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-xs">
                {fair_value_gaps && fair_value_gaps.length > 0 ? (
                  <div className="space-y-1.5 font-mono">
                    {fair_value_gaps.slice(-4).map((fvg, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-1 rounded bg-slate-950/60">
                        <span className={`font-bold ${fvg.direction === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {fvg.direction === 1 ? '▲ BULLISH FVG' : '▼ BEARISH FVG'}
                        </span>
                        <span className="text-slate-300">
                          ${fvg.bottom.toFixed(2)} - ${fvg.top.toFixed(2)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${fvg.mitigated ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                          {fvg.mitigated ? 'Mitigated' : 'UNMITIGATED'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">Brak aktywnych stref FVG w ostatnim interwale.</span>
                )}
              </div>
            </div>

            {/* Order Blocks (OB) & Breakers */}
            <div className="grid grid-cols-2 gap-3">
              {/* Order Blocks */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <span className="text-[11px] font-semibold text-slate-300 block mb-1">Order Blocks (OB):</span>
                {order_blocks && order_blocks.length > 0 ? (
                  <div className="space-y-1 font-mono text-xs">
                    {order_blocks.slice(-2).map((ob, idx) => (
                      <div key={idx} className={`p-1.5 rounded ${ob.direction === 1 ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-900/50' : 'bg-rose-950/30 text-rose-300 border border-rose-900/50'}`}>
                        <div className="font-bold text-[10px] uppercase">{ob.direction === 1 ? 'Bullish Demand' : 'Bearish Supply'}</div>
                        <div className="text-[11px]">${ob.bottom.toFixed(2)} - ${ob.top.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">Brak aktywnych stref OB.</span>
                )}
              </div>

              {/* Breakers & Structure Breaks (BOS / CHOCH) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <span className="text-[11px] font-semibold text-slate-300 block mb-1">Breakers & Struktura (BOS):</span>
                {structure_breaks && structure_breaks.length > 0 ? (
                  <div className="space-y-1 font-mono text-xs">
                    {structure_breaks.slice(-2).map((sb, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                        <span className={`font-bold text-[10px] ${sb.direction === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {sb.type} {sb.direction === 1 ? '▲ Wybicie w Górę' : '▼ Wybicie w Dół'}
                        </span>
                        <div className="text-[11px] text-slate-400">Poziom: ${sb.level.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">Brak świeżych wybić struktury BOS.</span>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
