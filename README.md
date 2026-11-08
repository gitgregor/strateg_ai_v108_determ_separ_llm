# Strateg AI Investment Advisor Backend (Python 3.13 + uv + FastAPI)

Kompletny, modułowy backend dla doradcy inwestycyjnego obsługującego rynki **Spot** oraz **Futures** dla **kryptowalut** i **akcji**, zarządzany przez narzędzie `uv` i udostępniony przez `FastAPI`.

---

## 🏛️ Zasada Architektoniczna Nr 1 (Deterministic/LLM Isolation)
**Całkowita izolacja obliczeń matematycznych od wnioskowania modeli LLM:**
Modele językowe (LLM) **nie mają prawa samodzielnie wyliczać wskaźników, estymować średnich kroczących ani zgadywać poziomów cenowych**. 
Wszystkie wskaźniki techniczne, formacje świecowe oraz struktury rynku (SMC/ICT) są wyliczane w 100% deterministycznie przez biblioteki kwantytatywne (`pandas-ta-classic`, `numba`, `smartmoneyconcepts`), a sentyment przez dedykowane modele NLP (`FinBERT`, `CryptoBERT`). Modele orkiestracji (TradingAgents v0.6.0) otrzymują wyłącznie zwalidowane, niezmienne struktury danych (`DeterministicMarketFeatures`, `AggregatedSentimentResult`).

---

## 📦 Architektura Modułowa i Komponenty

```
Strateg_AI_Deep_Reaserch_v108/
├── config.py                      # Globalna konfiguracja, profile egzekucji, CVE-2026-114108
├── feature_engine.py              # Warstwa 1: Analiza Techniczna & SMC (FVG, OB, BOS, Breakers)
├── sentiment_engine.py            # Warstwa 2: NLP FinBERT & CryptoBERT + czynniki Yahoo/SEC/Social
├── advisor_agents.py              # Warstwa 3: Orkiestracja TradingAgents (v0.6.0) + vibe-trading-ai
├── execution_engine.py            # Warstwa 4: VectorBT, NautilusTrader, CCXT, ib_async (Read/Sim/Live)
├── main.py                        # Aplikacja FastAPI (REST API v1)
├── test_suite.py                  # Zestaw testów jednostkowych i integracyjnych
├── pyproject.toml                 # Definicja projektu dla menedżera `uv` i Python 3.13
├── setup_env.ps1                  # Automatyczny skrypt instalacyjny PowerShell
├── .env.example                   # Szablon zmiennych środowiskowych i kluczy API
└── vendor/
    └── TradingAgents/             # TauricResearch/TradingAgents v0.6.0 (DEFAULT_CONFIG, Graph, Portfolio)
```

---

### 1. Warstwa Analizy Technicznej i Struktury Rynku (`feature_engine.py`)
- **Biblioteki**: `pandas-ta-classic==0.9.0` oraz `numba`.
- **Wskaźniki deterministyczne**:
  - `SMA` (20, 50, 200) oraz `HMA` (Hull Moving Average 20).
  - `RSI` (14) oraz `MACD` (12, 26, 9) z histogramem.
  - `BBANDS` (Bollinger Bands 20, 2.0 std) oraz wskaźnik kompresji `SQUEEZE` (John Carter Squeeze).
  - `OBV` (On-Balance Volume) oraz oscylator `AROON` (14).
  - Formacje świecowe `CDL` (Doji, Hammer, Engulfing, Morning/Evening Star).
- **Smart Money Concepts (SMC / ICT)** via `from smartmoneyconcepts import smc`:
  - **Fair Value Gaps (FVG)**: Wykrywanie dysbalansu płynności, poziomów top/bottom oraz statusu mitygacji.
  - **Order Blocks (OB)**: Instytucjonalne strefy popytu (Demand) i podaży (Supply) z powiązanym wolumenem.
  - **Break of Structure (BOS)** i **Change of Character (CHOCH)**: Przebicia struktur i zmiany trendu.
  - **Breaker Blocks**: Przełamane Order Blocki zmieniające biegunowość (wsparcie $\leftrightarrow$ opór).

### 2. Warstwa Sentymentu i Czynników Wpływających (`sentiment_engine.py`)
- **Dwa wyspecjalizowane modele NLP**:
  - `"ProsusAI/finbert"`: Analiza akcji, komunikatów makroekonomicznych i wyników kwartalnych.
  - `"ElKulako/cryptobert"`: Analiza social media (Twitter/X, Reddit, Telegram, StockTwits) dla kryptowalut.
- **Wagowy wynik kompozytowy [-1.0 do +1.0] i rozbicie czynników**:
  - *Yahoo Finance News* (analiza nagłówków instytucjonalnych).
  - *Transakcje insiderów (SEC Form 4)* dla spółek giełdowych.
  - *Nastroje społeczności Reddit & StockTwits* (waga wyższa dla kryptowalut).

### 3. Warstwa Orkiestracji Wieloagentowej (`advisor_agents.py`)
- **TauricResearch/TradingAgents (v0.6.0)**:
  - Oparty na LangGraph wieloagentowy system symulujący biuro doradztwa inwestycyjnego:
    - *Technical Analyst Agent*
    - *SMC Specialist Agent*
    - *Sentiment & Macro Agent*
    - *Risk Guardian Agent* (wymusza sztywny stosunek Risk-to-Reward $\ge 1:2$, limity obsunięcia i wielkości pozycji)
    - *Portfolio Manager Agent* (syntetyzuje decyzję końcową: BUY, SELL, HOLD, REDUCE).
  - Wykorzystanie struktur `DEFAULT_CONFIG`, `TradingAgentsGraph` oraz `PortfolioContext` (zarządzanie rzeczywistym kapitałem, depozytem zabezpieczającym i ekspozycją).
