import React from 'react';

export default function VibeTradingStatusModal({ isOpen, onClose, vibeStatus }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel-glow w-full max-w-lg rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-sm">
              🛡️
            </span>
            <h3 className="font-bold text-slate-100 text-base">Audyt Bezpieczeństwa: CVE-2026-114108</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs text-slate-300">
          <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/60 p-3 text-emerald-200">
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>Status Remediacji: ZABEZPIECZONY (Protected)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Serwer backendu wymusza konfigurację zmiennej <code className="font-mono bg-emerald-900/60 px-1 py-0.5 rounded text-white">API_AUTH_KEY</code> oraz przekazuje nagłówek autoryzacyjny <code className="font-mono bg-emerald-900/60 px-1 py-0.5 rounded text-white">Authorization: Bearer</code> do serwera <code className="font-mono bg-emerald-900/60 px-1 py-0.5 rounded text-white">vibe-trading-ai[smc]</code> na porcie 8899.
            </p>
          </div>

          <div className="space-y-2 font-sans">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Opis Luki (Vulnerability Summary):</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              W wersjach pakietu <code className="font-mono text-cyan-300">vibe-trading-ai</code> wcześniejszych niż <code className="font-mono text-cyan-300">0.1.7</code>, brak jawnego skonfigurowania klucza uwierzytelniania powodował ominięcie weryfikacji tożsamości na endpointach FastAPI, co w środowiskach sieciowych mogło umożliwić nieautoryzowane wykonanie kodu za pośrednictwem narzędzi systemowych (<code className="font-mono text-slate-300">BashTool</code>).
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 font-mono text-[11px] space-y-1">
            <div className="text-slate-400">Wymagane polecenie uruchomienia serwera vibe-trading:</div>
            <div className="text-cyan-400 font-bold bg-slate-950 p-2 rounded overflow-x-auto">
              $env:API_AUTH_KEY="&lt;twój_bezpieczny_klucz&gt;"; uv run vibe-trading serve --port 8899
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
