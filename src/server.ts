import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';

import { startBinanceInput } from './binanceInput';
import { startCsvInput } from './csvInput';
import { parseSignal } from './signalReceiver';
import { initStateMachine, onTick, onSignal, getState } from './stateMachine';
import { saveTick, saveCondensedEvent } from './csvRecorder';

dotenv.config();

const PORT = process.env.PORT || 3000;
const TICK_SOURCE = process.env.TICK_SOURCE || 'binance';
const CSV_FILE = process.env.CSV_FILE || './data/sample.csv';

console.log('='.repeat(50));
console.log('[SERVER] LTP Tick Server Starting...');
console.log('[SERVER] Port:', PORT);
console.log('[SERVER] Tick Source:', TICK_SOURCE);
console.log('='.repeat(50));

// Express app
const app = express();
app.use(express.json());
app.use(express.text());
app.use(express.static(path.join(__dirname, '../public')));

const server = app.listen(PORT, () => {
  console.log(`[SERVER] ✓ HTTP server running at http://localhost:${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });
const clients: Set<WebSocket> = new Set();

wss.on('connection', (ws) => {
  console.log('[WS] ✓ Client connected');
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'source', source: TICK_SOURCE }));
  ws.send(JSON.stringify({ type: 'state', ...getState() }));

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    clients.delete(ws);
  });
});

function broadcast(data: object): void {
  const msg = JSON.stringify(data);
  clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(msg));
}

// Initialize state machine with callback for condensed events
initStateMachine((event, ltp, pnl, threshold) => {
  saveCondensedEvent(event, ltp, pnl, threshold);
  broadcast({ type: 'condensed', event, ltp, pnl, threshold });
});

// Handle tick - NO logging here (too noisy)
function handleTick(price: number, time: string): void {
  saveTick(price);           // Save to ticks.csv
  onTick(price);             // Update state machine
  broadcast({ type: 'tick', price, time });
  broadcast({ type: 'state', ...getState() });
}

// Signal endpoint
app.post('/signal', (req, res) => {
  const text = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  console.log('[SERVER] Signal received:', text);
  
  const signal = parseSignal(text);
  if (signal) {
    onSignal(signal);
    broadcast({ type: 'signal', signal });
    broadcast({ type: 'state', ...getState() });
    res.json({ success: true, signal });
  } else {
    res.status(400).json({ success: false, error: 'Parse failed' });
  }
});

// Start input source
if (TICK_SOURCE === 'csv') {
  startCsvInput(CSV_FILE, handleTick);
} else {
  startBinanceInput(handleTick);
}
