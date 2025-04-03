# J-Trading-Algo v2

A cryptocurrency trading algorithm that analyzes market data, generates trading signals, and sends notifications to Discord.

## Features

- **Technical Indicators**: Custom implementation of Variable Moving Average and Smoothed ATR
- **Trading Strategy**: J-Trend Sniper v2 strategy implementation
- **Market Data**: Real-time data from Binance via WebSockets
- **Signal Generation**: Automated trade signals with entry, stop-loss, and take-profit levels
- **Notifications**: Trading signals sent to Discord via webhooks
- **Error Handling**: Robust error handling and connection recovery
- **Configuration**: Environment-based configuration

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/j-trading-algo-v2.git
   cd j-trading-algo-v2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment configuration:
   ```bash
   cp .env.example .env
   ```
   
4. Edit the `.env` file with your settings, especially your Discord webhook URL.

## Usage

Start the trading algorithm:

```bash
npm start
```

For development:

```bash
npm run dev
```

## How It Works

1. The system connects to Binance to fetch historical price data
2. It establishes a WebSocket connection for real-time updates
3. When new price data arrives, it runs through the algorithm
4. Signals are generated when specific technical conditions are met
5. Signals are sent to Discord for notification
6. Stop-loss levels are updated as the market moves

## Project Structure

- `src/` - Source code
  - `Indicators/` - Technical indicator implementations
  - `Markets/` - Market data connectors
  - `Social/` - Notification services (Discord)
  - `Trend-sniper-v2/` - Core trading strategy
  - `Util/` - Utility functions
- `index.js` - Main entry point

## Algorithm Components

### Variable Moving Average (var_ma)

A custom moving average that adapts based on market volatility.

### J-ATR (JATR)

A modified Average True Range indicator with smoothing.

### J-Trend Sniper v2 (jTSv2)

The main trading strategy that combines var_ma and JATR to identify trend changes and generate signals.

## Error Handling

The system includes:

- WebSocket reconnection with exponential backoff
- API request retries with backoff
- Comprehensive error logging
- Graceful shutdown handling

## Configuration Options

See `.env.example` for available configuration options.

## Dependencies

- mathjs - Mathematical operations
- technicalindicators - Technical analysis functions
- uuid - Unique ID generation
- ws - WebSocket client
- dotenv - Environment configuration

## License

ISC

## Disclaimer

This software is for educational purposes only. Use at your own risk. Cryptocurrency trading involves significant risk and you can lose money. Past performance is not indicative of future results.
