// https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/Kline-Candlestick-Data

const binance_candles = async (market = "spot" || "futures", symbol = "BTCUSDT", interval = "1m", limit = 400) => {
    const 
        baseURL = (market === "spot") ? "api.binance.com/api/v3" : "fapi.binance.com/fapi/v1",
        response = await fetch(`https://${baseURL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit + 1}`),
        data = await response.json();
    
    data.pop(); // remove un-closed candle    
    
    return data.reduce((total, val, i) => {
        total.open[i] = parseFloat(val[1]);
        total.high[i] = parseFloat(val[2]); 
        total.low[i] = parseFloat(val[3]);
        total.close[i] = parseFloat(val[4]);
        total.volume[i] = parseFloat(val[5]);
        return total;
    }, {open:[], high:[], low:[], close:[], volume:[]} );

}

export default binance_candles;
