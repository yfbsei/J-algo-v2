/**
 * J-Bands Indicator
 * Converted from PineScript implementation
 * Similar to Bollinger Bands with multiple standard deviation levels
 */
import { SMA, BollingerBands } from 'technicalindicators';

/**
 * Calculate J-Bands for price data
 * @param {Object} source - Object containing OHLC price arrays
 * @param {number} period - Period for the SMA calculation (default: 200)
 * @param {Array<number>} stdDevMultipliers - Array of standard deviation multipliers (default: [1, 2, 3])
 * @returns {Object} - Object containing upper and lower bands for each multiplier
 */
const jBands = (source = {}, period = 200, stdDevMultipliers = [1, 2, 3]) => {
    // Validate input data
    if (!source || !source.close || source.close.length < period) {
        console.error(`Missing or insufficient price data for J-Bands calculation. Need at least ${period} data points, got ${source?.close?.length || 0}`);
        return {
            upper1: [], lower1: [],
            upper2: [], lower2: [],
            upper3: [], lower3: [],
            width: [],
            middle: []
        };
    }

    try {
        const close = source.close;
        const result = {
            upper1: [], lower1: [],
            upper2: [], lower2: [],
            upper3: [], lower3: [],
            width: [],
            middle: [] // Add middle band for reference
        };
        
        // Pre-calculate the middle band (SMA of close)
        const smaResult = SMA.calculate({
            period: period,
            values: close
        });
        
        if (smaResult && smaResult.length > 0) {
            result.middle = smaResult;
        }

        // Calculate Bollinger Bands for each standard deviation multiplier
        for (let i = 0; i < stdDevMultipliers.length; i++) {
            const multiplier = stdDevMultipliers[i];
            const bbInput = {
                period: period,
                values: close,
                stdDev: multiplier
            };
            
            const bbResult = BollingerBands.calculate(bbInput);
            
            // Store results for each multiplier
            if (bbResult && bbResult.length > 0) {
                const outputIndex = i + 1; // 1-based index for output
                result[`upper${outputIndex}`] = bbResult.map(band => band.upper);
                result[`lower${outputIndex}`] = bbResult.map(band => band.lower);
                
                // Calculate band width for all bands
                result.width = bbResult.map(band => {
                    // Ensure middle is not zero to avoid division by zero
                    if (band.middle === 0) return 0;
                    return (band.upper - band.lower) / band.middle;
                });
            }
        }
        
        // Ensure all bands have the same length
        const minLength = Math.min(
            ...[
                result.upper1.length, result.lower1.length,
                result.upper2.length, result.lower2.length,
                result.upper3.length, result.lower3.length,
                result.width.length, result.middle.length
            ].filter(len => len > 0)
        );
        
        if (minLength > 0) {
            // Trim all arrays to the same length
            result.upper1 = result.upper1.slice(-minLength);
            result.lower1 = result.lower1.slice(-minLength);
            result.upper2 = result.upper2.slice(-minLength);
            result.lower2 = result.lower2.slice(-minLength);
            result.upper3 = result.upper3.slice(-minLength);
            result.lower3 = result.lower3.slice(-minLength);
            result.width = result.width.slice(-minLength);
            result.middle = result.middle.slice(-minLength);
        }
        
        // Log sample of the data for debugging
        const sampleIndex = Math.floor(minLength / 2);
        if (sampleIndex >= 0) {
            console.log(`J-Bands sample at index ${sampleIndex}:`, {
                middle: result.middle[sampleIndex],
                upper2: result.upper2[sampleIndex],
                lower2: result.lower2[sampleIndex],
                width: result.width[sampleIndex]
            });
        }
        
        return result;
    } catch (error) {
        console.error("Error calculating J-Bands:", error);
        return {
            upper1: [], lower1: [],
            upper2: [], lower2: [],
            upper3: [], lower3: [],
            width: [],
            middle: []
        };
    }
};

export default jBands;