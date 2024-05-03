// https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/Kline-Candlestick-Data

const binance_candles = async (symbol = "BTCUSDT", interval = "5m", limit = 200) => {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit + 1}`);
    const data = await response.json();

    return data.reduce((total, val, i) => {
        total.open[i] = val[1];
        total.high[i] = val[2]; 
        total.low[i] = val[3];
        total.close[i] = val[4];
        total.volume[i] = val[5];
        return total;
    }, {open:[], high:[], low:[], close:[], volume:[]} );

}

export default binance_candles;