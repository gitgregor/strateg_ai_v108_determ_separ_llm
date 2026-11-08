import React from 'react';

export default function SentimentView({ sentiment }) {
  if (!sentiment) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center text-slate-400">
        Brak danych sentymentu. Uruchom analizę, aby wywołać FinBERT / CryptoBERT.
      </div>
    );
  }

  const {
    symbol,
    asset_class,
    composite_score,
    composite_label,
    confidence,
    factors,
    sample_items,
    model_used
  } = sentiment;

  const getScoreColor = (score) => {
    if (score >= 0.25) return 'text-emerald-400';
    if (score <= -0.25) return 'text-rose-400';
    return 'text-slate-300';
  };

  const getGaugePercentage = (score) => {
    // Map -1.0 to 1.0 -> 0% to 100%
    return Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 text-xs font-bold">3</span>
            <h3 className="font-bold text-slate-100">Warstwa Sentymentu NLP (Dual Transformer Engine)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Aktywny model: <span className="font-mono text-cyan-300 font-semibold">{model_used}</span> ({asset_class})
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">Pewność modelu:</span>
          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Main Gauge & Composite Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Composite Score Card */}
        <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 text-center">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Wagowy Wskaźnik Sentymentu</span>
          <div className={`text-3xl font-black font-mono mt-1 ${getScoreColor(composite_score)}`}>
            {composite_score > 0 ? `+${composite_score.toFixed(3)}` : composite_score.toFixed(3)}
          </div>
          <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
            composite_label.includes('BULLISH') ? 'bullish-badge' : (composite_label.includes('BEARISH') ? 'bearish-badge' : 'neutral-badge')
          }`}>
            {composite_label}
          </span>
        </div>

        {/* Visual Gauge Bar */}
        <div className="md:col-span-2 rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-2">
          <div className="flex justify-between text-xs font-mono font-medium">
            <span className="text-rose-400 font-bold">Skrajnie Negatywny (-1.0)</span>
            <span className="text-slate-400">Neutralny (0.0)</span>
            <span className="text-emerald-400 font-bold">Skrajnie Pozytywny (+1.0)</span>
          </div>

          <div className="relative h-4 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 opacity-60"></div>
            {/* Needle indicator */}
            <div
              className="absolute top-0 bottom-0 w-2.5 -ml-1 bg-white border border-slate-900 shadow-md shadow-white/50 rounded-full transition-all duration-500"
              style={{ left: `${getGaugePercentage(composite_score)}%` }}
            ></div>
          </div>

          <p className="text-[11px] text-slate-400">
            Wynik syntetyzowany z {sample_items?.length || 0} próbek tekstu z ważeniem czynnikowym.
          </p>
        </div>
      </div>

      {/* Factor Breakdown Cards */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Rozbicie Wagowe na Czynniki Rynkowe (Factor Breakdown):
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {factors && Object.entries(factors).map(([factorKey, f]) => (
            <div key={factorKey} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200">
                  {f.factor_name === 'YahooNews' && '📰 Yahoo News'}
                  {f.factor_name === 'InsiderTrades' && '💼 Transakcje Insiderów'}
                  {f.factor_name === 'Reddit' && '👾 Reddit Social'}
                  {f.factor_name === 'StockTwits' && '💬 StockTwits Flow'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  waga: {(f.weight * 100).toFixed(0)}%
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between font-mono">
                <span className={`text-base font-extrabold ${getScoreColor(f.score)}`}>
                  {f.score > 0 ? `+${f.score.toFixed(2)}` : f.score.toFixed(2)}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  f.status === 'BULLISH' ? 'text-emerald-400 bg-emerald-950/60' : (f.status === 'BEARISH' ? 'text-rose-400 bg-rose-950/60' : 'text-slate-400 bg-slate-800')
                }`}>
                  {f.status}
                </span>
              </div>

              <div className="mt-1 text-[11px] text-slate-400 flex justify-between">
                <span>Próbki: {f.sample_count}</span>
                <span className="font-mono text-cyan-400">Wkład: {f.contribution > 0 ? `+${f.contribution.toFixed(3)}` : f.contribution.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sample Items Feed */}
      {sample_items && sample_items.length > 0 && (
        <div className="pt-2">
          <span className="text-xs font-semibold text-slate-300 block mb-2">Ostatnie Próbki z Modeli NLP:</span>
          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
            {sample_items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-900/40 border border-slate-800/80 p-2 text-xs">
                <div className="flex items-center space-x-2 max-w-[80%] truncate">
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                    {item.source}
                  </span>
                  <span className="truncate text-slate-300 font-medium">{item.text}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono">
                  <span className={`text-[11px] font-bold ${item.normalized_polarity > 0 ? 'text-emerald-400' : (item.normalized_polarity < 0 ? 'text-rose-400' : 'text-slate-400')}`}>
                    {item.label} ({(item.score * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
