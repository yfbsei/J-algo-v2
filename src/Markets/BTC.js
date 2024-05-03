import { WebSocket } from 'ws';
import binance_candles from '../Util/util.js';
import jTSv2 from '../Trend-sniper-v2/jTSv2.js'


const candels = await binance_candles("BTCUSDT", "1m");
const socket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');

socket.on('message', (event) => {
    const { k } = JSON.parse(event.toString());

    if(k.x) {
        const candle = [k.o, k.h, k.l, k.c, k.v];

        for (let i = 0; i < candels.length; i++) candels[i].shift(), candels[i].push(candle[i]);
        
        const signal = jTSv2(candels);
        if(signal) console.log(signal);
    }
    
});