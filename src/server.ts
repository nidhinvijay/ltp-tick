import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';

import { startBinanceInput } from './binanceInput';
import { startCsvInput } from './csvInput';

// Load .env file
dotenv.config();

// Config with defaults
const PORT = process.env.PORT || 3000;
const TICK_SOURCE = process.env.TICK_SOURCE || 'binance';
const CSV_FILE = process.env.CSV_FILE || './data/sample.csv';

console.log('='.repeat(50));
console.log('[SERVER] LTP Tick Server Starting...');
console.log('[SERVER] Port:', PORT);
console.log('[SERVER] Tick Source:', TICK_SOURCE);
if (TICK_SOURCE === 'csv') {
  console.log('[SERVER] CSV File:', CSV_FILE);
}
console.log('='.repeat(50));

// Express app - serves HTML
const app = express();
app.use(express.static(path.join(__dirname, '../public')));

const server = app.listen(PORT, () => {
  console.log(`[SERVER] ✓ HTTP server running at http://localhost:${PORT}`);
});

// WebSocket server - broadcasts ticks to clients
const wss = new WebSocketServer({ server });
const clients: Set<WebSocket> = new Set();

wss.on('connection', (ws) => {
  console.log('[WS] ✓ New client connected');
  clients.add(ws);
  
  // Send current source info to new client
  ws.send(JSON.stringify({ type: 'source', source: TICK_SOURCE }));

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    clients.delete(ws);
  });
});

// Broadcast tick to all connected clients
function broadcastTick(price: number, time: string): void {
  const message = JSON.stringify({ type: 'tick', price, time });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start the appropriate input source
if (TICK_SOURCE === 'csv') {
  console.log('[SERVER] Using CSV input...');
  startCsvInput(CSV_FILE, broadcastTick);
} else {
  console.log('[SERVER] Using Binance input...');
  startBinanceInput(broadcastTick);
}
