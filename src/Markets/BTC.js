import { WebSocket } from 'ws';
import binance_candles from '../Util/util.js';
import jTSv2 from '../Trend-sniper-v2/jTSv2.js';

const
    market = "futures", // spot || futures
    baseURl = (market === "spot") ? "stream" : "fstream",
    candels = await binance_candles(market, "BTCUSDT", "1m"),
    socket = new WebSocket(`wss://${baseURl}.binance.com/ws/btcusdt@kline_1m`);

socket.on('message', (event) => {
    const { k } = JSON.parse(event.toString());
        
    if(k.x) {
        const candle = [k.o, k.h, k.l, k.c, k.v];
        
       for(const [i, key] of Object.keys(candels).entries()) {
        candels[key].shift();
        candels[key].push(parseFloat(candle[i]));           
        }
        
        const signal = jTSv2(candels);
        if(signal) console.log(signal);
    }
    
});
