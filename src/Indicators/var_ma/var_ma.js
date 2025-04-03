import { divide, subtract, multiply, add, abs, round } from 'mathjs';
import { SMA } from 'technicalindicators';

/**
 * Calculate Variable Moving Average
 * @param {Object} source - Object containing OHLC price arrays
 * @param {number} length - Length of the moving average period
 * @returns {Array} - Array of VAR MA values
 */
const variable_moving_average = (source = {}, length = 6) => {
    // Validate input data
    if (!source || !source.close || !source.open || !source.high || !source.low) {
        console.error("Missing required price data in source object");
        return [];
    }

    try {
        const var_ma = [];
    
        // Calculate SMAs for different price components
        const c_sma = SMA.calculate({period: length, values: source.close });
        const o_sma = SMA.calculate({period: length, values: source.open });
        const h_sma = SMA.calculate({period: length, values: source.high });
        const l_sma = SMA.calculate({period: length, values: source.low });

        // Ensure we have calculated values before proceeding
        if (!c_sma.length || !o_sma.length || !h_sma.length || !l_sma.length) {
            console.warn("Not enough data to calculate SMAs");
            return [];
        }

        const close = source.close.slice(-c_sma.length); // same length as close_sma

        for(let i = 0; i < close.length; i++) {
            // Safe division - check for zero divisor
            let lv = 0;
            const highLowDiff = subtract(h_sma[i], l_sma[i]);
            
            if (Math.abs(highLowDiff) > 1e-8) { // Avoid division by zero or very small numbers
                lv = abs(divide(subtract(c_sma[i], o_sma[i]), highLowDiff));
            }
            
            // Previous value with safe fallback
            const prevValue = i > 0 ? var_ma[i-1] : close[0];
            
            // Calculate the variable MA value
            const value = add(
                multiply(lv, close[i]), 
                multiply(subtract(1, lv), prevValue)
            );

            var_ma.push(value); 
        }
        return round(var_ma, 1);
    } catch (error) {
        console.error("Error calculating Variable Moving Average:", error);
        return [];
    }
}

export default variable_moving_average;