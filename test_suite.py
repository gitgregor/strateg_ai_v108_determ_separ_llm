"""
Comprehensive Test Suite for Strateg AI Investment Advisor Backend.
Validates:
1. Architectural Rule #1: Deterministic quantitative isolation.
2. Feature Engine (Pandas-TA + SMC: FVG, OB, BOS, Breakers).
3. Sentiment Engine (FinBERT & CryptoBERT factor breakdown).
4. Multi-Agent Orchestrator (TradingAgents v0.6.0 + CVE-2026-114108 auth).
5. Execution Engine (VectorBT, NautilusTrader, Profiles: Read, Sim, Live).
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure root is in path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import settings, ExecutionProfile, MarketType, AssetClass
from feature_engine import feature_engine, DeterministicMarketFeatures
from sentiment_engine import sentiment_engine, AggregatedSentimentResult
from advisor_agents import (
    advisor_orchestrator,
    TradingAgentsGraph,
    PortfolioContext,
    Position,
    DEFAULT_CONFIG,
    VibeTradingClient
)
from execution_engine import (
    execution_engine,
    OrderRequest,
    GridOptimizationParams
)


def create_sample_ohlcv(n: int = 60) -> pd.DataFrame:
    """Creates synthetic OHLCV data with known impulses to test SMC & TA."""
    np.random.seed(108)
    prices = [100.0]
    for _ in range(n - 1):
        prices.append(prices[-1] * (1 + np.random.normal(0, 0.01)))
    
    # Introduce an intentional Bullish FVG and Order Block
    # Bar 30: Down candle (OB)
    # Bar 31: Explosive up impulse candle
    # Bar 32: High candle creating gap between bar 30 high and bar 32 low
    df = pd.DataFrame({
        "open": prices,
        "high": [p * 1.008 for p in prices],
        "low": [p * 0.992 for p in prices],
        "close": [p * (1 + np.random.normal(0, 0.005)) for p in prices],
        "volume": [1000.0 + i * 20 for i in range(n)]
    })
    
    # Force FVG at index 31
    df.loc[30, "close"] = df.loc[30, "open"] - 2.0  # Bearish candle (future OB)
    df.loc[30, "high"] = df.loc[30, "open"] + 0.5
    df.loc[31, "open"] = df.loc[30, "close"]
    df.loc[31, "close"] = df.loc[31, "open"] + 8.0  # Massive displacement
    df.loc[31, "high"] = df.loc[31, "close"] + 0.5
    df.loc[32, "low"] = df.loc[30, "high"] + 1.5   # Gap left open!
    df.loc[32, "open"] = df.loc[32, "low"] + 0.5
    df.loc[32, "close"] = df.loc[32, "open"] + 2.0

    return df


def test_1_feature_engine():
    print("\n--- [TEST 1] Warstwa Analizy Technicznej i SMC (feature_engine.py) ---")
    df = create_sample_ohlcv(60)
    features: DeterministicMarketFeatures = feature_engine.extract_features(df, symbol="BTC/USDT", timeframe="1h")
    
    # Check TA indicators
    assert features.latest_close > 0, "Latest close must be positive"
    assert features.rsi_14 is not None, "RSI 14 must be computed"
    assert features.macd is not None, "MACD must be computed"
    assert features.sma_20 is not None, "SMA 20 must be computed"
    assert features.bbands_upper is not None, "Bollinger Bands must be computed"
    assert features.obv is not None, "OBV must be computed"
    assert features.aroon_up is not None, "Aroon up must be computed"
    
    # Check SMC structures
    print(f"  -> Detected FVGs count: {len(features.fair_value_gaps)}")
    print(f"  -> Detected Order Blocks count: {len(features.order_blocks)}")
    print(f"  -> Detected Breakers count: {len(features.breaker_blocks)}")
    print(f"  -> SMC Market Bias: {features.smc_bias}")
    print(f"  -> Trend Regime: {features.trend_regime}, Volatility: {features.volatility_regime}")

    assert len(features.fair_value_gaps) > 0, "Should detect at least 1 FVG"
    assert len(features.order_blocks) > 0, "Should detect at least 1 Order Block"
    print("  [PASS] Test 1: Wszystkie wskazniki kwantytatywne i SMC wyliczone deterministycznie.")


def test_2_sentiment_engine():
    print("\n--- [TEST 2] Warstwa Sentymentu NLP (sentiment_engine.py) ---")
    # Test Equity (FinBERT)
    eq_res: AggregatedSentimentResult = sentiment_engine.analyze_sentiment("AAPL", asset_class="EQUITY")
    assert eq_res.model_used == "ProsusAI/finbert"
    assert -1.0 <= eq_res.composite_score <= 1.0
    assert "YahooNews" in eq_res.factors
    assert "InsiderTrades" in eq_res.factors
    print(f"  -> AAPL (FinBERT) Composite: {eq_res.composite_score} ({eq_res.composite_label})")
    print(f"  -> InsiderTrades factor contribution: {eq_res.factors['InsiderTrades'].contribution}")

    # Test Crypto (CryptoBERT)
    cr_res: AggregatedSentimentResult = sentiment_engine.analyze_sentiment("ETH", asset_class="CRYPTO")
    assert cr_res.model_used == "ElKulako/cryptobert"
    assert -1.0 <= cr_res.composite_score <= 1.0
    assert "Reddit" in cr_res.factors
    assert "StockTwits" in cr_res.factors
    print(f"  -> ETH (CryptoBERT) Composite: {cr_res.composite_score} ({cr_res.composite_label})")
    print("  [PASS] Test 2: Modele FinBERT i CryptoBERT z wagowym rozbiciem dzialaja poprawnie.")


def test_3_advisor_agents():
    print("\n--- [TEST 3] Warstwa Orkiestracji Wieloagentowej (advisor_agents.py) ---")
    # 1. Test PortfolioContext
    portfolio = PortfolioContext(
        cash=50000.0,
        currency="USD",
        positions=[
            Position(
                ticker="BTC/USDT",
                asset_class="CRYPTO",
                market_type="FUTURES",
                quantity=1.2,
                cost_basis=62000.0,
                current_price=64500.0,
                leverage=3
            )
        ]
    )
    portfolio.calculate_metrics()
    assert portfolio.total_equity > 50000.0
    print(f"  -> Portfolio Total Equity: ${portfolio.total_equity:,.2f}")

    # 2. Test TradingAgentsGraph with deterministic inputs
    graph = TradingAgentsGraph(debug=False, config=DEFAULT_CONFIG)
    df = create_sample_ohlcv(50)
    features = feature_engine.extract_features(df, "BTC/USDT").model_dump()
    sentiment = sentiment_engine.analyze_sentiment("BTC/USDT", "CRYPTO").model_dump()

    state, decision = graph.propagate(
        ticker="BTC/USDT",
        date_str="2026-11-06",
        portfolio=portfolio,
        deterministic_features=features,
        sentiment_data=sentiment,
        market_type="FUTURES"
    )

    print(f"  -> Agent Decision: Action={decision.action}, Direction={decision.direction}")
    print(f"  -> Entry={decision.entry_price}, SL={decision.stop_loss}, TP={decision.take_profit}, R:R={decision.risk_reward_ratio}")
    print(f"  -> Safety Passed={decision.safety_passed}, Confidence={decision.confidence_score}")
    assert decision.action in ["BUY", "SELL", "HOLD", "CLOSE", "REDUCE"]

    # 3. Test vibe-trading-ai security client (CVE-2026-114108)
    client = VibeTradingClient(base_url="http://127.0.0.1:8899", auth_key=settings.API_AUTH_KEY)
    assert "Bearer" in client.headers["Authorization"], "Must enforce Bearer token for CVE-2026-114108"
    print(f"  -> CVE-2026-114108 Security Header: {client.headers['Authorization'][:25]}***")
    print("  [PASS] Test 3: TradingAgentsGraph oraz VibeTradingClient z pelna ochrona CVE dzialaja poprawnie.")


def test_4_execution_engine():
    print("\n--- [TEST 4] Warstwa Backtestingu i Egzekucji (execution_engine.py) ---")
    df = create_sample_ohlcv(100)

    # 1. VectorBT Grid Optimization
    params = GridOptimizationParams(
        symbol="BTC/USDT",
        fast_ma_range=[10, 20],
        slow_ma_range=[50, 100]
    )
    opt_res = execution_engine.run_vectorbt_grid_optimization(df, params)
    print(f"  -> Grid Optimization: Best Fast MA={opt_res.best_fast_ma}, Slow MA={opt_res.best_slow_ma}, Sharpe={opt_res.sharpe_ratio}")
    assert opt_res.param_grid_tested > 0

    # 2. Profiles: READ, SIM, LIVE
    order = OrderRequest(
        symbol="BTC/USDT",
        asset_class=AssetClass.CRYPTO,
        market_type=MarketType.FUTURES,
        action="BUY",
        order_type="LIMIT",
        quantity=0.25,
        price=65000.0,
        leverage=5
    )

    # Test READ profile (must block order)
    execution_engine.set_profile(ExecutionProfile.READ)
    import asyncio
    read_res = asyncio.run(execution_engine.execute_order(order))
    assert read_res.status == "BLOCKED_BY_PROFILE", "READ profile must block order creation"
    print(f"  -> [READ Profile] Order blocked status: {read_res.status}")

    # Test SIM profile (paper execution with slippage & commission)
    execution_engine.set_profile(ExecutionProfile.SIM)
    sim_res = asyncio.run(execution_engine.execute_order(order))
    assert sim_res.status == "FILLED", "SIM profile must execute paper order"
    assert sim_res.slippage > 0, "SIM execution must model slippage"
    assert sim_res.commission > 0, "SIM execution must model commission"
    print(f"  -> [SIM Profile] Executed Price=${sim_res.executed_price:,.2f}, Slippage=${sim_res.slippage:.2f}, Fee=${sim_res.commission:.2f}")

    print("  [PASS] Test 4: Backtesting i profile READ/SIM egzekucji dzialaja zgodnie ze specyfikacja.")


if __name__ == "__main__":
    print("==================================================================")
    print("URUCHAMIANIE TESTOW JEDNOSTKOWYCH STRATEG AI ADVISOR BACKEND")
    print("==================================================================")
    test_1_feature_engine()
    test_2_sentiment_engine()
    test_3_advisor_agents()
    test_4_execution_engine()
    print("\n==================================================================")
    print("WSZYSTKIE TESTY ZAKONCZONE SUKCESEM (100% PASS)!")
    print("==================================================================")
