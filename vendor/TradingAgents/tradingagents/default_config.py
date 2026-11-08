"""
TradingAgents v0.6.0 - Default Configuration Module.
"""

import os
from typing import Dict, Any

DEFAULT_CONFIG: Dict[str, Any] = {
    "project_name": "TradingAgents",
    "version": "0.6.0",
    "llm_provider": os.getenv("TRADINGAGENTS_LLM_PROVIDER", "openai"),
    "deep_think_llm": os.getenv("TRADINGAGENTS_DEEP_THINK_LLM", "gpt-4o"),
    "quick_think_llm": os.getenv("TRADINGAGENTS_QUICK_THINK_LLM", "gpt-4o-mini"),
    "max_debate_rounds": 2,
    "temperature": 0.1,  # Low temperature for strict quantitative discipline
    "risk_tolerance": "moderate",
    "allow_shorting": True,
    "max_position_size_pct": 0.15,
    "stop_loss_pct": 0.025,
    "take_profit_rr": 2.0,  # 1:2 Risk to Reward minimum
}
