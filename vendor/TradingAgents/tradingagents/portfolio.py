"""
TradingAgents v0.6.0 - Portfolio Context Module.
Maintains user book, cash, active positions, and portfolio constraints.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class Position(BaseModel):
    ticker: str
    asset_class: str = "CRYPTO"  # "CRYPTO" or "EQUITY"
    market_type: str = "SPOT"    # "SPOT" or "FUTURES"
    quantity: float
    cost_basis: float
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    leverage: int = 1
    liquidation_price: Optional[float] = None


class PortfolioContext(BaseModel):
    cash: float = 100000.0
    currency: str = "USD"
    total_equity: Optional[float] = None
    margin_used: float = 0.0
    positions: List[Position] = Field(default_factory=list)
    risk_limit_per_trade_pct: float = 0.02  # Maximum 2% risk of total portfolio per trade
    max_portfolio_leverage: float = 3.0

    def calculate_metrics(self) -> "PortfolioContext":
        """Deterministic calculation of portfolio balance and margin utilization."""
        pos_value = sum(p.quantity * (p.current_price or p.cost_basis) for p in self.positions)
        self.total_equity = self.cash + pos_value
        return self
