import createMarket from './src/Markets/Crypto_market.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the trading system
 */
async function main() {
  console.log('Starting J-Trading-Algo v2...');
  
  try {
    // Create market instances for each trading pair
    const markets = [];
    
    // Default configuration from environment variables
    const defaultConfig = {
      coin: process.env.TRADING_PAIR || "BTCUSDT",
      timeframe: process.env.TIMEFRAME || "5m",
      market: process.env.MARKET_TYPE || "futures", 
      exchange: "Binance"
    };
    
    // Add additional trading pairs here if needed
    const marketConfigs = [
      defaultConfig,
      // Additional configurations can be added here
      // { coin: "ETHUSDT", timeframe: "5m", market: "futures", exchange: "Binance" },
    ];
    
    // Initialize all markets
    for (const config of marketConfigs) {
      console.log(`Setting up market for ${config.coin} on ${config.exchange} ${config.market}`);
      const market = await createMarket(config);
      
      if (market) {
        markets.push(market);
        console.log(`✅ ${config.coin} market initialized successfully`);
      } else {
        console.error(`❌ Failed to initialize ${config.coin} market`);
      }
    }
    
    // Handle process termination
    setupCleanupHandlers(markets);
    
    console.log('Trading system running. Press CTRL+C to stop.');
  } catch (error) {
    console.error('Fatal error starting trading system:', error);
    process.exit(1);
  }
}

/**
 * Set up cleanup handlers for graceful shutdown
 * @param {Array} markets - Array of active market instances
 */
function setupCleanupHandlers(markets) {
  // Handle CTRL+C and other termination signals
  process.on('SIGINT', () => handleShutdown(markets));
  process.on('SIGTERM', () => handleShutdown(markets));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    handleShutdown(markets);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection:', reason);
    handleShutdown(markets);
  });
}

/**
 * Handle graceful shutdown of the application
 * @param {Array} markets - Array of active market instances
 */
function handleShutdown(markets) {
  console.log('\nShutting down trading system...');
  
  // Close all market connections
  for (const market of markets) {
    if (market && typeof market.close === 'function') {
      market.close();
    }
  }
  
  console.log('All connections closed. Exiting.');
  process.exit(0);
}

// Start the application
main().catch(error => {
  console.error('Startup error:', error);
  process.exit(1);
});