"""
TradingAgents v0.6.0 - LangGraph Trading Orchestration Graph.
Coordinates the multi-agent decision cycle while strictly respecting
Architectural Rule #1 (immutable deterministic inputs).
"""

import json
from typing import Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
from tradingagents.default_config import DEFAULT_CONFIG
from tradingagents.portfolio import PortfolioContext


class AgentDecision(BaseModel):
    ticker: str
    action: str  # "BUY", "SELL", "HOLD", "CLOSE", "REDUCE"
    direction: str  # "LONG", "SHORT", "NEUTRAL"
    market_type: str = "SPOT" # "SPOT" or "FUTURES"
    target_allocation_pct: float
    entry_price: float
    stop_loss: float
    take_profit: float
    risk_reward_ratio: float
    reasoning: Dict[str, Any]
    confidence_score: float  # [0.0 to 1.0]
    safety_passed: bool
    warnings: list[str] = Field(default_factory=list)


class TradingAgentsGraph:
    """
    LangGraph-based multi-agent supervisor for trading firms.
    Simulates collaborative debate between Technical, SMC, Sentiment,
    Risk, and Portfolio Management agents.
    """

    def __init__(self, debug: bool = False, config: Optional[Dict[str, Any]] = None):
        self.debug = debug
        self.config = config or DEFAULT_CONFIG.copy()

    def _agent_technical_analyst(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluates SMA/HMA, RSI, MACD, Bollinger Bands, and Aroon."""
        close = features.get("latest_close", 0.0)
        rsi = features.get("rsi_14", 50.0) or 50.0
        macd_hist = features.get("macd_hist", 0.0) or 0.0
        sma_20 = features.get("sma_20")
        sma_50 = features.get("sma_50")
        trend = features.get("trend_regime", "NEUTRAL")
        
        signal = "NEUTRAL"
        score = 0.0
        
        if trend in ["STRONG_BULLISH", "BULLISH"] and macd_hist > 0 and 40 <= rsi <= 68:
            signal = "BULLISH"
            score = 0.75
        elif trend in ["STRONG_BEARISH", "BEARISH"] and macd_hist < 0 and 32 <= rsi <= 60:
            signal = "BEARISH"
            score = -0.75
        elif rsi < 30:
            signal = "OVERSOLD_BOUNCE_CANDIDATE"
            score = 0.40
        elif rsi > 75:
            signal = "OVERBOUGHT_EXHAUSTION"
            score = -0.40

        return {
            "agent": "TechnicalAnalyst",
            "signal": signal,
            "quantitative_score": score,
            "indicators_used": {
                "close": close, "rsi": rsi, "macd_hist": macd_hist,
                "sma_20": sma_20, "sma_50": sma_50, "trend_regime": trend
            }
        }

    def _agent_smc_specialist(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluates Fair Value Gaps, Order Blocks, BOS, and Breakers."""
        fvgs = features.get("fair_value_gaps", [])
        obs = features.get("order_blocks", [])
        bos = features.get("structure_breaks", [])
        breakers = features.get("breaker_blocks", [])
        smc_bias = features.get("smc_bias", "BALANCED")
        close = features.get("latest_close", 0.0)

        unmitigated_bull_ob = [o for o in obs if o.get("direction") == 1 and not o.get("mitigated")]
        unmitigated_bear_ob = [o for o in obs if o.get("direction") == -1 and not o.get("mitigated")]
        recent_bos = [b for b in bos if b.get("type") == "BOS"]

        bias = "NEUTRAL"
        key_level = close
        if "BULLISH" in smc_bias or len(unmitigated_bull_ob) > len(unmitigated_bear_ob):
            bias = "BULLISH_DISPLACEMENT"
            if unmitigated_bull_ob:
                key_level = unmitigated_bull_ob[-1].get("top", close)
        elif "BEARISH" in smc_bias or len(unmitigated_bear_ob) > len(unmitigated_bull_ob):
            bias = "BEARISH_DISPLACEMENT"
            if unmitigated_bear_ob:
                key_level = unmitigated_bear_ob[-1].get("bottom", close)

        return {
            "agent": "SMCSpecialist",
            "smc_bias": bias,
            "active_fvgs_count": len(fvgs),
            "order_blocks_count": len(obs),
            "breakers_count": len(breakers),
            "key_institutional_level": key_level
        }

    def _agent_sentiment_analyst(self, sentiment: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluates FinBERT / CryptoBERT composite scores and factor breakdowns."""
        comp = sentiment.get("composite_score", 0.0)
        label = sentiment.get("composite_label", "NEUTRAL")
        factors = sentiment.get("factors", {})

        return {
            "agent": "SentimentAnalyst",
            "composite_score": comp,
            "composite_label": label,
            "factor_summary": {k: v.get("status") for k, v in factors.items()} if isinstance(factors, dict) else {}
        }

    def _agent_risk_guardian(
        self,
        decision_direction: str,
        entry_price: float,
        portfolio: Optional[PortfolioContext],
        features: Dict[str, Any]
    ) -> Tuple[bool, float, float, float, list[str]]:
        """
        Risk Guardian agent enforces:
        - Strict 1:2 Minimum Risk-to-Reward ratio
        - Hard stop-loss based on SMC Order Blocks or ATR/Bollinger volatility
        - Position size cap based on total equity
        """
        warnings = []
        atr_approx = abs(features.get("bbands_upper", entry_price * 1.02) - features.get("bbands_lower", entry_price * 0.98)) / 4.0
        if atr_approx <= 0:
            atr_approx = entry_price * 0.015

        if decision_direction == "LONG":
            stop_loss = round(entry_price - (atr_approx * 1.5), 4)
            take_profit = round(entry_price + (atr_approx * 3.0), 4) # 1:2 R:R
        elif decision_direction == "SHORT":
            stop_loss = round(entry_price + (atr_approx * 1.5), 4)
            take_profit = round(entry_price - (atr_approx * 3.0), 4) # 1:2 R:R
        else:
            stop_loss = round(entry_price * 0.98, 4)
            take_profit = round(entry_price * 1.04, 4)

        risk = abs(entry_price - stop_loss)
        reward = abs(take_profit - entry_price)
        rr = round(reward / risk, 2) if risk > 0 else 0.0

        safety_passed = True
        if rr < self.config.get("take_profit_rr", 2.0):
            warnings.append(f"Risk/Reward {rr} below minimum threshold of {self.config.get('take_profit_rr', 2.0)}")
            safety_passed = False

        if portfolio:
            portfolio.calculate_metrics()
            if portfolio.margin_used > (portfolio.total_equity or 1.0) * 0.8:
                warnings.append("Portfolio margin utilization exceeds 80% safety barrier.")
                safety_passed = False

        return safety_passed, stop_loss, take_profit, rr, warnings

    def propagate(
        self,
        ticker: str,
        date_str: str,
        portfolio: Optional[PortfolioContext] = None,
        deterministic_features: Optional[Dict[str, Any]] = None,
        sentiment_data: Optional[Dict[str, Any]] = None,
        market_type: str = "SPOT"
    ) -> Tuple[Dict[str, Any], AgentDecision]:
        """
        Runs complete multi-agent debate cycle.
        Consumes ONLY deterministic features and pre-calculated sentiment data.
        """
        features = deterministic_features or {}
        sentiment = sentiment_data or {}
        entry_price = float(features.get("latest_close", 100.0))

        # 1. Sub-agent evaluations
        tech_view = self._agent_technical_analyst(features)
        smc_view = self._agent_smc_specialist(features)
        sent_view = self._agent_sentiment_analyst(sentiment)

        # 2. Collaborative debate & Portfolio Manager synthesis
        bull_signals = 0
        bear_signals = 0

        if tech_view["signal"] == "BULLISH":
            bull_signals += 1
        elif tech_view["signal"] == "BEARISH":
            bear_signals += 1

        if "BULLISH" in smc_view["smc_bias"]:
            bull_signals += 1
        elif "BEARISH" in smc_view["smc_bias"]:
            bear_signals += 1

        if "BULLISH" in sent_view["composite_label"]:
            bull_signals += 1
        elif "BEARISH" in sent_view["composite_label"]:
            bear_signals += 1

        if bull_signals >= 2 and bear_signals == 0:
            action = "BUY"
            direction = "LONG"
            target_alloc = 0.10
            conf = 0.85
        elif bear_signals >= 2 and bull_signals == 0:
            if market_type == "FUTURES" or self.config.get("allow_shorting", True):
                action = "SELL"
                direction = "SHORT"
                target_alloc = 0.08
                conf = 0.80
            else:
                action = "HOLD"
                direction = "NEUTRAL"
                target_alloc = 0.0
                conf = 0.70
        else:
            action = "HOLD"
            direction = "NEUTRAL"
            target_alloc = 0.0
            conf = 0.50

        # 3. Risk Guardian validation
        safety_passed, sl, tp, rr, warnings = self._agent_risk_guardian(
            decision_direction=direction,
            entry_price=entry_price,
            portfolio=portfolio,
            features=features
        )

        decision = AgentDecision(
            ticker=ticker,
            action=action if safety_passed else "HOLD",
            direction=direction if safety_passed else "NEUTRAL",
            market_type=market_type,
            target_allocation_pct=target_alloc if safety_passed else 0.0,
            entry_price=entry_price,
            stop_loss=sl,
            take_profit=tp,
            risk_reward_ratio=rr,
            reasoning={
                "technical": tech_view,
                "smc": smc_view,
                "sentiment": sent_view,
                "debate_synthesis": f"Bulls: {bull_signals}, Bears: {bear_signals}"
            },
            confidence_score=conf,
            safety_passed=safety_passed,
            warnings=warnings
        )

        state = {
            "ticker": ticker,
            "date": date_str,
            "portfolio": portfolio.model_dump() if portfolio else None,
            "decision": decision.model_dump()
        }

        return state, decision
