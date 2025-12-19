import WebSocket from 'ws';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';

export function startBinanceInput(onTick: (price: number, time: string) => void): void {
  console.log('[BINANCE] Connecting to Binance WebSocket...');
  console.log('[BINANCE] URL:', BINANCE_WS_URL);

  const ws = new WebSocket(BINANCE_WS_URL);

  ws.on('open', () => {
    console.log('[BINANCE] ✓ Connected successfully!');
  });

  ws.on('message', (data: WebSocket.Data) => {
    const trade = JSON.parse(data.toString());
    const price = parseFloat(trade.p);
    const time = new Date(trade.T).toLocaleTimeString();
    
    // No logging here - too noisy
    onTick(price, time);
  });

  ws.on('error', (error) => {
    console.error('[BINANCE] ✗ Error:', error.message);
  });

  ws.on('close', () => {
    console.log('[BINANCE] Connection closed. Reconnecting in 3s...');
    setTimeout(() => startBinanceInput(onTick), 3000);
  });
}
