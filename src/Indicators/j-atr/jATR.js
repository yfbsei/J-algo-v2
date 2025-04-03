import { multiply, subtract, add, round } from 'mathjs';
import { ATR } from 'technicalindicators';

/**
 * Calculate Smoothed ATR (SATR)
 * @param {Object} source - Object containing OHLC price arrays
 * @param {number} period - ATR period
 * @param {number} multiplier - ATR multiplier
 * @returns {Array} - Array of Smoothed ATR values
 */
const SATR = (source = {}, period = 16, multiplier = 9) => {
    // Validate input data
    if (!source || !source.high || !source.low || !source.close) {
        console.error("Missing required price data in source object");
        return [];
    }

    // Ensure data arrays have enough elements
    if (source.high.length < period || source.low.length < period || source.close.length < period) {
        console.warn("Not enough data points to calculate ATR. Need at least", period);
        return [];
    }

    try {
        const defATR = [];

        // Calculate regular ATR
        const aTR = ATR.calculate({
            high: source.high,
            low: source.low,
            close: source.close,
            period: period
        });

        if (!aTR.length) {
            console.warn("ATR calculation returned no values");
            return [];
        }

        // Calculate normalized lines
        const nl = aTR.map(x => multiply(multiplier, x));
        const close = source.close.slice(-nl.length); // same length as nl

        for (let i = 0; i < nl.length; i++) {
            // Safe access to previous values with fallbacks
            const pre_defATR = i > 0 ? defATR[i - 1] : close[0];
            const pre_close = i > 0 ? close[i - 1] : close[0];

            // Logic for determining the ATR value based on price action
            let val;
            
            if (close[i] > pre_defATR && pre_close > pre_defATR) {
                val = Math.max(pre_defATR, subtract(close[i], nl[i]));
            } else if (close[i] < pre_defATR && pre_close < pre_defATR) {
                val = Math.min(pre_defATR, add(close[i], nl[i]));
            } else if (close[i] > pre_defATR) {
                val = subtract(close[i], nl[i]);
            } else {
                val = add(close[i], nl[i]);
            }

            defATR.push(val);
        }
        
        return round(defATR, 1);
    } catch (error) {
        console.error("Error calculating Smoothed ATR:", error);
        return [];
    }
}

export default SATR;