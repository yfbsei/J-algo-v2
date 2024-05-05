import { SMA } from 'technicalindicators';

const variable_moving_average = (source = {}, length = 6) => {
    const 
        var_ma = [],
    
        c_sma = SMA.calculate({period: length, values: source.close }),
        o_sma = SMA.calculate({period: length, values: source.open }),
        h_sma = SMA.calculate({period: length, values: source.high }),
        l_sma = SMA.calculate({period: length, values: source.low }),

        close = source.close.slice(-c_sma.length);

    for(let i = 0; i < c_sma.length; i++) {

      const 
          lv = Math.abs( (c_sma[i] - o_sma[i]) / (h_sma[i] - l_sma[i]) ),
          value = lv * close[i] + (1 - lv) * (var_ma[i-1] || 0.0);

        var_ma.push( Math.round(value * 100) / 100); 
    }
    return var_ma;
}

export default variable_moving_average;