// State Machine - Sir's trading logic from the image
// States: NO_POSITION, POSITION
// Tracks: LTP vs threshold crossings, PnL sign changes

import { Signal } from './signalReceiver';

export type State = 'NO_POSITION' | 'POSITION';

export interface Position {
  entryLTP: number;
  entryTime: Date;
  threshold: number;
}

// Current state
let state: State = 'NO_POSITION';
let position: Position | null = null;
let currentLTP = 0;
let paperPnL = 0;

// Track previous values for detecting crossings
let prevLtpAboveThreshold: boolean | null = null;
let prevPnLPositive: boolean | null = null;

// Callback for condensed events
let onCondensedEvent: ((event: string, ltp: number, pnl: number, threshold: number) => void) | null = null;

export function initStateMachine(callback: (event: string, ltp: number, pnl: number, threshold: number) => void): void {
  onCondensedEvent = callback;
  console.log('[STATE] State machine initialized');
}

export function getState() {
  return {
    state,
    position,
    currentLTP,
    paperPnL
  };
}

// Handle tick - check for threshold/PnL crossings
export function onTick(ltp: number): void {
  currentLTP = ltp;

  if (state === 'POSITION' && position) {
    // Calculate paper PnL
    const oldPnL = paperPnL;
    paperPnL = ltp - position.entryLTP;

    // Check LTP vs threshold crossing (FIRST TICK only)
    const ltpAboveThreshold = ltp >= position.threshold;
    if (prevLtpAboveThreshold !== null && prevLtpAboveThreshold !== ltpAboveThreshold) {
      const event = ltpAboveThreshold ? 'LTP_CROSS_UP' : 'LTP_CROSS_DOWN';
      console.log(`[STATE] ${event} at LTP=${ltp}, threshold=${position.threshold}`);
      onCondensedEvent?.(event, ltp, paperPnL, position.threshold);
    }
    prevLtpAboveThreshold = ltpAboveThreshold;

    // Check PnL sign crossing
    const pnlPositive = paperPnL >= 0;
    if (prevPnLPositive !== null && prevPnLPositive !== pnlPositive) {
      const event = pnlPositive ? 'PNL_CROSS_POSITIVE' : 'PNL_CROSS_NEGATIVE';
      console.log(`[STATE] ${event} at PnL=${paperPnL.toFixed(2)}`);
      onCondensedEvent?.(event, ltp, paperPnL, position.threshold);
    }
    prevPnLPositive = pnlPositive;
  }
}

// Handle signal from TradingView
export function onSignal(signal: Signal): void {
  console.log(`[STATE] Signal: ${signal.type} at LTP=${currentLTP}`);

  if (signal.type === 'ENTRY' && state === 'NO_POSITION') {
    // Open position
    state = 'POSITION';
    position = {
      entryLTP: currentLTP,
      entryTime: new Date(),
      threshold: signal.threshold
    };
    paperPnL = 0;
    prevLtpAboveThreshold = null;
    prevPnLPositive = null;

    console.log(`[STATE] ✓ ENTRY: Opened position at ${currentLTP}, threshold=${signal.threshold}`);
    onCondensedEvent?.('ENTRY_SIGNAL', currentLTP, 0, signal.threshold);
  }
  else if (signal.type === 'EXIT' && state === 'POSITION') {
    // Close position
    const finalPnL = paperPnL;
    const threshold = position?.threshold || 0;
    
    console.log(`[STATE] ✓ EXIT: Closed position at ${currentLTP}, PnL=${finalPnL.toFixed(2)}`);
    onCondensedEvent?.('EXIT_SIGNAL', currentLTP, finalPnL, threshold);

    state = 'NO_POSITION';
    position = null;
    paperPnL = 0;
  }
  else {
    console.log(`[STATE] ✗ Invalid: ${signal.type} while ${state}`);
  }
}
