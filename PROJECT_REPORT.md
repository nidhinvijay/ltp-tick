# BTCUSDT LTP Tracking & Simulation System - Documentation

## 1. Project Overview
This project is a high-performance, modular TypeScript system designed to capture real-time BTCUSDT ticks from Binance, process them through a custom trading state machine, and generate condensed test cases. It supports both live data streaming and CSV-based replay for logic verification.

The primary goal is to **condense high-frequency tick data** into meaningful trading events (Signals and Crossings) to facilitate easy debugging and test case creation.

---

## 2. System Architecture
The system is built with a modular approach to ensure simplicity and maintainability.

- **Frontend (HTML/JS)**: A real-time dashboard to monitor LTP, paper PnL, and detected events.
- **Backend (Node.js/TypeScript)**:
  - `server.ts`: Central hub coordinating data flow between inputs, logic, and persistence.
  - `binanceInput.ts`: Manages WebSocket connection to Binance Stream API.
  - `csvInput.ts`: Enables replaying historical tick data from files.
  - `signalReceiver.ts`: Parses TradingView webhook signals into structured data.
  - `stateMachine.ts`: Implements the core trading logic and event detection.
  - `csvRecorder.ts`: Handles high-speed logging to both raw and condensed CSV files.

---

## 3. State Machine Logic Details
The `stateMachine.ts` module is the brain of the system, responsible for maintaining the trading state and identifying significant market moves.

### States and Transitions
The system operates using two primary states:

1.  **NO_POSITION (Idle)**:
    *   **Inbound Trigger**: The system stays in this state until a valid **ENTRY** signal is received.
    *   **Transition**: Upon receiving an ENTRY signal, the system captures the current LTP as the `entryLTP`, sets the `threshold` (from the signal's `stopPx`), and transitions to the **POSITION** state.

2.  **POSITION (Active)**:
    *   **Real-time Tracking**: For every incoming tick, the system calculates the `paperPnL` (`currentLTP - entryLTP`).
    *   **Inbound Trigger**: The system stays in this state until a valid **EXIT** signal is received.
    *   **Transition**: Upon receiving an EXIT signal, the system calculates the final PnL, resets the tracking variables, and returns to the **NO_POSITION** state.

### Automated Event Detection (Data Condensation)
The State Machine continuously monitors the tick stream for specific "crossing" events that are critical for strategy validation:

*   **Threshold Monitoring**: Whenever the LTP moves from one side of the `threshold` to the other, the system logs a `LTP_CROSS_UP` or `LTP_CROSS_DOWN` event. This captures the exact second the stop price or target was breached.
*   **PnL Polarity Tracking**: The system detects when the position flips between a profit and a loss. A `PNL_CROSS_POSITIVE` or `PNL_CROSS_NEGATIVE` event is generated at the exact moment the PnL crosses the zero line.
*   **First-Tick Logic**: To avoid duplicate noise, the system only logs the **first tick** that causes a crossing. Subsequent ticks on the same side of the boundary are ignored until the boundary is crossed again.

---

## 4. Data Persistence
To balance between full visibility and manageable file sizes, two separate CSV files are maintained:

### A. Raw Ticks (`ticks_YYYY-MM-DD.csv`)
Captures every single LTP received for full replay fidelity. This is the "Truth" source for re-simulating the market.
- **Format**: `date, time, tick`

### B. Condensed Signals (`signals_YYYY-MM-DD.csv`)
Captures only the significant events detected by the state machine. This file serves as a **Test Case Script**.
- **Format**: `date, time, event, ltp, pnl, threshold`

---

## 5. TradingView Signal Format
The system is optimized for TradingView Alert signals, typically sent via webhooks.
- **Example**: `Accepted Entry + priorRisePct= 0.05 | stopPx=98000 | sym=BTCUSDT`
- **Parser**: A regex-based parser extracts the action (Entry/Exit), the price threshold (`stopPx`), and the symbol name.

---

## 6. How to Use & Test
1.  **Live Capture**: `npm run dev` (Connects to Binance and starts recording).
2.  **Replay Mode**: Set `TICK_SOURCE=csv` in `.env` to test state machine logic against historical data.
3.  **Manual Testing**: Use the **Send Signal** form on the dashboard to simulate TradingView webhooks while watching the LTP change.
4.  **Verification**: Check the "Condensed Events" table on the dashboard or inspect the generated `signals.csv` to ensure the logic followed the expected flow.

---

## 7. Operational Continuity
A secondary project, `ltp-recorder`, can run independently to ensure 24/7 data collection. It includes a specific reset at **05:30 AM** to cycle the filenames daily, matching common trading session structures.

