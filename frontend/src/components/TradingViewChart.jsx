import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers
} from 'lightweight-charts';

export default function TradingViewChart({
  symbol = 'BTC/USDT',
  timeframe = '1d',
  setTimeframe,
  candles = [],
  features = null,
  advice = null,
  activeExchange = 'Binance',
  onFetchAllHistory,
  isMaxHistory = false,
  isPriceRefresh1s = false,
  onTogglePriceRefresh1s,
  marketType = 'FUTURES',
  onMarketTypeChange,
  onOpenOrderHistory,
  onOpenFuturesTerminal,
  onClose
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  const indicatorSeriesRef = useRef({});
  const priceLinesRef = useRef([]);

  const [hoverData, setHoverData] = useState(null);
  const [priceY, setPriceY] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const candleMapRef = useRef(new Map());

  const hasInitialFitRef = useRef(false);
  const timeframeContainerRef = useRef(null);

  // Scroll timeframe bar maximally to the right on load
  useEffect(() => {
    const scrollToRight = () => {
      if (timeframeContainerRef.current) {
        timeframeContainerRef.current.scrollLeft = timeframeContainerRef.current.scrollWidth;
      }
    };
    scrollToRight();
    const t1 = setTimeout(scrollToRight, 60);
    const t2 = setTimeout(scrollToRight, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Strategy Layers toggles - domyślnie wykres odpala się czysty bez wskaźników
  const [activeLayers, setActiveLayers] = useState({
    // Moduł 1: Średnie Kroczące & Trend
    sma20: false,
    sma50: false,
    sma200: false,
    hma20: false,

    // Moduł 2: Zmienność & Pasma
    bbands: false,
    squeeze: false,
    volume: false,

    // Moduł 3: Smart Money Concepts (SMC / ICT)
    fvg: false,
    orderBlocks: false,
    bos: false,
    breakers: false,

    // Moduł 4: Egzekucja & Poziomy TradingAgents
    entryLevel: false,
    stopLoss: false,
    takeProfit: false,
    cdlMarkers: false
  });

  const toggleLayer = (key) => {
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (enable) => {
    setActiveLayers((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => { next[k] = enable; });
      return next;
    });
  };

  // Format candles with ascending epoch timestamps
  const formattedCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    
    const now = Math.floor(Date.now() / 1000);
    const tfSteps = {
      '15s': 15,
      '30s': 30,
      '1m': 60,
      '3m': 180,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '2h': 7200,
      '4h': 14400,
      '8h': 28800,
      '1d': 86400,
      '1W': 604800,
      '1M': 2592000,
      '3M': 7776000,
      '6M': 15552000,
      '1Y': 31536000
    };
    const step = tfSteps[timeframe] || 3600;

    return candles.map((c, i) => {
      let t;
      if (typeof c.timestamp === 'number') {
        t = c.timestamp;
      } else if (c.timestamp && !isNaN(Number(c.timestamp))) {
        t = Number(c.timestamp);
      } else if (c.timestamp && !isNaN(Date.parse(c.timestamp))) {
        t = Math.floor(Date.parse(c.timestamp) / 1000);
      } else {
        t = now - (candles.length - i) * step;
      }

      return {
        time: t,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 100),
        buy_volume: Number(c.buy_volume || 0),
        sell_volume: Number(c.sell_volume || 0)
      };
    }).sort((a, b) => a.time - b.time);
  }, [candles, timeframe]);

  // Current live asset price
  const latestPrice = useMemo(() => {
    if (formattedCandles.length > 0) {
      return formattedCandles[formattedCandles.length - 1].close;
    }
    return features?.latest_close || 67800.0;
  }, [formattedCandles, features]);



  const priceChange = useMemo(() => {
    if (formattedCandles.length >= 2) {
      const first = formattedCandles[0].open;
      const last = formattedCandles[formattedCandles.length - 1].close;
      const diff = last - first;
      const pct = (diff / first) * 100;
      return { diff, pct, first, last, count: formattedCandles.length };
    }
    return { diff: 0, pct: 0, first: 0, last: 0, count: 0 };
  }, [formattedCandles]);

  const candleChange = useMemo(() => {
    if (formattedCandles.length > 0) {
      const lastCandle = formattedCandles[formattedCandles.length - 1];
      const diff = lastCandle.close - lastCandle.open;
      const pct = lastCandle.open ? (diff / lastCandle.open) * 100 : 0;
      return { diff, pct, open: lastCandle.open, close: lastCandle.close };
    }
    return { diff: 0, pct: 0, open: 0, close: 0 };
  }, [formattedCandles]);

  useEffect(() => {
    const map = new Map();
    formattedCandles.forEach((c) => {
      map.set(c.time, c);
    });
    candleMapRef.current = map;
  }, [formattedCandles]);

  // =========================================================================
  // Initialize Chart without any obscuring tooltips or popup titles
  // =========================================================================
  useEffect(() => {
    if (!chartContainerRef.current) return;
    hasInitialFitRef.current = false;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 550;

    const chart = createChart(container, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { type: 'solid', color: '#020617' },
        textColor: '#94a3b8',
        fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: 11
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)', style: 1 },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)', style: 1 }
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#38bdf8', width: 1, style: 3, labelBackgroundColor: '#0284c7' },
        horzLine: { color: '#38bdf8', width: 1, style: 3, labelBackgroundColor: '#0284c7' }
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 14,
        barSpacing: isMaxHistory ? 5 : 10,
        minBarSpacing: 2
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
        scaleMargins: { top: 0.08, bottom: 0.18 },
        alignLabels: true
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        mouseWheel: true,
        pinch: true
      }
    });

    chartInstanceRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: symbol.includes('BTC') ? 2 : 4,
        minMove: symbol.includes('BTC') ? 0.1 : 0.0001
      }
    });
    if (formattedCandles.length > 0) {
      candleSeries.setData(formattedCandles);
    }
    candleSeriesRef.current = candleSeries;

    // 2. Volume Series
    const volumeData = formattedCandles.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)'
    }));

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#38bdf8',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale'
    });

    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 }
    });

    if (formattedCandles.length > 0) {
      volumeSeries.setData(volumeData);
    }
    volumeSeriesRef.current = volumeSeries;

    // Synchronizacja pozycji ceny na osi Y
    const updatePriceCoordinate = () => {
      if (candleSeries && latestPrice) {
        const y = candleSeries.priceToCoordinate(latestPrice);
        if (y !== null && !isNaN(y) && y >= 0) {
          setPriceY(y);
        }
      }
    };

    chart.timeScale().subscribeVisibleTimeRangeChange(updatePriceCoordinate);
    setTimeout(updatePriceCoordinate, 80);

    // Crosshair hover synchronization (szczegółowe dane świecy: OHLC, zakres, zmiana body, wolumeny oraz dokładna cena kursora)
    chart.subscribeCrosshairMove((param) => {
      updatePriceCoordinate();
      if (!param || !param.point) {
        setHoverData(null);
        return;
      }

      let cursorPrice = null;
      if (typeof candleSeries.coordinateToPrice === 'function' && param.point.y !== undefined) {
        cursorPrice = candleSeries.coordinateToPrice(param.point.y);
      }

      if (!param.time || !param.seriesData) {
        if (cursorPrice !== null) {
          setHoverData({
            point: param.point,
            cursorPrice: Number(cursorPrice)
          });
        } else {
          setHoverData(null);
        }
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (data) {
        const cFound = candleMapRef.current.get(param.time) || data;
        const rangeNum = Number(data.high) - Number(data.low);
        const rangePct = Number(data.low) > 0 ? (rangeNum / Number(data.low)) * 100 : 0;
        const bodyNum = Number(data.close) - Number(data.open);
        const bodyPct = Number(data.open) > 0 ? (bodyNum / Number(data.open)) * 100 : 0;
        const vol = Number(cFound.volume || param.seriesData.get(volumeSeries)?.value || 0);
        const buyVol = Number(cFound.buy_volume || Math.round(vol * (bodyNum >= 0 ? 0.6 : 0.4) * 100) / 100);
        const sellVol = Number(cFound.sell_volume || Math.max(0, Math.round((vol - buyVol) * 100) / 100));

        setHoverData({
          time: param.time,
          open: Number(data.open),
          high: Number(data.high),
          low: Number(data.low),
          close: Number(data.close),
          rangeNum,
          rangePct,
          bodyNum,
          bodyPct,
          volume: vol,
          buyVolume: buyVol,
          sellVolume: sellVol,
          point: param.point,
          cursorPrice: cursorPrice !== null ? Number(cursorPrice) : Number(data.close)
        });
      } else if (cursorPrice !== null) {
        setHoverData({
          point: param.point,
          cursorPrice: Number(cursorPrice)
        });
      } else {
        setHoverData(null);
      }
    });

    // Obsługa płynnego przesuwania wykresu w pionie (pan w osi Y) przy trzymaniu lewego przycisku myszy
    let isDraggingY = false;
    let dragStartY = 0;
    let initialPriceRange = null;

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      const rect = container.getBoundingClientRect();
      const ps = chart.priceScale('right');
      const priceScaleWidth = (ps && typeof ps.width === 'function' ? ps.width() : 0) || 65;
      
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Jeśli kliknięto w prawą oś Y (cena) -> pozwól na natywne rozciąganie osi przez lightweight-charts!
      if (clickX >= rect.width - priceScaleWidth) {
        return;
      }
      // Jeśli kliknięto w dolną oś X (czas) -> pozwól na natywne rozciąganie osi przez lightweight-charts!
      if (clickY >= rect.height - 28) {
        return;
      }

      isDraggingY = true;
      dragStartY = e.clientY;
      try {
        if (ps && typeof ps.getVisibleRange === 'function') {
          initialPriceRange = ps.getVisibleRange();
        }
      } catch (err) {}
    };

    const handleMouseMove = (e) => {
      if (!isDraggingY || !initialPriceRange) return;
      const deltaY = e.clientY - dragStartY;
      if (Math.abs(deltaY) < 1) return;

      const containerHeight = container.clientHeight || 500;
      const priceSpan = initialPriceRange.to - initialPriceRange.from;
      if (priceSpan <= 0 || containerHeight <= 0) return;

      // Przesunięcie w dół myszą przesuwa wykres w dół -> widzimy wyższe poziomy cen
      // Przesunięcie w górę myszą przesuwa wykres w górę -> widzimy niższe poziomy cen
      const priceShift = (deltaY / containerHeight) * priceSpan;

      try {
        const ps = chart.priceScale('right');
        if (ps && typeof ps.setVisibleRange === 'function') {
          ps.setVisibleRange({
            from: initialPriceRange.from + priceShift,
            to: initialPriceRange.to + priceShift
          });
        }
      } catch (err) {}
    };

    const handleMouseUp = () => {
      isDraggingY = false;
      initialPriceRange = null;
    };

    const handleDblClick = () => {
      try {
        const ps = chart.priceScale('right');
        if (ps && typeof ps.setAutoScale === 'function') {
          ps.setAutoScale(true);
        }
      } catch (err) {}
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('dblclick', handleDblClick);

    // ResizeObserver dynamically keeps canvas 100% fitted to viewport
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0 && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('dblclick', handleDblClick);
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [symbol, timeframe, isMaxHistory]);

  // Płynna aktualizacja danych świec w czasie rzeczywistym bez niszczenia i resetowania zoomu wykresu
  useEffect(() => {
    if (!candleSeriesRef.current || formattedCandles.length === 0) return;
    try {
      candleSeriesRef.current.setData(formattedCandles);
      const last = formattedCandles[formattedCandles.length - 1];
      if (last) {
        try { candleSeriesRef.current.update(last); } catch (e) {}
      }
      if (!hasInitialFitRef.current && chartInstanceRef.current) {
        hasInitialFitRef.current = true;
        chartInstanceRef.current.timeScale().fitContent();
      }
      if (volumeSeriesRef.current) {
        const volumeData = formattedCandles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)'
        }));
        volumeSeriesRef.current.setData(volumeData);
      }
    } catch (err) {
      console.warn('Aktualizacja danych świec:', err);
    }
  }, [formattedCandles]);

  // =========================================================================
  // Render Current Price Line + Strategy Overlays
  // =========================================================================
  useEffect(() => {
    const chart = chartInstanceRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries || formattedCandles.length === 0) return;

    const computeMaData = (period) => {
      const res = [];
      for (let i = 0; i < formattedCandles.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) sum += formattedCandles[i - j].close;
        res.push({ time: formattedCandles[i].time, value: parseFloat((sum / period).toFixed(4)) });
      }
      return res;
    };

    const computeHmaData = (period = 20) => {
      const halfPeriod = Math.floor(period / 2);
      const sqrtPeriod = Math.floor(Math.sqrt(period));
      
      const wma = (data, p) => {
        const out = [];
        const weights = (p * (p + 1)) / 2;
        for (let i = 0; i < data.length; i++) {
          if (i < p - 1) continue;
          let sum = 0;
          for (let j = 0; j < p; j++) sum += data[i - j] * (p - j);
          out.push({ idx: i, val: sum / weights });
        }
        return out;
      };

      const closes = formattedCandles.map((c) => c.close);
      const wmaHalf = wma(closes, halfPeriod);
      const wmaFull = wma(closes, period);

      const diff = [];
      for (let i = 0; i < wmaFull.length; i++) {
        const targetIdx = wmaFull[i].idx;
        const halfMatch = wmaHalf.find((m) => m.idx === targetIdx);
        if (halfMatch) {
          diff.push({ idx: targetIdx, val: 2 * halfMatch.val - wmaFull[i].val });
        }
      }

      const diffVals = diff.map((d) => d.val);
      const hmaRaw = wma(diffVals, sqrtPeriod);

      return hmaRaw.map((h) => ({
        time: formattedCandles[diff[h.idx].idx].time,
        value: parseFloat(h.val.toFixed(4))
      }));
    };

    const computeBollingerBands = (period = 20, multiplier = 2.0) => {
      const upper = [];
      const lower = [];
      for (let i = 0; i < formattedCandles.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) sum += formattedCandles[i - j].close;
        const mean = sum / period;
        let varSum = 0;
        for (let j = 0; j < period; j++) varSum += Math.pow(formattedCandles[i - j].close - mean, 2);
        const std = Math.sqrt(varSum / period);
        const t = formattedCandles[i].time;
        upper.push({ time: t, value: parseFloat((mean + multiplier * std).toFixed(4)) });
        lower.push({ time: t, value: parseFloat((mean - multiplier * std).toFixed(4)) });
      }
      return { upper, lower };
    };

    // Remove old indicator series
    Object.values(indicatorSeriesRef.current).forEach((s) => {
      try { chart.removeSeries(s); } catch (e) {}
    });
    indicatorSeriesRef.current = {};

    // Remove old price lines
    priceLinesRef.current.forEach((line) => {
      try { candleSeries.removePriceLine(line); } catch (e) {}
    });
    priceLinesRef.current = [];

    // 0. Widoczność wolumenu zgodnie z aktywną warstwą
    if (volumeSeriesRef.current) {
      try {
        volumeSeriesRef.current.applyOptions({ visible: Boolean(activeLayers.volume) });
      } catch (err) {}
    }


    // 1. Moving Averages
    if (activeLayers.sma20) {
      const s20 = chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 1.5, title: 'SMA 20' });
      s20.setData(computeMaData(20));
      indicatorSeriesRef.current.sma20 = s20;
    }

    if (activeLayers.sma50) {
      const s50 = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1.5, title: 'SMA 50' });
      s50.setData(computeMaData(50));
      indicatorSeriesRef.current.sma50 = s50;
    }

    if (activeLayers.sma200) {
      const s200 = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, title: 'SMA 200' });
      s200.setData(computeMaData(Math.min(200, formattedCandles.length - 2)));
      indicatorSeriesRef.current.sma200 = s200;
    }

    if (activeLayers.hma20) {
      const hma = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2, title: 'HMA 20 (Hull)' });
      hma.setData(computeHmaData(20));
      indicatorSeriesRef.current.hma20 = hma;
    }

    // 2. Bollinger Bands
    if (activeLayers.bbands) {
      const bb = computeBollingerBands(20, 2.0);
      const bbUpper = chart.addSeries(LineSeries, { color: 'rgba(236, 72, 153, 0.75)', lineWidth: 1, lineStyle: 2, title: 'BB Upper' });
      const bbLower = chart.addSeries(LineSeries, { color: 'rgba(236, 72, 153, 0.75)', lineWidth: 1, lineStyle: 2, title: 'BB Lower' });
      bbUpper.setData(bb.upper);
      bbLower.setData(bb.lower);
      indicatorSeriesRef.current.bbUpper = bbUpper;
      indicatorSeriesRef.current.bbLower = bbLower;
    }

    // 3. SMC Price Lines & Markers
    const markers = [];

    if (activeLayers.cdlMarkers && features?.active_candlestick_patterns) {
      const lastCandle = formattedCandles[formattedCandles.length - 1];
      if (lastCandle) {
        features.active_candlestick_patterns.forEach((pat) => {
          const isBull = pat.includes('BULLISH');
          markers.push({
            time: lastCandle.time,
            position: isBull ? 'belowBar' : 'aboveBar',
            color: isBull ? '#34d399' : '#f87171',
            shape: isBull ? 'arrowUp' : 'arrowDown',
            text: `CDL: ${pat.split(':')[0].replace('CDL_', '')}`,
            size: 1.2
          });
        });
      }
    }

    if (activeLayers.bos && features?.structure_breaks) {
      features.structure_breaks.slice(-3).forEach((sb) => {
        priceLinesRef.current.push(candleSeries.createPriceLine({
          price: sb.level,
          color: sb.direction === 1 ? '#34d399' : '#f87171',
          lineWidth: 1.5,
          lineStyle: 1,
          axisLabelVisible: true,
          title: `${sb.type} ${sb.direction === 1 ? '▲' : '▼'}`
        }));
      });
    }

    if (activeLayers.fvg && features?.fair_value_gaps) {
      features.fair_value_gaps.slice(-2).forEach((fvg) => {
        const isBull = fvg.direction === 1;
        priceLinesRef.current.push(candleSeries.createPriceLine({
          price: (fvg.top + fvg.bottom) / 2,
          color: isBull ? '#34d399' : '#f87171',
          lineWidth: 1.5,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `FVG ${isBull ? '▲ Demand' : '▼ Supply'} ${fvg.mitigated ? '[Mit]' : '[Open]'}`
        }));
      });
    }

    if (activeLayers.orderBlocks && features?.order_blocks) {
      features.order_blocks.slice(-2).forEach((ob) => {
        const isDemand = ob.direction === 1;
        priceLinesRef.current.push(candleSeries.createPriceLine({
          price: (ob.top + ob.bottom) / 2,
          color: isDemand ? '#10b981' : '#ef4444',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: isDemand ? '🏛️ DEMAND OB' : '🏛️ SUPPLY OB'
        }));
      });
    }

    // 4. TradingAgents Levels
    if (advice?.decision) {
      const dec = advice.decision;
      if (activeLayers.entryLevel && dec.entry_price) {
        priceLinesRef.current.push(candleSeries.createPriceLine({
          price: dec.entry_price,
          color: '#38bdf8',
          lineWidth: 2,
          title: `ENTRY (${dec.action})`
        }));
      }
      if (activeLayers.stopLoss && dec.stop_loss) {
        priceLinesRef.current.push(candleSeries.createPriceLine({
          price: dec.stop_loss,
          color: '#f43f5e',
          lineWidth: 2,
          lineStyle: 2,
          title: 'STOP LOSS'
        }));
      }
      if (activeLayers.takeProfit && dec.take_profit) {
        priceLinesRef.current.push(candleSeries.createPriceLine({
          price: dec.take_profit,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: 2,
          title: `TAKE PROFIT (R:R 1:${dec.risk_reward_ratio || 2.0})`
        }));
      }
    }

    if (markers.length > 0) {
      try { createSeriesMarkers(candleSeries, markers); } catch (err) {}
    }

  }, [activeLayers, formattedCandles, features, advice, latestPrice, activeExchange]);

  const handleFitScreen = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
      try {
        chartInstanceRef.current.priceScale('right').setAutoScale(true);
      } catch (err) {}
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[56px] z-40 bg-slate-950 flex flex-col overflow-hidden select-none animate-fadeIn">
      
      {/* ========================================================================= */}
      {/* 1. SZTYWNY, STABILNY PASEK STEROWANIA: STAŁY ROZMIAR I POZYCJA PRZYCISKÓW */}
      {/* ========================================================================= */}
      <div className="h-[46px] min-h-[46px] max-h-[46px] bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between flex-nowrap flex-shrink-0 text-xs font-mono select-none overflow-hidden">
        
        {/* Lewa strona: Symbol, Giełda, AKTUALNA CENA AKTYWA & Zmiana */}
        <div className="flex items-center space-x-2.5 overflow-x-auto">
          <div className="flex items-center space-x-1.5 font-bold">
            <span className="text-white text-sm tracking-tight">{symbol}</span>
            <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-1.5 py-0.2 rounded text-[10px] font-bold">
              {activeExchange}
            </span>
            <button
              onClick={() => onMarketTypeChange && onMarketTypeChange(marketType === 'FUTURES' ? 'SPOT' : 'FUTURES')}
              className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold cursor-pointer border transition-all ${
                marketType === 'FUTURES'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title={`Typ rynku: ${marketType}. Kliknij, aby przełączyć SPOT / FUTURES. Na giełdach ceny różnią się bazą (premium/discount)!`}
            >
              {marketType}
            </button>
          </div>

          {/* AKTUALNA CENA AKTYWA: Klasyczne niebieskie pole z żółtym tekstem, naturalna zmiana bez migotania */}
          <div className="flex items-center space-x-1.5">
            <div 
              className="relative group cursor-help inline-flex items-center"
              title={`cena aktualna na giełdzie: ${activeExchange} (${marketType})`}
            >
              <div className="bg-blue-600 hover:bg-blue-500 text-yellow-300 font-extrabold font-mono text-sm px-2.5 py-0.5 rounded shadow-md border border-blue-400/50 transition-all flex items-center space-x-1">
                <span>${latestPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              </div>
              
              {/* Tooltip po najechaniu na cenę */}
              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center z-50 whitespace-nowrap bg-slate-900/95 text-slate-200 border border-blue-500/60 shadow-2xl px-2.5 py-1 rounded-md text-[11px] font-sans font-medium">
                cena aktualna: <span className="font-bold text-yellow-300 ml-1">{activeExchange} ({marketType})</span>
              </div>
            </div>

            <div 
              className="relative group cursor-help inline-flex items-center"
              title={`Wskaźnik procentowy:\n• Zmiana w całej załadowanej historii (${priceChange.count} świec): ${priceChange.pct >= 0 ? '+' : ''}${priceChange.pct.toFixed(2)}% (od $${priceChange.first?.toFixed(2)} do $${priceChange.last?.toFixed(2)})\n• Zmiana na bieżącej świecy (${timeframe}): ${candleChange.pct >= 0 ? '+' : ''}${candleChange.pct.toFixed(2)}% (od $${candleChange.open?.toFixed(2)} do $${candleChange.close?.toFixed(2)})`}
            >
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 flex items-center space-x-1 ${priceChange.pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span>{priceChange.pct >= 0 ? `+${priceChange.pct.toFixed(2)}%` : `${priceChange.pct.toFixed(2)}%`}</span>
                <span className="text-[8px] font-mono text-slate-400">({priceChange.count} św.)</span>
              </span>

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute -bottom-16 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap bg-slate-900/95 text-slate-200 border border-slate-700 shadow-2xl p-2 rounded-md text-[10px] font-sans font-medium">
                <div><span className="text-slate-400">Cała załadowana historia:</span> <span className={priceChange.pct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{priceChange.pct >= 0 ? '+' : ''}{priceChange.pct.toFixed(2)}%</span> ({priceChange.count} świec: ${priceChange.first?.toFixed(2)} ➔ ${priceChange.last?.toFixed(2)})</div>
                <div><span className="text-slate-400">Świeca bieżąca ({timeframe}):</span> <span className={candleChange.pct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{candleChange.pct >= 0 ? '+' : ''}{candleChange.pct.toFixed(2)}%</span> (${candleChange.open?.toFixed(2)} ➔ ${candleChange.close?.toFixed(2)})</div>
              </div>
            </div>
          </div>

          {/* TIMEFRAME SELECTOR: 15s, 30s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 1d, 1W, 1M, 3M, 6M, 1Y */}
          <div ref={timeframeContainerRef} className="flex items-center space-x-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 overflow-x-auto max-w-[420px] scrollbar-none">
            {[
              '15s', '30s',
              '1m', '3m', '5m', '15m', '30m',
              '1h', '2h', '4h', '8h',
              '1d', '1W',
              '1M', '3M', '6M', '1Y'
            ].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe && setTimeframe(tf)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeframe === tf
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* EKSTRA PRZYCISK: CAŁA HISTORIA */}
          <button
            onClick={onFetchAllHistory}
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              isMaxHistory
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-amber-300'
            }`}
          >
            <span>📜 Cała historia</span>
            {isMaxHistory && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 rounded">MAX</span>}
          </button>

          {/* PRZYCISK TERMINAL FUTURES NA PASKU WYKRESU */}
          <button
            onClick={onOpenFuturesTerminal}
            className="px-2 py-0.5 rounded-lg border border-purple-500/40 text-[10px] font-bold bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 hover:text-white hover:border-purple-400 transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
            title="Otwórz Terminal Egzekucji Kontraktów Futures (Multi-TP, R:R > 2.0, monitor stanu aktywa)"
          >
            <span>⚡ Futures</span>
          </button>

          {/* PRZYCISK HISTORIA ZLECEŃ NA PASKU WYKRESU */}
          <button
            onClick={onOpenOrderHistory}
            className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] font-bold bg-slate-950 hover:bg-slate-800 text-amber-300 hover:border-amber-400 transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
            title="Otwórz okno historii złożonych zleceń i wykonanych transakcji"
          >
            <span>📋 Zlecenia</span>
          </button>
        </div>

        {/* Prawa strona: Przyciski globalne o ZABLOKOWANEJ POZYCJI I ROZMIARZE (zero skakania!) */}
        <div className="flex items-center space-x-1.5 flex-shrink-0 ml-auto select-none">


          {/* Przycisk Pokaż wszystko - dodaje wszystkie wskaźniki na wykres */}
          <button
            onClick={() => selectAll(true)}
            className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-bold shadow transition-all cursor-pointer flex items-center space-x-1"
            title="Dodaj wszystkie wskaźniki na wykres"
          >
            <span>👁 Pokaż wszystko</span>
          </button>

          {/* Przycisk Odznacz - ustawiony PRZED Dopasuj */}
          <button
            onClick={() => selectAll(false)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-all cursor-pointer border border-slate-700 flex items-center space-x-1"
            title="Odznacz wszystkie wskaźniki (czysty wykres)"
          >
            <span>✕ Odznacz</span>
          </button>

          {/* Przycisk Dopasuj */}
          <button
            onClick={handleFitScreen}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-all cursor-pointer border border-slate-700 flex items-center space-x-1"
            title="Dopasuj wykres do ekranu"
          >
            <span>⛶ Dopasuj</span>
          </button>

          {/* Przycisk aktywacji / deaktywacji Tooltipa */}
          <button
            onClick={() => setShowTooltip((prev) => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1 border ${
              showTooltip
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Włącz lub wyłącz pływający tooltip ze szczegółami ceny i świecy"
          >
            <span>💬 Tooltip: {showTooltip ? 'WŁ' : 'WYŁ'}</span>
          </button>

          {/* Przełącznik: Price Refresh 1s (domyślnie wyłączony) */}
          <button
            onClick={onTogglePriceRefresh1s}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 border flex-shrink-0 whitespace-nowrap ${
              isPriceRefresh1s
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Włącz lub wyłącz automatyczne odświeżanie ceny i wykresu co 1 sekundę"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${isPriceRefresh1s ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>Price Refresh 1s: {isPriceRefresh1s ? 'WŁ' : 'WYŁ'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-0.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-bold shadow-sm"
            >
              ✕ Kokpit
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. JEDEN POZIOMY PASEK PARAMETRÓW STRATEGII: MIEŚCI SIĘ BEZ SKROLOWANIA! */}
      {/* ========================================================================= */}
      <div className="h-[36px] min-h-[36px] max-h-[36px] bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between flex-nowrap gap-1 overflow-x-auto text-[10px] font-mono flex-shrink-0 scrollbar-none select-none">
        
        {/* Moduł 1: Trend */}
        <div className="flex items-center space-x-1 flex-shrink-0 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/80">
          <span className="text-cyan-400 font-sans font-bold">Trend:</span>
          {[
            { k: 'sma20', label: 'SMA20', color: 'bg-cyan-500 text-slate-950 font-bold' },
            { k: 'sma50', label: 'SMA50', color: 'bg-purple-500 text-white font-bold' },
            { k: 'sma200', label: 'SMA200', color: 'bg-blue-500 text-white font-bold' },
            { k: 'hma20', label: 'HMA20', color: 'bg-emerald-500 text-slate-950 font-bold' }
          ].map(p => (
            <button
              key={p.k}
              onClick={() => toggleLayer(p.k)}
              className={`px-1.5 py-0.2 rounded transition-all cursor-pointer whitespace-nowrap ${
                activeLayers[p.k] ? p.color : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {activeLayers[p.k] ? '✓ ' : ''}{p.label}
            </button>
          ))}
        </div>

        {/* Moduł 2: Zmienność */}
        <div className="flex items-center space-x-1 flex-shrink-0 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/80">
          <span className="text-pink-400 font-sans font-bold">Zmienność:</span>
          {[
            { k: 'bbands', label: 'Bollinger', color: 'bg-pink-500 text-white font-bold' },
            { k: 'squeeze', label: 'Carter Sqz', color: 'bg-amber-500 text-slate-950 font-bold' },
            { k: 'volume', label: 'Vol', color: 'bg-cyan-600 text-white font-bold' }
          ].map(p => (
            <button
              key={p.k}
              onClick={() => toggleLayer(p.k)}
              className={`px-1.5 py-0.2 rounded transition-all cursor-pointer whitespace-nowrap ${
                activeLayers[p.k] ? p.color : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {activeLayers[p.k] ? '✓ ' : ''}{p.label}
            </button>
          ))}
        </div>

        {/* Moduł 3: SMC / ICT */}
        <div className="flex items-center space-x-1 flex-shrink-0 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/80">
          <span className="text-indigo-400 font-sans font-bold">SMC:</span>
          {[
            { k: 'fvg', label: 'FVG Gaps', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' },
            { k: 'orderBlocks', label: 'OrderBlocks', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' },
            { k: 'bos', label: 'BOS Wybicia', color: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold' },
            { k: 'breakers', label: 'Breakers', color: 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold' }
          ].map(p => (
            <button
              key={p.k}
              onClick={() => toggleLayer(p.k)}
              className={`px-1.5 py-0.2 rounded transition-all cursor-pointer whitespace-nowrap ${
                activeLayers[p.k] ? p.color : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {activeLayers[p.k] ? '✓ ' : ''}{p.label}
            </button>
          ))}
        </div>

        {/* Moduł 4: Egzekucja */}
        <div className="flex items-center space-x-1 flex-shrink-0 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/80">
          <span className="text-amber-400 font-sans font-bold">Egzekucja:</span>
          {[
            { k: 'entryLevel', label: 'Entry', color: 'bg-blue-500 text-white font-bold' },
            { k: 'stopLoss', label: 'SL', color: 'bg-rose-500 text-white font-bold' },
            { k: 'takeProfit', label: 'TP', color: 'bg-emerald-500 text-slate-950 font-bold' },
            { k: 'cdlMarkers', label: 'CDL Formacje', color: 'bg-amber-500 text-slate-950 font-bold' }
          ].map(p => (
            <button
              key={p.k}
              onClick={() => toggleLayer(p.k)}
              className={`px-1.5 py-0.2 rounded transition-all cursor-pointer whitespace-nowrap ${
                activeLayers[p.k] ? p.color : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {activeLayers[p.k] ? '✓ ' : ''}{p.label}
            </button>
          ))}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. GŁÓWNY OBSZAR TRADINGVIEW CANVAS                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full min-h-0 relative bg-slate-950 overflow-hidden">
        <div
          ref={chartContainerRef}
          className="w-full h-full cursor-crosshair"
        />
        {/* NAKŁADKA OHLCV W STYLU TRADINGVIEW W LEWYM GÓRNYM ROGU WYKRESU */}
        {/* Całkowicie niezależna od belki - zero przesuwania przycisków czy skakania rozmiarów! */}
        {hoverData && (
          <div className="absolute top-2 left-3 z-20 pointer-events-none flex items-center space-x-2 text-[11px] font-mono text-slate-300 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800/90 shadow-xl select-none">
            <span>O: <b className="text-white">${hoverData.open?.toFixed(2)}</b></span>
            <span>H: <b className="text-emerald-400">${hoverData.high?.toFixed(2)}</b></span>
            <span>L: <b className="text-rose-400">${hoverData.low?.toFixed(2)}</b></span>
            <span>C: <b className="text-cyan-300">${hoverData.close?.toFixed(2)}</b></span>
            <span className="text-slate-600">|</span>
            <span>Zakres: <b className="text-amber-300">${hoverData.rangeNum?.toFixed(2)} ({hoverData.rangePct?.toFixed(2)}%)</b></span>
            <span className="text-slate-600">|</span>
            <span>Body: <b className={hoverData.bodyNum >= 0 ? "text-emerald-400" : "text-rose-400"}>{hoverData.bodyNum >= 0 ? `+${hoverData.bodyPct?.toFixed(2)}%` : `${hoverData.bodyPct?.toFixed(2)}%`}</b></span>
            {hoverData.cursorPrice !== undefined && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-cyan-300 font-bold">Kursor: <b>${hoverData.cursorPrice?.toFixed(2)}</b></span>
              </>
            )}
          </div>
        )}

        {/* CENA AKTUALNA NA OSI Y: Niebieskie cyfry na żółtym tle + Tooltip po najechaniu z Actual Price: [Giełda] */}
        {latestPrice && (
          <div
            className="absolute right-0 z-30 transform -translate-y-1/2 flex items-center group cursor-help select-none pointer-events-auto"
            style={{ top: priceY !== null ? `${priceY}px` : '45%' }}
            title={`Actual Price: ${activeExchange}`}
          >
            {/* Tooltip po najechaniu myszką na żółte podświetlenie */}
            <div className="absolute right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none flex items-center whitespace-nowrap bg-slate-900/95 text-yellow-300 border border-yellow-400 px-2.5 py-1 rounded-md shadow-2xl text-[11px] font-sans font-bold z-50">
              Actual Price: <span className="text-white ml-1 font-extrabold">{activeExchange}</span>
            </div>

            {/* Żółte tło z niebieskimi cyframi */}
            <div className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-extrabold font-mono text-[11px] px-2.5 py-0.5 rounded-l shadow-lg border-y border-l border-yellow-500 transition-colors">
              ${latestPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </div>
          </div>
        )}

        {/* SZCZEGÓŁOWY DYNAMICZNY TOOLTIP ŚWIECY: włączany/wyłączany dedykowanym przyciskiem */}
        {showTooltip && hoverData && hoverData.open !== undefined && (
          <div
            className="absolute pointer-events-none z-30 bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-2xl text-xs font-mono text-slate-200 transition-all duration-75 max-w-xs"
            style={{
              left: hoverData.point
                ? `${Math.min(hoverData.point.x + 18, (chartContainerRef.current?.clientWidth || 700) - 250)}px`
                : '16px',
              top: hoverData.point
                ? `${Math.max(12, Math.min(hoverData.point.y - 60, (chartContainerRef.current?.clientHeight || 450) - 220))}px`
                : '16px'
            }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[10px] text-slate-400 font-sans">
              <span className="font-bold text-cyan-300">ŚWIECA {timeframe}</span>
              <span className="font-semibold text-slate-300">{activeExchange}</span>
            </div>

            {/* Ceny OHLC */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 py-1.5 border-b border-slate-800 text-[11px]">
              <div><span className="text-slate-400">Open:</span> <b className="text-white">${hoverData.open?.toFixed(2)}</b></div>
              <div><span className="text-slate-400">High:</span> <b className="text-emerald-400">${hoverData.high?.toFixed(2)}</b></div>
              <div><span className="text-slate-400">Low:</span> <b className="text-rose-400">${hoverData.low?.toFixed(2)}</b></div>
              <div><span className="text-slate-400">Close:</span> <b className="text-cyan-300">${hoverData.close?.toFixed(2)}</b></div>
            </div>

            {/* Zakres całej świecy w % i w liczbach */}
            <div className="py-1 border-b border-slate-800 text-[11px] flex justify-between items-center">
              <span className="text-slate-400">Zakres (H - L):</span>
              <span className="font-bold text-amber-300">
                ${hoverData.rangeNum?.toFixed(2)} ({hoverData.rangePct?.toFixed(2)}%)
              </span>
            </div>

            {/* % i kwota o ile urosło/spadło body */}
            <div className="py-1 border-b border-slate-800 text-[11px] flex justify-between items-center">
              <span className="text-slate-400">Zmiana Body:</span>
              <span className={`font-bold ${hoverData.bodyNum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hoverData.bodyNum >= 0 ? `+$${hoverData.bodyNum?.toFixed(2)}` : `-$${Math.abs(hoverData.bodyNum)?.toFixed(2)}`} ({hoverData.bodyPct >= 0 ? `+${hoverData.bodyPct?.toFixed(2)}%` : `${hoverData.bodyPct?.toFixed(2)}%`})
              </span>
            </div>

            {/* Wolumen kupna i sprzedaży */}
            <div className="pt-1.5 text-[11px] space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 font-semibold">Wolumen kupna:</span>
                <span className="font-bold text-emerald-300">{hoverData.buyVolume?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-rose-400 font-semibold">Wolumen sprzedaży:</span>
                <span className="font-bold text-rose-300">{hoverData.sellVolume?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                <span>Wolumen łączny:</span>
                <span>{hoverData.volume?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
