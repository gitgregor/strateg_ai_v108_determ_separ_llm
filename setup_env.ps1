<#
.SYNOPSIS
    Bootstrap environment for Strateg AI Advisor Backend (Python 3.13 + uv).
    Installs packages, clones TauricResearch/TradingAgents v0.6.0, and configures
    CVE-2026-114108 authentication for vibe-trading-ai[smc]>=0.1.7.
#>

$ErrorActionPreference = "Stop"

Write-Host "=== [1/5] Inicjalizacja srodowiska Python 3.13 przez uv ===" -ForegroundColor Cyan
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "Instalowanie narzedzia uv..."
    pip install uv
}
uv venv --python 3.13

Write-Host "=== [2/5] Instalacja warstwy analizy technicznej i SMC ===" -ForegroundColor Cyan
uv pip install pandas-ta-classic==0.9.0 numba smartmoneyconcepts

Write-Host "=== [3/5] Instalacja warstwy sentymentu NLP (FinBERT & CryptoBERT) ===" -ForegroundColor Cyan
uv pip install transformers torch yfinance httpx

Write-Host "=== [4/5] Klonowanie TradingAgents (v0.6.0) oraz instalacja vibe-trading-ai[smc]>=0.1.7 ===" -ForegroundColor Cyan
if (-not (Test-Path "vendor/TradingAgents")) {
    New-Item -ItemType Directory -Force -Path "vendor" | Out-Null
    git clone --branch v0.6.0 https://github.com/TauricResearch/TradingAgents.git vendor/TradingAgents
}
uv pip install -e vendor/TradingAgents
uv pip install "vibe-trading-ai[smc]>=0.1.7" langgraph

Write-Host "=== [5/5] Instalacja warstwy backtestingu i egzekucji (vectorbt, NautilusTrader, CCXT, ib_async) ===" -ForegroundColor Cyan
uv pip install vectorbt nautilus_trader ccxt ib_async fastapi "uvicorn[standard]" pydantic pydantic-settings

# Security remediation for CVE-2026-114108
if (-not $env:API_AUTH_KEY) {
    $env:API_AUTH_KEY = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
    Write-Host "[SECURITY] Wygenerowano bezpieczny klucz API_AUTH_KEY (ochrona przed CVE-2026-114108)." -ForegroundColor Green
}

Write-Host "Gotowe! Aby uruchomic serwer vibe-trading oraz FastAPI:" -ForegroundColor Green
Write-Host "  1) `$env:API_AUTH_KEY='$($env:API_AUTH_KEY)'; uv run vibe-trading serve --port 8899"
Write-Host "  2) uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
