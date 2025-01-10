import { WebSocket } from 'ws';
import binance_candles from '../Util/util.js';
import send_signal from '../Social/Discord/discord-signal.js';

import j_algo from '../j-algo.js';

// TODO multiple coins and bybit

const [coin, timeframe, market, exchange] = ["BTCUSDT", "5m", "futures", "Binance"]; // spot || futures

const
  baseURl = (market === "spot") ? "stream" : "fstream",
  candels = await binance_candles(market, coin, timeframe),
  socket = new WebSocket(`wss://${baseURl}.binance.com/ws/btcusdt@kline_${timeframe}`),
  discord_channel = "https://discord.com/api/webhooks/1246995255341879327/akdKmzKG3n_dt0Cn94DIH0LR9cuVV9XFTCsPhkGcKIr4mttDrc0Ahf5JmxQAVZf4qzASV"; // webhook url

socket.on('message', (event) => {
  const { k } = JSON.parse(event.toString());
        
    if(k.x) {
      const candle = [k.o, k.h, k.l, k.c, k.v];
        
      for(const [i, key] of Object.keys(candels).entries()) {
        candels[key].shift(); // remove single old candle
        candels[key].push(parseFloat(candle[i]));           
      }
      
      const signal = j_algo(candels);

      if(signal) push_signals(coin, timeframe, market, exchange, signal);

    }
});

const push_signals = (coin, timeframe, market, exchange, signal) => {
    
  if(signal.body?.entry) send_signal({
    avatar_url: 'https://yt3.googleusercontent.com/W5i3MAGlRSO-l3ykaKrWtieVp-hHJmufF4wZPxEEKsRz57LTXpLNsLw3gOITAJgLPb8KZ0uv=s160-c-k-c0x00ffffff-no-rj',
    username: 'J-algo v1',
    embeds: [{
    title: `${coin} ${timeframe}in ${market} ${exchange}`,
    description:
    `
    Trade Id: ${signal.header.id}
    Time stamp: ${signal.header.time_stamp}

    *Order type: ${signal.header.order}*
    *Position: \`${signal.header.position}\`*

    **Entry: \`${signal.body.entry}\`**
    **Stop loss: \`${signal.body.stop_loss}\`**
    `,
    color: signal.header.position === "long" ? 0x00FF00 : 0xFF0000,
    //image: {url: ''},
  }]}, discord_channel);

  if(signal.body?.update_stop_loss) send_signal({
    avatar_url: 'https://yt3.googleusercontent.com/W5i3MAGlRSO-l3ykaKrWtieVp-hHJmufF4wZPxEEKsRz57LTXpLNsLw3gOITAJgLPb8KZ0uv=s160-c-k-c0x00ffffff-no-rj',
    username: 'J-algo v1',
    embeds: [{
      title: "Stop loss update",
      description:
      `
      Trade Id: ${signal.header.id}

      **New Stop loss: \`${signal.body.update_stop_loss}\`**
      `,
      color: 0x999999,
    }]}, discord_channel);

}
