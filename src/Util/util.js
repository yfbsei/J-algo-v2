/**
 * Utility functions for fetching and processing market data
 * https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/Kline-Candlestick-Data
 */

/**
 * Maximum retry attempts for API calls
 * @type {number}
 */
const MAX_RETRIES = 3;

/**
 * Fetches candlestick data from Binance API
 * @param {string} market - Market type: "spot" or "futures"
 * @param {string} symbol - Trading pair symbol e.g. "BTCUSDT"
 * @param {string} interval - Candlestick interval e.g. "5m"
 * @param {number} limit - Number of candles to fetch
 * @returns {Promise<Object>} - Promise resolving to OHLCV data object
 */
const binance_candles = async (market = "spot", symbol = "BTCUSDT", interval = "5m", limit = 400) => {
    // Validate parameters
    if (market !== "spot" && market !== "futures") {
        throw new Error('Market must be either "spot" or "futures"');
    }
    
    if (!symbol || !interval) {
        throw new Error("Symbol and interval are required parameters");
    }
    
    // Initialize retry counter
    let retries = 0;
    let lastError = null;
    
    // Setup base URLs based on market type
    const baseURL = (market === "spot") 
        ? "api.binance.com/api/v3" 
        : "fapi.binance.com/fapi/v1";
    
    while (retries < MAX_RETRIES) {
        try {
            // Make API request
            const response = await fetch(
                `https://${baseURL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit + 1}`,
                {
                    headers: {
                        'User-Agent': 'J-Trading-Algo/1.0.0'
                    },
                    timeout: 10000 // 10 second timeout
                }
            );
            
            // Check for HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Binance API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            // Parse response data
            const data = await response.json();
            
            // Validate response data
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error("Invalid or empty response from Binance API");
            }
            
            // Remove the last (unclosed) candle
            data.pop();
            
            // Check if we have enough data
            if (data.length === 0) {
                console.warn(`No closed candles returned for ${symbol}/${interval}`);
                return {open:[], high:[], low:[], close:[], volume:[]};
            }
            
            // Process candle data into OHLCV format
            return data.reduce((total, val, i) => {
                // Safely parse float values with fallbacks for invalid data
                total.open[i] = parseFloat(val[1]) || 0;
                total.high[i] = parseFloat(val[2]) || 0; 
                total.low[i] = parseFloat(val[3]) || 0;
                total.close[i] = parseFloat(val[4]) || 0;
                total.volume[i] = parseFloat(val[5]) || 0;
                return total;
            }, {open:[], high:[], low:[], close:[], volume:[]} );
            
        } catch (error) {
            // Track the error
            lastError = error;
            console.error(`Attempt ${retries + 1}/${MAX_RETRIES} failed:`, error);
            
            // Implement exponential backoff for retries
            retries++;
            if (retries < MAX_RETRIES) {
                const backoffTime = 1000 * Math.pow(2, retries); // Exponential backoff: 2s, 4s, 8s...
                console.log(`Retrying in ${backoffTime/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }
    
    // If we've exhausted retries, throw the last error
    throw lastError || new Error("Failed to fetch candle data after multiple attempts");
}

export default binance_candles;