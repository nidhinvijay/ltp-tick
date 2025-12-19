// CSV Recorder - Saves ticks and condensed signals
// ticks.csv - ALL LTP ticks
// signals.csv - CONDENSED events only (signals, threshold crossings, PnL crossings)

import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = './data';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('[CSV] Created output directory:', OUTPUT_DIR);
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getTimeStr(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function initFile(filename: string, headers: string): string {
  const filepath = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, headers + '\n');
    console.log('[CSV] Created:', filename);
  }
  return filepath;
}

// --- TICKS CSV (all ticks) ---
const ticksFile = initFile(`ticks_${getDateStr()}.csv`, 'date,time,tick');
let tickCount = 0;

export function saveTick(ltp: number): void {
  const line = `${getDateStr()},${getTimeStr()},${ltp}`;
  fs.appendFileSync(ticksFile, line + '\n');
  tickCount++;
  // Less noisy - only log every 1000 ticks
  if (tickCount % 1000 === 0) {
    console.log(`[CSV] Saved ${tickCount} ticks to ticks.csv`);
  }
}

// --- SIGNALS CSV (condensed events only) ---
const signalsFile = initFile(`signals_${getDateStr()}.csv`, 'date,time,event,ltp,pnl,threshold');

export function saveCondensedEvent(event: string, ltp: number, pnl: number, threshold: number): void {
  const line = `${getDateStr()},${getTimeStr()},${event},${ltp},${pnl.toFixed(2)},${threshold}`;
  fs.appendFileSync(signalsFile, line + '\n');
  console.log(`[CSV] Saved: ${event} | LTP=${ltp} | PnL=${pnl.toFixed(2)}`);
}
