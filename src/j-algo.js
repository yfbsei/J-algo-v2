import { v4 as uuidv4 } from 'uuid';
import jTSv2 from './Trend-sniper-v2/jTSv2.js';

/**
 * J-Algo Trading Algorithm
 * Manages trade signals and stop loss updates
 */
class JAlgo {
    constructor() {
        this.currentTrade = {};
        this.currentTrend = "";
        this.trades = []; // History of closed trades
    }

    /**
     * Process price data and generate/manage trade signals
     * @param {Object} source - Object containing OHLC price arrays
     * @returns {Object|boolean} - Trade signal or false if no signal
     */
    process(source = {}) {
        // Validate input data
        if (!source || !source.close || !source.high || !source.low) {
            console.error("Missing required price data in source object");
            return false;
        }

        try {
            // Get indicator values from jTSv2
            const {jATR, var_ma, jATR_sma, fast_jATR_sma, signal} = jTSv2(source);
            
            // Check if we have valid indicator values
            if (!jATR || !jATR.length) {
                console.warn("Invalid jATR data");
                return false;
            }
            
            const currentJATR = jATR[jATR.length - 1];
            
            // Stop loss check - check if price hit stop loss
            if (this.currentTrade.header) {
                const isLong = this.currentTrade.header.position === "long";
                const isShort = this.currentTrade.header.position === "short";
                const lastLow = source.low[source.low.length - 1];
                const lastHigh = source.high[source.high.length - 1];
                
                if ((isLong && lastLow <= this.currentTrade.body.stop_loss) || 
                    (isShort && lastHigh >= this.currentTrade.body.stop_loss)) {
                    
                    // Add trade to history with stop loss hit status
                    const closedTrade = {
                        ...this.currentTrade,
                        closeReason: "stop_loss",
                        closeTime: new Date().toUTCString(),
                        closePrice: isLong ? this.currentTrade.body.stop_loss : this.currentTrade.body.stop_loss
                    };
                    
                    this.trades.push(closedTrade);
                    this.currentTrade = {}; // Reset current trade
                    
                    // Log the stop loss hit
                    console.log("Stop loss hit:", closedTrade);
                }
            }
            
            // Stop loss update - update stop loss if price moved significantly
            if (this.currentTrade.body && 
                jATR.length >= 20 && 
                Math.abs(this.currentTrade.body.stop_loss - currentJATR) > 0.01) {
                
                // Use a more reliable condition: significant change in price
                const lastClose = source.close[source.close.length - 1];
                const trailingStopDist = jATR[jATR.length - 20] * 0.5; // Use half of the ATR from 20 bars ago
                
                // Check if there's been significant price movement to warrant stop adjustment
                const shouldUpdateStop = (
                    (this.currentTrade.header.position === "long" && 
                    lastClose - this.currentTrade.body.stop_loss > trailingStopDist) ||
                    (this.currentTrade.header.position === "short" && 
                    this.currentTrade.body.stop_loss - lastClose > trailingStopDist)
                );
                
                if (shouldUpdateStop) {
                    // Update the stop loss
                    const oldStopLoss = this.currentTrade.body.stop_loss;
                    this.currentTrade.body.stop_loss = currentJATR;
                    
                    console.log("Updating stop loss from", oldStopLoss, "to", currentJATR);
                    
                    return {
                        header: {
                            id: this.currentTrade.header.id
                        },
                        body: {
                            update_stop_loss: this.currentTrade.body.stop_loss
                        }
                    };
                }
            }
            
            // If we have a signal, log it
            if (signal) {
                console.log("New signal:", signal);
            }
            
            // If no signal, end here
            if (!signal) {
                return false;
            }
            
            // Create new trade from signal
            const trade = {
                header: {
                    id: uuidv4(),
                    time_stamp: new Date().toUTCString(),
                    order: signal.order,
                    position: signal.position
                },
                
                body: {
                    entry: signal.location,
                    stop_loss: currentJATR,
                    take_profit: this.calculateTakeProfit(signal.location, currentJATR, signal.position)
                }
            };
            
            // Update trend state
            this.currentTrend = var_ma[var_ma.length - 1] > jATR[jATR.length - 1] ? "up" : "down";
            
            // Update current trade
            this.currentTrade = trade;
            
            return trade;
        } catch (error) {
            console.error("Error in j-algo processing:", error);
            return false;
        }
    }
    
    /**
     * Calculate take profit level based on entry, stop loss, and position
     * @param {number} entry - Entry price
     * @param {number} stopLoss - Stop loss price
     * @param {string} position - Trade position ('long' or 'short')
     * @returns {number} - Take profit price
     */
    calculateTakeProfit(entry, stopLoss, position) {
        const riskAmount = Math.abs(entry - stopLoss);
        // 2:1 reward-to-risk ratio
        return position === 'long' 
            ? entry + (riskAmount * 2) 
            : entry - (riskAmount * 2);
    }
    
    /**
     * Get current trade status
     * @returns {Object} - Current trade object
     */
    getCurrentTrade() {
        return this.currentTrade;
    }
    
    /**
     * Get trade history
     * @returns {Array} - Array of closed trades
     */
    getTradeHistory() {
        return this.trades;
    }
}

// Create singleton instance
const jAlgoInstance = new JAlgo();

/**
 * Wrapper function to maintain compatibility with existing code
 * @param {Object} source - Object containing OHLC price arrays
 * @returns {Object|boolean} - Trade signal or false if no signal
 */
const j_algo = (source = {}) => {
    return jAlgoInstance.process(source);
};

export default j_algo;