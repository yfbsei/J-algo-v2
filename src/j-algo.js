import { v4 as uuidv4 } from 'uuid';
import jTSv2 from './Trend-sniper-v2/jTSv2.js';

/* Global state initialize */
// const trades = [];
let [curr_trade, curr_trend] = [{}, ""];

const j_algo = (source = {}) => {

    /* initialize */
    const {jATR, var_ma, jATR_sma, fast_jATR_sma, signal} = jTSv2(source);
    const curr_jATR = jATR.at(-1);

    /* Stop loss check*/
    if( (curr_trade.header) && ((curr_trade.header?.position === "long" && source.low.at(-1) <= curr_trade.body.stop_loss) || (curr_trade.header?.position === "short" && source.high.at(-1) >= curr_trade.body.stop_loss)) ) {
        //trades.push(curr_trade); // save
        curr_trade = {}; // reset
    }

    /* Stop loss update */
    if( (curr_trade.body) && (Math.trunc(curr_trade.body.stop_loss) !== Math.trunc(curr_jATR)) && (curr_jATR === jATR.at(-20)) ) { // current jATR value is equivalent to the previous 20th value of jATR
        curr_trade.body.stop_loss = curr_jATR;        
        return {
            header: {
                id: curr_trade.header.id
            },

            body: {
                update_stop_loss: curr_trade.body.stop_loss
            }
        };
    }

    
    if(signal) {
    console.log(
        signal
    ) }
    if(!signal) return false; // end at no signal

    /* Template */
    const trade = {
        header: {
            id: uuidv4(),
            time_stamp: new Date().toUTCString(),
            order: signal.order,
            position: signal.position
        },

        body: {
            entry: signal.location,
            stop_loss: curr_jATR,
            take_profit: undefined
        }
    };

    /* Update states */
    //curr_trend = var_ma > jATR ? "up" : "down"; 
    curr_trade = trade;

    /* End */
    return curr_trade;
}

export default j_algo;
