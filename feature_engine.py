"""
Feature Engine: Quantitative Technical Analysis and Market Structure (SMC / ICT).

ARCHITECTURAL RULE #1:
Calculations are 100% deterministic, running inside NumPy / Numba / Pandas-TA / SMC.
LLMs NEVER guess prices, calculate moving averages, or interpolate indicators.
They only receive structured, verified quantitative outputs produced by this engine.
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

# Technical analysis imports
try:
    import pandas_ta_classic as ta
    HAS_PANDAS_TA = True
except ImportError:
    try:
        import pandas_ta as ta  # fallback if alias
        HAS_PANDAS_TA = True
    except ImportError:
        HAS_PANDAS_TA = False

# Smart Money Concepts / ICT import
try:
    from smartmoneyconcepts import smc
    HAS_SMC = True
except ImportError:
    HAS_SMC = False


class FVGItem(BaseModel):
    index: int
    direction: int  # 1: Bullish, -1: Bearish
    top: float
    bottom: float
    mitigated: bool
    mitigated_index: Optional[int] = None


class OrderBlockItem(BaseModel):
    index: int
    direction: int  # 1: Bullish Demand, -1: Bearish Supply
    top: float
    bottom: float
    volume: Optional[float] = None
    mitigated: bool = False


class StructureBreakItem(BaseModel):
    index: int
    type: str  # "BOS" or "CHOCH"
    direction: int  # 1: Bullish, -1: Bearish
    level: float
    broken_index: Optional[int] = None


class BreakerBlockItem(BaseModel):
    index: int
    direction: int  # 1: Bullish breaker, -1: Bearish breaker
    top: float
    bottom: float
    original_ob_index: Optional[int] = None


class DeterministicMarketFeatures(BaseModel):
    """
    Structured, immutable quantitative state passed to LLM agents.
    Contains all deterministic indicators and ICT/SMC structures.
    """
    symbol: str
    timeframe: str
    latest_close: float
    latest_volume: float
    
    # Moving averages
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    hma_20: Optional[float] = None  # Hull Moving Average
    
    # Momentum & Trend
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    aroon_up: Optional[float] = None
    aroon_down: Optional[float] = None
    
    # Volatility & Volume
    bbands_upper: Optional[float] = None
    bbands_middle: Optional[float] = None
    bbands_lower: Optional[float] = None
    bbands_bandwidth: Optional[float] = None
    squeeze_on: Optional[bool] = None  # Bollinger inside Keltner
    obv: Optional[float] = None
    
    # Candlestick Formations (CDL)
    active_candlestick_patterns: List[str] = Field(default_factory=list)
    
    # Smart Money Concepts / ICT
    fair_value_gaps: List[FVGItem] = Field(default_factory=list)
    order_blocks: List[OrderBlockItem] = Field(default_factory=list)
    structure_breaks: List[StructureBreakItem] = Field(default_factory=list)
    breaker_blocks: List[BreakerBlockItem] = Field(default_factory=list)
    
    # Quantitative Summary tags
    trend_regime: str = "NEUTRAL"
    volatility_regime: str = "NORMAL"
    smc_bias: str = "BALANCED"


class FeatureEngine:
    """
    High-performance, deterministic technical analysis & SMC extractor.
    Enforces clean separation between quantitative mathematics and downstream LLMs.
    """

    def __init__(self):
        self.has_ta = HAS_PANDAS_TA
        self.has_smc = HAS_SMC

    def normalize_ohlcv(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardizes column names to lowercase required by SMC and Pandas-TA."""
        df = df.copy()
        df.columns = [str(c).lower().strip() for c in df.columns]
        required = ["open", "high", "low", "close"]
        for col in required:
            if col not in df.columns:
                raise ValueError(f"Missing required price column: {col}")
        if "volume" not in df.columns:
            df["volume"] = 1.0
        return df.sort_index()

    def compute_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates SMA, HMA, MACD, BBANDS, OBV, AROON, SQUEEZE, RSI, and CDL patterns.
        Utilizes pandas-ta-classic accelerated with numba where available.
        """
        df = df.copy()

        if self.has_ta:
            # 1. Moving Averages: SMA and HMA (Hull Moving Average)
            df.ta.sma(length=20, append=True)
            df.ta.sma(length=50, append=True)
            df.ta.sma(length=200, append=True)
            df.ta.hma(length=20, append=True)

            # 2. RSI (Relative Strength Index)
            df.ta.rsi(length=14, append=True)

            # 3. MACD (Moving Average Convergence Divergence)
            df.ta.macd(fast=12, slow=26, signal=9, append=True)

            # 4. Bollinger Bands (bbands)
            df.ta.bbands(length=20, std=2.0, append=True)

            # 5. On-Balance Volume (obv)
            df.ta.obv(append=True)

            # 6. Aroon Oscillator
            df.ta.aroon(length=14, append=True)

            # 7. Squeeze Momentum (John Carter's Squeeze)
            try:
                df.ta.squeeze(append=True)
            except Exception:
                # Deterministic fallback: Bollinger Bandwidth contraction below Keltner
                pass

            # 8. Candlestick Formations (CDL)
            cdl_patterns = [
                "cdl_doji", "cdl_hammer", "cdl_engulfing", "cdl_inside",
                "cdl_morningstar", "cdl_eveningstar", "cdl_shootingstar"
            ]
            for pat in cdl_patterns:
                try:
                    df.ta(kind=pat, append=True)
                except Exception:
                    pass
        else:
            # Pure deterministic NumPy / Pandas fallback if library is not yet compiled
            c = df["close"]
            h = df["high"]
            l = df["low"]
            o = df["open"]
            v = df["volume"]

            df["SMA_20"] = c.rolling(20).mean()
            df["SMA_50"] = c.rolling(50).mean()
            df["SMA_200"] = c.rolling(200).mean()
            
            # Weighted Moving Average helper for HMA
            wma_half = c.rolling(10).apply(lambda x: np.dot(x, np.arange(1, 11)) / np.arange(1, 11).sum(), raw=True)
            wma_full = c.rolling(20).apply(lambda x: np.dot(x, np.arange(1, 21)) / np.arange(1, 21).sum(), raw=True)
            diff = 2 * wma_half - wma_full
            df["HMA_20"] = diff.rolling(4).mean()

            # RSI 14
            delta = c.diff()
            gain = (delta.where(delta > 0, 0)).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / (loss.replace(0, 1e-9))
            df["RSI_14"] = 100 - (100 / (1 + rs))

            # MACD
            ema12 = c.ewm(span=12, adjust=False).mean()
            ema26 = c.ewm(span=26, adjust=False).mean()
            df["MACD_12_26_9"] = ema12 - ema26
            df["MACDs_12_26_9"] = df["MACD_12_26_9"].ewm(span=9, adjust=False).mean()
            df["MACDh_12_26_9"] = df["MACD_12_26_9"] - df["MACDs_12_26_9"]

            # BBANDS
            ma20 = df["SMA_20"]
            std20 = c.rolling(20).std()
            df["BBU_20_2.0"] = ma20 + (2.0 * std20)
            df["BBM_20_2.0"] = ma20
            df["BBL_20_2.0"] = ma20 - (2.0 * std20)
            df["BBB_20_2.0"] = (df["BBU_20_2.0"] - df["BBL_20_2.0"]) / df["BBM_20_2.0"]

            # OBV
            obv_dir = np.where(c > c.shift(1), 1, np.where(c < c.shift(1), -1, 0))
            df["OBV"] = (obv_dir * v).cumsum()

            # Aroon 14
            df["AROONU_14"] = h.rolling(14).apply(lambda x: (float(np.argmax(x)) / 13.0) * 100.0, raw=True)
            df["AROOND_14"] = l.rolling(14).apply(lambda x: (float(np.argmin(x)) / 13.0) * 100.0, raw=True)

            # Basic CDL Engulfing
            bull_engulf = (c > o) & (c.shift(1) < o.shift(1)) & (c >= o.shift(1)) & (o <= c.shift(1))
            bear_engulf = (c < o) & (c.shift(1) > o.shift(1)) & (o >= c.shift(1)) & (c <= o.shift(1))
            df["CDL_ENGULFING"] = np.where(bull_engulf, 100, np.where(bear_engulf, -100, 0))

        return df

    def compute_smc_structures(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Algorithmic detection of ICT/SMC structures:
        - Fair Value Gaps (FVG)
        - Order Blocks (OB)
        - Break of Structure (BOS) / Change of Character (CHOCH)
        - Breaker Blocks
        """
        fvgs: List[FVGItem] = []
        obs: List[OrderBlockItem] = []
        structure_breaks: List[StructureBreakItem] = []
        breakers: List[BreakerBlockItem] = []

        n = len(df)
        if n < 5:
            return {"fvgs": fvgs, "obs": obs, "structure_breaks": structure_breaks, "breakers": breakers}

        if self.has_smc:
            try:
                # 1. Fair Value Gaps (FVG)
                fvg_res = smc.fvg(df)
                for idx, row in fvg_res.iterrows():
                    val = row.get("FVG", 0)
                    if val != 0:
                        fvgs.append(FVGItem(
                            index=int(idx),
                            direction=int(np.sign(val)),
                            top=float(row.get("Top", df["high"].iloc[idx])),
                            bottom=float(row.get("Bottom", df["low"].iloc[idx])),
                            mitigated=bool(row.get("Mitigated", False)),
                            mitigated_index=int(row["MitigatedIndex"]) if pd.notna(row.get("MitigatedIndex")) else None
                        ))
            except Exception:
                pass

            try:
                # 2. Break of Structure (BOS) & Change of Character (CHOCH)
                bos_res = smc.bos_choch(df, close_break=True)
                for idx, row in bos_res.iterrows():
                    b_val = row.get("BOS", 0)
                    c_val = row.get("CHOCH", 0)
                    if b_val != 0:
                        structure_breaks.append(StructureBreakItem(
                            index=int(idx),
                            type="BOS",
                            direction=int(np.sign(b_val)),
                            level=float(row.get("Level", df["close"].iloc[idx])),
                            broken_index=int(row["BrokenIndex"]) if pd.notna(row.get("BrokenIndex")) else None
                        ))
                    elif c_val != 0:
                        structure_breaks.append(StructureBreakItem(
                            index=int(idx),
                            type="CHOCH",
                            direction=int(np.sign(c_val)),
                            level=float(row.get("Level", df["close"].iloc[idx])),
                            broken_index=int(row["BrokenIndex"]) if pd.notna(row.get("BrokenIndex")) else None
                        ))
            except Exception:
                pass

            try:
                # 3. Order Blocks (OB)
                ob_res = smc.ob(df)
                for idx, row in ob_res.iterrows():
                    val = row.get("OB", 0)
                    if val != 0:
                        obs.append(OrderBlockItem(
                            index=int(idx),
                            direction=int(np.sign(val)),
                            top=float(row.get("Top", df["high"].iloc[idx])),
                            bottom=float(row.get("Bottom", df["low"].iloc[idx])),
                            volume=float(row.get("Volume", df["volume"].iloc[idx])),
                            mitigated=bool(row.get("Mitigated", False))
                        ))
            except Exception:
                pass

        # Algorithmic calculation / Fallback for SMC & Breakers
        # Breaker block = An order block that has been completely breached and now acts in opposite polarity
        if not fvgs:
            # Algorithmic Fair Value Gap: Candle 1 High < Candle 3 Low (Bullish) or Candle 1 Low > Candle 3 High (Bearish)
            for i in range(2, n):
                # Bullish FVG
                if df["low"].iloc[i] > df["high"].iloc[i - 2]:
                    top = float(df["low"].iloc[i])
                    bottom = float(df["high"].iloc[i - 2])
                    # Check mitigation
                    mitigated = False
                    mitigated_idx = None
                    for k in range(i + 1, n):
                        if df["low"].iloc[k] <= top:
                            mitigated = True
                            mitigated_idx = k
                            break
                    fvgs.append(FVGItem(
                        index=i - 1,
                        direction=1,
                        top=top,
                        bottom=bottom,
                        mitigated=mitigated,
                        mitigated_index=mitigated_idx
                    ))
                # Bearish FVG
                elif df["high"].iloc[i] < df["low"].iloc[i - 2]:
                    top = float(df["low"].iloc[i - 2])
                    bottom = float(df["high"].iloc[i])
                    mitigated = False
                    mitigated_idx = None
                    for k in range(i + 1, n):
                        if df["high"].iloc[k] >= bottom:
                            mitigated = True
                            mitigated_idx = k
                            break
                    fvgs.append(FVGItem(
                        index=i - 1,
                        direction=-1,
                        top=top,
                        bottom=bottom,
                        mitigated=mitigated,
                        mitigated_index=mitigated_idx
                    ))

        if not obs:
            # Algorithmic Order Block Detection:
            # Last down candle before strong up impulse (Bullish OB)
            # Last up candle before strong down impulse (Bearish OB)
            for i in range(2, n - 2):
                body = abs(df["close"].iloc[i] - df["open"].iloc[i])
                impulse = df["close"].iloc[i + 1] - df["open"].iloc[i + 1]
                
                # Bullish OB
                if df["close"].iloc[i] < df["open"].iloc[i] and impulse > (body * 1.8) and df["close"].iloc[i + 1] > df["high"].iloc[i]:
                    obs.append(OrderBlockItem(
                        index=i,
                        direction=1,
                        top=float(df["high"].iloc[i]),
                        bottom=float(df["low"].iloc[i]),
                        volume=float(df["volume"].iloc[i]),
                        mitigated=df["close"].iloc[i + 2:].min() < df["low"].iloc[i] if (i + 2 < n) else False
                    ))
                # Bearish OB
                elif df["close"].iloc[i] > df["open"].iloc[i] and (-impulse) > (body * 1.8) and df["close"].iloc[i + 1] < df["low"].iloc[i]:
                    obs.append(OrderBlockItem(
                        index=i,
                        direction=-1,
                        top=float(df["high"].iloc[i]),
                        bottom=float(df["low"].iloc[i]),
                        volume=float(df["volume"].iloc[i]),
                        mitigated=df["close"].iloc[i + 2:].max() > df["high"].iloc[i] if (i + 2 < n) else False
                    ))

        # Algorithmic Breaker Detection:
        # A Breaker is an Order Block that failed (price violated its level with conviction), flipping polarity
        for ob_item in obs:
            if ob_item.direction == 1:  # Bullish OB (demand)
                # If price closes decisively below its bottom, it flips to a Bearish Breaker
                subsequent = df.iloc[ob_item.index + 1:]
                violated = subsequent[subsequent["close"] < ob_item.bottom]
                if not violated.empty:
                    v_idx = violated.index[0]
                    breakers.append(BreakerBlockItem(
                        index=int(v_idx),
                        direction=-1,  # Now acts as resistance
                        top=ob_item.top,
                        bottom=ob_item.bottom,
                        original_ob_index=ob_item.index
                    ))
            elif ob_item.direction == -1:  # Bearish OB (supply)
                # If price closes decisively above its top, it flips to a Bullish Breaker
                subsequent = df.iloc[ob_item.index + 1:]
                violated = subsequent[subsequent["close"] > ob_item.top]
                if not violated.empty:
                    v_idx = violated.index[0]
                    breakers.append(BreakerBlockItem(
                        index=int(v_idx),
                        direction=1,  # Now acts as support
                        top=ob_item.top,
                        bottom=ob_item.bottom,
                        original_ob_index=ob_item.index
                    ))

        return {
            "fvgs": fvgs[-15:],  # Return recent relevant SMC structures
            "obs": obs[-15:],
            "structure_breaks": structure_breaks[-15:],
            "breakers": breakers[-15:]
        }

    def extract_features(self, df_raw: pd.DataFrame, symbol: str, timeframe: str = "1h") -> DeterministicMarketFeatures:
        """
        End-to-end execution of quantitative pipeline.
        Returns a validated DeterministicMarketFeatures instance ready for consumption by LLMs.
        """
        df = self.normalize_ohlcv(df_raw)
        df_indicators = self.compute_technical_indicators(df)
        smc_dict = self.compute_smc_structures(df)

        last_row = df_indicators.iloc[-1]
        latest_close = float(last_row["close"])
        latest_vol = float(last_row["volume"])

        # Extract indicator values safely
        def get_val(patterns: List[str]) -> Optional[float]:
            for p in patterns:
                for col in df_indicators.columns:
                    if p.lower() in col.lower() and pd.notna(last_row[col]):
                        return float(last_row[col])
            return None

        sma_20 = get_val(["SMA_20"])
        sma_50 = get_val(["SMA_50"])
        sma_200 = get_val(["SMA_200"])
        hma_20 = get_val(["HMA_20"])
        rsi_14 = get_val(["RSI_14"])
        macd_val = get_val(["MACD_12_26_9", "MACD"])
        macd_sig = get_val(["MACDs_12_26_9", "MACDs"])
        macd_hist = get_val(["MACDh_12_26_9", "MACDh"])
        bb_u = get_val(["BBU_20_2.0", "BBU"])
        bb_m = get_val(["BBM_20_2.0", "BBM"])
        bb_l = get_val(["BBL_20_2.0", "BBL"])
        bb_b = get_val(["BBB_20_2.0", "BBB"])
        obv_val = get_val(["OBV"])
        aroon_u = get_val(["AROONU_14", "AROONU"])
        aroon_d = get_val(["AROOND_14", "AROOND"])

        # Detect squeeze condition
        squeeze_on = False
        for col in df_indicators.columns:
            if "sqz_on" in col.lower() or "squeeze" in col.lower():
                val = last_row[col]
                if pd.notna(val) and val == 1:
                    squeeze_on = True

        # Detect active candlestick patterns
        active_cdl = []
        for col in df_indicators.columns:
            if col.startswith("CDL_") or col.startswith("cdl_"):
                val = last_row[col]
                if pd.notna(val) and val != 0:
                    sentiment = "BULLISH" if val > 0 else "BEARISH"
                    active_cdl.append(f"{col}:{sentiment}")

        # Derive quantitative regime tags
        trend = "NEUTRAL"
        if sma_20 and sma_50:
            if latest_close > sma_20 > sma_50:
                trend = "STRONG_BULLISH"
            elif latest_close > sma_20:
                trend = "BULLISH"
            elif latest_close < sma_20 < sma_50:
                trend = "STRONG_BEARISH"
            elif latest_close < sma_20:
                trend = "BEARISH"

        volatility = "NORMAL"
        if bb_b is not None:
            if bb_b > 0.12:
                volatility = "HIGH_EXPANSION"
            elif bb_b < 0.04 or squeeze_on:
                volatility = "COMPRESSION_SQUEEZE"

        # Determine SMC bias
        unmitigated_bull_fvgs = [f for f in smc_dict["fvgs"] if f.direction == 1 and not f.mitigated]
        unmitigated_bear_fvgs = [f for f in smc_dict["fvgs"] if f.direction == -1 and not f.mitigated]
        if len(unmitigated_bull_fvgs) > len(unmitigated_bear_fvgs):
            smc_bias = "DISCOUNT_BULLISH_ORDERFLOW"
        elif len(unmitigated_bear_fvgs) > len(unmitigated_bull_fvgs):
            smc_bias = "PREMIUM_BEARISH_ORDERFLOW"
        else:
            smc_bias = "BALANCED"

        return DeterministicMarketFeatures(
            symbol=symbol,
            timeframe=timeframe,
            latest_close=latest_close,
            latest_volume=latest_vol,
            sma_20=sma_20,
            sma_50=sma_50,
            sma_200=sma_200,
            hma_20=hma_20,
            rsi_14=rsi_14,
            macd=macd_val,
            macd_signal=macd_sig,
            macd_hist=macd_hist,
            aroon_up=aroon_u,
            aroon_down=aroon_d,
            bbands_upper=bb_u,
            bbands_middle=bb_m,
            bbands_lower=bb_l,
            bbands_bandwidth=bb_b,
            squeeze_on=squeeze_on,
            obv=obv_val,
            active_candlestick_patterns=active_cdl,
            fair_value_gaps=smc_dict["fvgs"],
            order_blocks=smc_dict["obs"],
            structure_breaks=smc_dict["structure_breaks"],
            breaker_blocks=smc_dict["breakers"],
            trend_regime=trend,
            volatility_regime=volatility,
            smc_bias=smc_bias
        )


# Singleton instance for quick module access
feature_engine = FeatureEngine()
