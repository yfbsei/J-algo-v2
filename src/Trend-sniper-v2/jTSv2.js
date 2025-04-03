import { divide, subtract, add, round } from 'mathjs';
import { SMA } from 'technicalindicators';
import variable_moving_average from '../Indicators/var_ma/var_ma.js';
import SATR from '../Indicators/j-atr/jATR.js';

/**
 * J-Trend Sniper v2 indicator
 * Based on: https://www.tradingview.com/script/gp70u4Rl-J-Trend-Sniper-v2/
 * 
 * @param {Object} source - Object containing OHLC price arrays
 * @param {number} length - Length for variable MA
 * @param {number} period - Period for ATR calculation
 * @param {number} multiplier - Multiplier for main ATR
 * @param {number} fast_multiplier - Multiplier for fast ATR
 * @returns {Object} - Object containing indicator values and signal
 */
const jTSv2 = (source = {}, length = 6, period = 16, multiplier = 9, fast_multiplier = 5.1) => {
    // Validate input data
    if (!source || !source.close || !source.open || !source.high || !source.low) {
        console.error("Missing required price data in source object");
        return { jATR: [], var_ma: [], jATR_sma: [], fast_jATR_sma: [], signal: false };
    }

    try {
        /* Initialize */
        // Calculate main indicators
        const jATR = SATR(source, period, multiplier);
        const fast_jATR = SATR(source, period, fast_multiplier);
        
        // Return early if we couldn't calculate the indicators
        if (!jATR.length || !fast_jATR.length) {
            return { jATR: [], var_ma: [], jATR_sma: [], fast_jATR_sma: [], signal: false };
        }
        
        const initialVal = 0.0;
        
        // Calculate variable MA and adjust length to match jATR
        let var_ma = variable_moving_average(source, length);
        
        // Ensure we have calculated values
        if (!var_ma.length) {
            return { jATR, var_ma: [], jATR_sma: [], fast_jATR_sma: [], signal: false };
        }
        
        // Ensure var_ma is the same length as jATR (safely)
        if (var_ma.length >= jATR.length) {
            var_ma = var_ma.slice(var_ma.length - jATR.length);
        } else {
            // If var_ma is shorter, pad it to match jATR length
            const padding = Array(jATR.length - var_ma.length).fill(initialVal);
            var_ma = [...padding, ...var_ma];
        }

        /* Logic */
        let jATR_sma = [], fast_jATR_sma = [];

        // Calculate jATR SMA
        for (let i = 0; i < jATR.length; i++) {
            const jATR_val = jATR[i] || initialVal;
            const var_ma_val = var_ma[i] || initialVal;
            
            let value;
            if (jATR_val > var_ma_val) {
                value = subtract(jATR_val, divide(subtract(jATR_val, var_ma_val), 2));
            } else {
                value = add(jATR_val, divide(subtract(var_ma_val, jATR_val), 2));
            }
            
            jATR_sma.push(value);
        } 

        // Calculate fast jATR SMA
        for (let i = 0; i < fast_jATR.length; i++) {
            const fast_jATR_val = fast_jATR[i] || initialVal;
            const var_ma_val = var_ma[i] || initialVal;
            
            let value;
            if (fast_jATR_val > var_ma_val) {
                value = subtract(fast_jATR_val, divide(subtract(fast_jATR_val, var_ma_val), 2));
            } else {
                value = add(fast_jATR_val, divide(subtract(var_ma_val, fast_jATR_val), 2));
            }
            
            fast_jATR_sma.push(value);
        }
        
        // Calculate final jATR SMA using SMA function from library
        const sma_period = 21;
        if (jATR_sma.length >= sma_period) {
            jATR_sma = SMA.calculate({period: sma_period, values: jATR_sma});
        } else {
            jATR_sma = [];
        }

        /* Signal */
        // Get close prices at the same length as jATR
        const close = source.close.slice(source.close.length - jATR.length);
        
        // Initialize signal
        let signal = false;
        
        // Only generate signals if we have enough data points
        if (var_ma.length >= 2 && jATR.length >= 2 && close.length >= 1) {
            // Cross over - bullish signal
            if (var_ma[var_ma.length-1] > jATR[jATR.length-1] && 
                var_ma[var_ma.length-2] <= jATR[jATR.length-2]) {
                signal = {
                    order: "market",
                    position: 'long',
                    location: close[close.length-1] 
                };
            } 
            // Cross under - bearish signal
            else if (var_ma[var_ma.length-1] < jATR[jATR.length-1] && 
                    var_ma[var_ma.length-2] >= jATR[jATR.length-2]) {
                signal = {
                    order: "market",
                    position: 'short',
                    location: close[close.length-1]
                };
            }
        }
            
        /* End */
        return {
            jATR,
            var_ma,
            jATR_sma: jATR_sma.length ? round(jATR_sma, 1) : [],
            fast_jATR_sma: fast_jATR_sma.length ? round(fast_jATR_sma, 1) : [],
            signal
        };
    } catch (error) {
        console.error("Error calculating J-Trend Sniper v2:", error);
        return { jATR: [], var_ma: [], jATR_sma: [], fast_jATR_sma: [], signal: false };
    }
}

export default jTSv2;