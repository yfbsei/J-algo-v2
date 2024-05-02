import { SMA } from 'technicalindicators';
import variable_moving_average from '../Indicators/var_ma/var_ma.js';
import SATR from '../Indicators/j-atr/jATR.js';

const jTSv2 = (source = {}, length = 6, period = 16, multiplier = 9, fast_multiplier = 5.1) => {
    /* Initialize */
    const 
        jATR = SATR(source, period, multiplier),
        fast_jATR = SATR(source, period, fast_multiplier),
        var_ma = variable_moving_average(source, length).slice(-jATR.length); // needs to be same length as jATR

    /* Logic */
    let jATR_sma = [], fast_jATR_sma = [];

        for (let i = 0; i < jATR.length; i++) {
            const [jATR_val, var_ma_val] = [jATR[i], var_ma[i]];
            jATR_sma.push( jATR_val > var_ma_val ? jATR_val - (jATR_val - var_ma_val) / 2 : jATR_val + (var_ma_val - jATR_val) / 2 );
        }

        for (let i = 0; i < fast_jATR.length; i++) {
            const [fast_jATR_val, var_ma_val] = [fast_jATR[i], var_ma[i]];
            fast_jATR_sma.push( fast_jATR_val > var_ma_val ? fast_jATR_val - (fast_jATR_val - var_ma_val) / 2 : fast_jATR_val + (var_ma_val - fast_jATR_val) / 2 );
        }
        
        jATR_sma = SMA.calculate({period: 21, values: jATR_sma}).map(x => Math.round(x * 100) / 100);
        fast_jATR_sma = SMA.calculate({period: 9, values: fast_jATR_sma}).map(x => Math.round(x * 100) / 100);

    /* Signal */
    const close = source.close.slice(-jATR.length);
    
    const signal = 
    (var_ma[var_ma.length-1] > jATR[jATR.length-1] && var_ma[var_ma.length-2] <= jATR[jATR.length-2]) ? ['long', close[close.length-1]] : // cross over
    (var_ma[var_ma.length-1] < jATR[jATR.length-1] && var_ma[var_ma.length-2] >= jATR[jATR.length-2]) ? ['short', close[close.length-1]] : // cross under
    false;
        
    /* End */
    return signal;
} 



const candlestick = async (symbol = "BTCUSDT", interval = "1m", limit = 200) => {
    let response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit + 1}`);
    let data = await response.json();

      //Open High Low close
    const candle = data.map(x => [x[1], x[2], x[3], x[4]]).map(x => x.map(y => Number(y)) );
    candle.pop();


    return {
      open: candle.map(o => o[0]),
      high: candle.map(h => h[1]),
      low: candle.map(l => l[2]),
      close: candle.map(c => c[3]),
    }
}

const x = await candlestick();


console.log( jTSv2(x) )