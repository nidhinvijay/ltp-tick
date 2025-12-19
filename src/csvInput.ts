import fs from 'fs';
import csvParser from 'csv-parser';

interface TickRow {
  time: string;
  tick: string;
}

export function startCsvInput(filePath: string, onTick: (price: number, time: string) => void): void {
  console.log('[CSV] Starting CSV input...');
  console.log('[CSV] File:', filePath);

  const ticks: TickRow[] = [];

  // Read all ticks from CSV first
  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (row: TickRow) => {
      ticks.push(row);
      console.log(`[CSV] Loaded: ${row.time} -> ${row.tick}`);
    })
    .on('end', () => {
      console.log(`[CSV] ✓ Loaded ${ticks.length} ticks from file`);
      console.log('[CSV] Starting playback (1 tick per second)...');
      
      // Emit ticks one by one with 1 second delay
      let index = 0;
      const interval = setInterval(() => {
        if (index >= ticks.length) {
          console.log('[CSV] ✓ All ticks played. Restarting...');
          index = 0;
        }
        
        const tick = ticks[index];
        const price = parseFloat(tick.tick);
        console.log(`[CSV] Tick ${index + 1}/${ticks.length}: $${price.toFixed(2)} at ${tick.time}`);
        onTick(price, tick.time);
        index++;
      }, 1000);
    })
    .on('error', (error) => {
      console.error('[CSV] ✗ Error reading file:', error.message);
    });
}
