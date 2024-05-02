import { ATR } from 'technicalindicators';

const SATR = (source = {}, period = 16, multiplier = 9) => {
	const
		defATR = [],

		aTR = ATR.calculate({
			high: source.high,
			low: source.low,
			close: source.close,
			period: period
		}),

		nl = aTR.map(x => multiplier * x), // JS precision inaccurate, up to .4 
		close = source.close.slice(-nl.length);

	for (let i = 0; i < nl.length; i++) {
		const
			pre_defATR = defATR[i - 1] || 0.0,
			pre_close = close[i - 1] || 0.0,

		    val = 
                (close[i] > pre_defATR && pre_close > pre_defATR) ? Math.max(pre_defATR, close[i] - nl[i]) :
			    (close[i] < pre_defATR && pre_close < pre_defATR) ? Math.min(pre_defATR, close[i] + nl[i]) :
			    (close[i] > pre_defATR) ? close[i] - nl[i] :
			    close[i] + nl[i];

		defATR.push(val);
	}
	return defATR.map(x => Math.round(x * 100) / 100);
}

export default SATR;