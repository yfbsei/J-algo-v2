import { WebSocket } from 'ws';
import binance_candles from '../Util/util.js';
import send_signal from '../Social/Discord/discord-signal.js';
import j_algo from '../j-algo.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Trading configuration
 * @typedef {Object} TradingConfig
 * @property {string} coin - Trading pair symbol
 * @property {string} timeframe - Candlestick timeframe
 * @property {string} market - Market type (spot or futures)
 * @property {string} exchange - Exchange name
 */

/**
 * Default trading configuration
 * @type {TradingConfig}
 */
const defaultConfig = {
  coin: process.env.TRADING_PAIR || "BTCUSDT",
  timeframe: process.env.TIMEFRAME || "5m",
  market: process.env.MARKET_TYPE || "futures", // spot || futures
  exchange: "Binance"
};

/**
 * Discord webhook URL for sending signals
 * @type {string}
 */
const discordWebhook = process.env.DISCORD_WEBHOOK || "YOUR_WEBHOOK_URL_HERE";

/**
 * Class to manage cryptocurrency market data and trading signals
 */
class CryptoMarket {
  /**
   * Create a new CryptoMarket instance
   * @param {TradingConfig} config - Trading configuration
   */
  constructor(config = defaultConfig) {
    this.config = config;
    this.candles = null;
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  /**
   * Initialize the market data fetching
   */
  async initialize() {
    console.log(`Initializing market data for ${this.config.coin} ${this.config.timeframe} on ${this.config.exchange} ${this.config.market}`);
    
    try {
      // Fetch initial candle data
      this.candles = await binance_candles(
        this.config.market, 
        this.config.coin, 
        this.config.timeframe
      );
      
      console.log(`Initial data fetched: ${this.candles.close.length} candles`);
      
      // Connect to WebSocket for real-time updates
      await this.connectWebSocket();
      
      return true;
    } catch (error) {
      console.error("Failed to initialize market data:", error);
      return false;
    }
  }
  
  /**
   * Connect to the WebSocket for real-time market data
   * @returns {Promise<boolean>} - Success status
   */
  async connectWebSocket() {
    return new Promise((resolve) => {
      try {
        // Determine the correct base URL based on market type
        const baseURL = (this.config.market === "spot") ? "stream" : "fstream";
        const symbol = this.config.coin.toLowerCase();
        const wsEndpoint = `wss://${baseURL}.binance.com/ws/${symbol}@kline_${this.config.timeframe}`;
        
        // Close existing socket if any
        if (this.socket) {
          this.socket.terminate();
        }
        
        // Create new WebSocket connection
        this.socket = new WebSocket(wsEndpoint);
        
        // Set up event handlers
        this.socket.on('open', () => {
          console.log(`WebSocket connected to ${wsEndpoint}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000; // Reset delay
          resolve(true);
        });
        
        this.socket.on('message', this.handleMessage.bind(this));
        
        this.socket.on('error', (error) => {
          console.error("WebSocket error:", error);
          this.isConnected = false;
          resolve(false);
        });
        
        this.socket.on('close', (code, reason) => {
          console.log(`WebSocket disconnected: ${code} ${reason}`);
          this.isConnected = false;
          
          // Try to reconnect
          this.attemptReconnect();
        });
        
        // Set a timeout in case connection takes too long
        setTimeout(() => {
          if (!this.isConnected) {
            console.error("WebSocket connection timeout");
            this.socket.terminate();
            resolve(false);
          }
        }, 10000); // 10 second timeout
        
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        resolve(false);
      }
    });
  }
  
  /**
   * Attempt to reconnect to WebSocket with exponential backoff
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
    
    console.log(`Attempting to reconnect in ${delay/1000} seconds... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        // Re-fetch candle data before reconnecting
        this.candles = await binance_candles(
          this.config.market, 
          this.config.coin, 
          this.config.timeframe
        );
        
        await this.connectWebSocket();
      } catch (error) {
        console.error("Reconnection failed:", error);
      }
    }, delay);
  }
  
  /**
   * Handle incoming WebSocket messages
   * @param {Buffer|String} data - Raw message data
   */
  handleMessage(data) {
    try {
      // Parse the message data
      const event = JSON.parse(data.toString());
      
      // Check if we received a kline event
      if (!event.k) {
        return;
      }
      
      const kline = event.k;
      
      // Only process completed candles
      if (kline.x) {
        // Extract candle data
        const candle = [
          parseFloat(kline.o), // open
          parseFloat(kline.h), // high
          parseFloat(kline.l), // low
          parseFloat(kline.c), // close
          parseFloat(kline.v)  // volume
        ];
        
        // Update candle data arrays
        for (const [i, key] of Object.keys(this.candles).entries()) {
          if (this.candles[key].length > 0) {
            this.candles[key].shift(); // remove oldest candle
            this.candles[key].push(candle[i]);
          }
        }
        
        // Process updated data through trading algorithm
        this.processSignal();
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }
  
  /**
   * Process market data and generate trading signals
   */
  processSignal() {
    try {
      // Run the trading algorithm
      const signal = j_algo(this.candles);
      
      // If we have a signal, send it
      if (signal) {
        this.pushSignal(signal);
      }
    } catch (error) {
      console.error("Error processing trading signal:", error);
    }
  }
  
  /**
   * Send trading signals to Discord
   * @param {Object} signal - Trading signal data
   */
  async pushSignal(signal) {
    try {
      // Handle new entry signals
      if (signal.body?.entry) {
        await send_signal({
          avatar_url: 'https://yt3.googleusercontent.com/W5i3MAGlRSO-l3ykaKrWtieVp-hHJmufF4wZPxEEKsRz57LTXpLNsLw3gOITAJgLPb8KZ0uv=s160-c-k-c0x00ffffff-no-rj',
          username: 'J-algo v2',
          embeds: [{
            title: `${this.config.coin} ${this.config.timeframe} in ${this.config.market} ${this.config.exchange}`,
            description: `
            Trade Id: ${signal.header.id}
            Time stamp: ${signal.header.time_stamp}

            *Order type: ${signal.header.order}*
            *Position: \`${signal.header.position}\`*

            **Entry: \`${signal.body.entry}\`**
            **Stop loss: \`${signal.body.stop_loss}\`**
            **Take profit: \`${signal.body.take_profit || "Not set"}\`**
            `,
            color: signal.header.position === "long" ? 0x00FF00 : 0xFF0000,
          }]
        }, discordWebhook);
        
        console.log(`New ${signal.header.position} signal sent for ${this.config.coin}`);
      }

      // Handle stop loss update signals
      if (signal.body?.update_stop_loss) {
        await send_signal({
          avatar_url: 'https://yt3.googleusercontent.com/W5i3MAGlRSO-l3ykaKrWtieVp-hHJmufF4wZPxEEKsRz57LTXpLNsLw3gOITAJgLPb8KZ0uv=s160-c-k-c0x00ffffff-no-rj',
          username: 'J-algo v2',
          embeds: [{
            title: "Stop loss update",
            description: `
            Trade Id: ${signal.header.id}

            **New Stop loss: \`${signal.body.update_stop_loss}\`**
            `,
            color: 0x999999,
          }]
        }, discordWebhook);
        
        console.log(`Stop loss update sent for trade ${signal.header.id}`);
      }
    } catch (error) {
      console.error("Error sending signal to Discord:", error);
    }
  }
  
  /**
   * Close WebSocket connection and clean up
   */
  close() {
    if (this.socket) {
      this.socket.terminate();
      this.socket = null;
    }
    this.isConnected = false;
    console.log("Market connection closed");
  }
}

// Export a factory function for creating market instances
export default async function createMarket(config = defaultConfig) {
  const market = new CryptoMarket(config);
  await market.initialize();
  return market;
}