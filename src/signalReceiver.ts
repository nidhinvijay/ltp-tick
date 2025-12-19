// Signal Receiver - Handles TradingView webhook signals
// POST /signal endpoint

export interface Signal {
  type: 'ENTRY' | 'EXIT';
  threshold: number;
  symbol: string;
  timestamp: Date;
  raw: string;
}

// Parse TradingView signal text
// Example: "Accepted Entry + priorRisePct=0.05 | stopPx=98000 | sym=BTCUSDT"
export function parseSignal(text: string): Signal | null {
  console.log('[SIGNAL] Parsing:', text);

  try {
    const isEntry = text.toLowerCase().includes('entry');
    const isExit = text.toLowerCase().includes('exit');
    
    if (!isEntry && !isExit) {
      console.log('[SIGNAL] ✗ No entry/exit found in signal');
      return null;
    }

    // Extract stopPx (threshold)
    const stopPxMatch = text.match(/stopPx\s*=\s*(\d+)/i);
    const threshold = stopPxMatch ? parseInt(stopPxMatch[1]) : 0;

    // Extract symbol
    const symMatch = text.match(/sym\s*=\s*(\w+)/i);
    const symbol = symMatch ? symMatch[1] : 'BTCUSDT';

    const signal: Signal = {
      type: isEntry ? 'ENTRY' : 'EXIT',
      threshold,
      symbol,
      timestamp: new Date(),
      raw: text
    };

    console.log(`[SIGNAL] ✓ Parsed: ${signal.type} | threshold=${signal.threshold} | sym=${signal.symbol}`);
    return signal;
  } catch (error) {
    console.error('[SIGNAL] ✗ Parse error:', error);
    return null;
  }
}
