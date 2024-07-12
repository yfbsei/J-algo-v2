import { divide, subtract, add, round } from 'mathjs';
import { SMA } from 'technicalindicators';
import variable_moving_average from '../Indicators/var_ma/var_ma.js';
import SATR from '../Indicators/j-atr/jATR.js';

// https://www.tradingview.com/script/gp70u4Rl-J-Trend-Sniper-v2/
const jTSv2 = (source = {}, length = 6, period = 16, multiplier = 9, fast_multiplier = 5.1) => {
    /* Initialize */
    const 
        jATR = SATR(source, period, multiplier),
        fast_jATR = SATR(source, period, fast_multiplier);
        
        const inital_val = 0.0;
        
        let var_ma = variable_moving_average(source, length); // same length as jATR
        var_ma = var_ma.slice(var_ma.length - jATR.length); // same length as jATR

    /* Logic */
    let jATR_sma = [], fast_jATR_sma = [];

        for (let i = 0; i < jATR.length; i++) {
            const [jATR_val, var_ma_val] = [jATR[i] || inital_val, var_ma[i] || inital_val];
            jATR_sma.push( jATR_val > var_ma_val ? subtract(jATR_val, divide(subtract(jATR_val, var_ma_val), 2)) : add(jATR_val, divide(subtract(var_ma_val, jATR_val), 2)) );
        } 

        for (let i = 0; i < fast_jATR.length; i++) {
            const [fast_jATR_val, var_ma_val] = [fast_jATR[i] || inital_val, var_ma[i] || inital_val];
            fast_jATR_sma.push( fast_jATR_val > var_ma_val ? subtract(fast_jATR_val, divide(subtract(fast_jATR_val, var_ma_val), 2)) : add(fast_jATR_val, divide(subtract(var_ma_val, fast_jATR_val), 2)) );
        }
        
        jATR_sma = SMA.calculate({period: 21, values: jATR_sma}); // length

    /* Signal */
    const close = source.close.slice(source.close.length - jATR.length); // same length as jATR
    
    const signal = 
    (var_ma.at(-1) > jATR.at(-1) && var_ma.at(-2) <= jATR.at(-2)) ? { // (-1) current candle, (-2) previous candle
        order: "market",
        position: 'long', // cross over
        location: close.at(-1) 
    } : 
    (var_ma.at(-1) < jATR.at(-1) && var_ma.at(-2) >= jATR.at(-2)) ? { // (-1) current candle, (-2) previous candle
        order: "market",
        position: 'short', // cross under
        location: close.at(-1)
    } :
    false;
        
    /* End */
    return {
        jATR,
        var_ma,
        jATR_sma: round(jATR_sma, 1),
        fast_jATR_sma: round(fast_jATR_sma, 1),
        signal
    };
}

export default jTSv2;