- **Integracja `vibe-trading-ai[smc]>=0.1.7`**:
  - Połączenie klienta HTTP z serwerem `vibe-trading serve --port 8899`.
  - **Remediacja podatności CVE-2026-114108**: Wymóg obowiązkowej konfiguracji zmiennej `API_AUTH_KEY` i przekazywania nagłówka `Authorization: Bearer <API_AUTH_KEY>`. Brak klucza blokuje start serwera ze względów bezpieczeństwa.

### 4. Warstwa Backtestingu i Egzekucji (`execution_engine.py`)
- **Optymalizacja siatek parametrów w `vectorbt`**:
  - Błyskawiczny grid search dla kombinacji szybkich i wolnych średnich oraz progów RSI (wyliczenie Sharpe Ratio, Max Drawdown, Win Rate, Total Return).
- **Egzekucja tickowa w `NautilusTrader`**:
  - Model symulacji kolejki zleceń, poślizgu (slippage) i mikro-opóźnień na poziomie tickowym (high-frequency event simulator).
- **Kierowcy giełdowi**:
  - `CCXT`: Obsługa rynku Spot i Futures (perpetual contracts) dla kryptowalut (Binance, Bybit, OKX) z ustawianiem dźwigni.
  - `ib_async` & `ibkr-httpapi`: Obsługa rynku Spot i Futures dla akcji przez Interactive Brokers (TWS / IB Gateway / Client Portal Gateway).
- **Trzy profile operacyjne**:
  - `READ`: Wyłącznie odczyt notowań, portfela i zleceń. Bezwzględna blokada wysyłania zleceń.
  - `SIM`: Symulacja papierowa (paper trading) uwzględniająca poślizgi cenowe i prowizje brokerskie.
  - `LIVE`: Rzeczywista egzekucja na rynku chroniona limitami bezpieczeństwa i mechanizmem Kill-Switch.

---

## 🚀 Szybki Start i Uruchomienie

### Krok 1: Instalacja środowiska przez `uv` (PowerShell)
```powershell
# Uruchom automatyczny skrypt instalacyjny:
.\setup_env.ps1
```
Lub ręcznie za pomocą `uv`:
```bash
# Inicjalizacja środowiska Python 3.13
uv venv --python 3.13

# Instalacja pakietów
uv pip install pandas-ta-classic==0.9.0 numba smartmoneyconcepts
uv pip install transformers torch yfinance httpx
uv pip install "vibe-trading-ai[smc]>=0.1.7" langgraph
uv pip install vectorbt nautilus_trader ccxt ib_async fastapi "uvicorn[standard]" pydantic pydantic-settings
```

### Krok 2: Konfiguracja zmiennych środowiskowych (`.env`)
Skopiuj `.env.example` do `.env` i ustaw klucz bezpieczeństwa:
```bash
# Wymóg CVE-2026-114108:
API_AUTH_KEY="vt_sec_twoj_unikalny_bezpieczny_klucz_token_64_znakow"
EXECUTION_PROFILE="SIM"
```

### Krok 3: Uruchomienie `vibe-trading` oraz FastAPI Backend
```bash
# Terminal 1: Serwer vibe-trading na porcie 8899 z zabezpieczeniem auth key
$env:API_AUTH_KEY="vt_sec_twoj_unikalny_bezpieczny_klucz_token_64_znakow"
uv run vibe-trading serve --port 8899

# Terminal 2: Główny backend FastAPI
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 💻 Interfejs Użytkownika (Frontend w React)
Aplikacja frontendowa w React jest w pełni zintegrowana:
1. **Dostęp bezpośredni (Zero-Setup)**:
   Po uruchomieniu serwera FastAPI wejdź w przeglądarce pod adres:
   👉 **`http://localhost:8000/app`**
   Interaktywny kokpit React załaduje się natychmiast z poziomu FastAPI!

2. **Dostęp przez środowisko deweloperskie Vite (opcjonalnie)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Dostęp pod adresem: `http://localhost:5173` (z automatycznym proxy `/api` do FastAPI).

---

## 📡 Przegląd Endpointów API (FastAPI)

Interaktywna dokumentacja Swagger UI dostępna pod: `http://localhost:8000/docs`.

| Metoda | Endpoint | Opis |
|---|---|---|
| `GET` | `/` | Status systemu, profil egzekucji, weryfikacja zasady nr 1 i audyt CVE-2026-114108 |
| `POST` | `/api/v1/features/analyze` | Deterministyczne wyliczenie TA (SMA/HMA/MACD/BB/RSI/CDL) oraz SMC (FVG/OB/BOS/Breakers) |
| `POST` | `/api/v1/sentiment/analyze` | Analiza sentymentu (FinBERT/CryptoBERT) i rozbicie czynników (Yahoo/SEC/Social) |
| `POST` | `/api/v1/advisor/evaluate` | Wielomodelowa ewaluacja doradcy TradingAgents z uwzględnieniem `PortfolioContext` |
| `GET` | `/api/v1/vibe-trading/status` | Sprawdzenie łączności z `vibe-trading serve --port 8899` i autoryzacji |
| `POST` | `/api/v1/backtest/grid-optimize` | Optymalizacja parametrów w `vectorbt` (Sharpe, Max DD, Total Return) |
| `POST` | `/api/v1/backtest/nautilus-tick-sim` | Symulacja egzekucji tickowej NautilusTrader |
| `POST` | `/api/v1/execution/order` | Złożenie zlecenia (CCXT / IBKR) w profilu READ, SIM lub LIVE |
| `PUT` | `/api/v1/execution/profile` | Przełączenie aktywnego profilu (`READ`, `SIM`, `LIVE`) |
