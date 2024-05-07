import { WebSocket } from 'ws';
import binance_candles from '../Util/util.js';
import jTSv2 from '../Trend-sniper-v2/jTSv2.js';

import send_signal from '../Social/Discord/discord-signal.js';

// TODO multiple coins and bybit

const [coin, timeframe, market, exchange] = ["BTCUSDT", "1m", "futures", "Binance"]; // spot || futures

const
  baseURl = (market === "spot") ? "stream" : "fstream",
  candels = await binance_candles(market, coin, timeframe),
  socket = new WebSocket(`wss://${baseURl}.binance.com/ws/btcusdt@kline_${timeframe}`);

socket.on('message', (event) => {
  const { k } = JSON.parse(event.toString());
        
    if(k.x) {
      const candle = [k.o, k.h, k.l, k.c, k.v];
        
      for(const [i, key] of Object.keys(candels).entries()) {
        candels[key].shift();
        candels[key].push(parseFloat(candle[i]));           
      }
       
      const signal = jTSv2(candels);

      if(signal) send_signal({
        avatar_url: 'https://yt3.googleusercontent.com/W5i3MAGlRSO-l3ykaKrWtieVp-hHJmufF4wZPxEEKsRz57LTXpLNsLw3gOITAJgLPb8KZ0uv=s160-c-k-c0x00ffffff-no-rj',
        username: 'J-algo',
        embeds: [{
        title: `${coin} _ ${timeframe}inute _ ${market} _ ${exchange}`,
        description: 
        `
        Order type: ${signal.order}
        Position: ${signal.position}
        Entry: ${signal.entry} 
        `,
        color: signal.position === "long" ? 0x00FF00 : 0xFF0000,
        //image: {url: ''},
      }]}, "https://discord.com/api/webhooks/1237128102308610140/-7U_KE7g7oJVfT1Wpx7f4dKYU1ljS5y03oSMVylJCdfyHiLMIQmGPifzHXdb0Qcn9r1n"); // webhook url
    }
});
