import { divide, subtract, multiply, add, abs, round } from 'mathjs';
import { SMA } from 'technicalindicators';

const variable_moving_average = (source = {}, length = 6) => {
    const 
        var_ma = [],
    
        c_sma = SMA.calculate({period: length, values: source.close }),
        o_sma = SMA.calculate({period: length, values: source.open }),
        h_sma = SMA.calculate({period: length, values: source.high }),
        l_sma = SMA.calculate({period: length, values: source.low }),

        close = source.close.slice(-c_sma.length); // same length as close_sma

    for(let i = 0; i < close.length; i++) {
      const 
          lv = abs( divide(subtract(c_sma[i], o_sma[i]), subtract(h_sma[i], l_sma[i])) ), 
          value = add( multiply(lv, close[i]), multiply(subtract(1, lv), (var_ma[i-1] || 0.0)) );

        var_ma.push(value); 
    }
    return round(var_ma, 1);
}

export default variable_moving_average;