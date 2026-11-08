"""
Configuration module for Strateg AI Investment Advisor Backend.
Handles environment variables, security safeguards (CVE-2026-114108 remediation),
execution profiles (Read, Sim, Live), and broker/LLM parameters.
"""

import os
from enum import Enum
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ExecutionProfile(str, Enum):
    READ = "READ"  # Read-only: market data, balances, no order placement
    SIM = "SIM"    # Paper trading / simulation with slippage and fee models
    LIVE = "LIVE"  # Real execution on exchanges / brokers with safety locks


class MarketType(str, Enum):
    SPOT = "SPOT"
    FUTURES = "FUTURES"


class AssetClass(str, Enum):
    CRYPTO = "CRYPTO"
    EQUITY = "EQUITY"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application settings
    APP_NAME: str = "Strateg AI Investment Advisor Backend"
    APP_VERSION: str = "1.0.8"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Profile: READ, SIM, LIVE
    EXECUTION_PROFILE: ExecutionProfile = ExecutionProfile.SIM

    # Security: CVE-2026-114108 Remediation
    # vibe-trading-ai prior to 0.1.7 left endpoints open if unset.
    # We require and enforce a strong API_AUTH_KEY.
    API_AUTH_KEY: str = Field(
        default_factory=lambda: os.getenv(
            "API_AUTH_KEY", "vt_sec_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e"
        )
    )
    VIBE_TRADING_BASE_URL: str = "http://127.0.0.1:8899"
    VIBE_TRADING_PORT: int = 8899

    # Multi-Agent LangGraph (TradingAgents v0.6.0)
    TRADINGAGENTS_LLM_PROVIDER: str = "openai"
    TRADINGAGENTS_DEEP_THINK_LLM: str = "gpt-4o"
    TRADINGAGENTS_QUICK_THINK_LLM: str = "gpt-4o-mini"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    # HuggingFace / Transformers models
    FINBERT_MODEL_NAME: str = "ProsusAI/finbert"
    CRYPTOBERT_MODEL_NAME: str = "ElKulako/cryptobert"
    USE_GPU_FOR_NLP: bool = False

    # CCXT Settings (Crypto Spot & Futures)
    CCXT_EXCHANGE_ID: str = "binance"
    CCXT_API_KEY: Optional[str] = None
    CCXT_API_SECRET: Optional[str] = None
    CCXT_SANDBOX_MODE: bool = True
    CCXT_DEFAULT_LEVERAGE: int = 3

    # Interactive Brokers (ib_async & ibkr-httpapi)
    IBKR_HOST: str = "127.0.0.1"
    IBKR_PORT: int = 7497  # TWS paper default: 7497, live: 7496, Gateway paper: 4002
    IBKR_CLIENT_ID: int = 108
    IBKR_ACCOUNT_ID: Optional[str] = "DU123456"
    IBKR_HTTPAPI_URL: str = "https://localhost:5000/v1/api"
    IBKR_SSL_VERIFY: bool = False


settings = Settings()
