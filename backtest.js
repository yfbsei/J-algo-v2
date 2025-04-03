import fs from 'fs/promises';
import j_algo from './src/j-algo.js';
import jTSv2 from './src/Trend-sniper-v2/jTSv2.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Backtesting script for the J-Trading-Algo
 */

/**
 * Load historical candle data from a file
 * @param {string} filePath - Path to the data file
 * @returns {Object} - OHLC data object
 */
async function loadHistoricalData(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data.trim().split('\n');
    
    // Skip header line if present
    const startIdx = lines[0].includes('timestamp') || lines[0].includes('time') ? 1 : 0;
    
    const candles = {
      open: [],
      high: [],
      low: [],
      close: [],
      volume: []
    };
    
    for (let i = startIdx; i < lines.length; i++) {
      const fields = lines[i].split(',');
      
      // Assuming format: timestamp,open,high,low,close,volume
      candles.open.push(parseFloat(fields[1]));
      candles.high.push(parseFloat(fields[2]));
      candles.low.push(parseFloat(fields[3]));
      candles.close.push(parseFloat(fields[4]));
      candles.volume.push(parseFloat(fields[5]));
    }
    
    return candles;
  } catch (error) {
    console.error('Error loading historical data:', error);
    throw error;
  }
}

/**
 * Run backtest on historical data
 * @param {Object} candles - OHLC data object
 * @returns {Object} - Backtest results
 */
function runBacktest(candles) {
  // Validation
  if (!candles || !candles.close || candles.close.length < 50) {
    throw new Error('Insufficient data for backtest');
  }
  
  console.log(`Running backtest on ${candles.close.length} candles`);
  
  // Create a window size to simulate real-time processing
  const windowSize = 200; // Number of candles to include in each window
  const signals = [];
  const trades = [];
  
  let activePosition = null;
  
  // Simulate processing data as it would arrive in real-time
  for (let i = windowSize; i < candles.close.length; i++) {
    // Create a window of data
    const dataWindow = {
      open: candles.open.slice(i - windowSize, i),
      high: candles.high.slice(i - windowSize, i),
      low: candles.low.slice(i - windowSize, i),
      close: candles.close.slice(i - windowSize, i),
      volume: candles.volume.slice(i - windowSize, i)
    };
    
    // Process the window through the algorithm
    const signal = j_algo(dataWindow);
    
    // Check for stop loss hits
    if (activePosition) {
      const isLong = activePosition.position === 'long';
      const isShort = activePosition.position === 'short';
      const currentLow = candles.low[i];
      const currentHigh = candles.high[i];
      
      if ((isLong && currentLow <= activePosition.stopLoss) || 
          (isShort && currentHigh >= activePosition.stopLoss)) {
        // Stop loss hit
        trades.push({
          ...activePosition,
          exitPrice: activePosition.stopLoss,
          exitTime: i,
          result: 'stop_loss',
          profit: isLong ? 
            (activePosition.stopLoss - activePosition.entryPrice) : 
            (activePosition.entryPrice - activePosition.stopLoss),
          percentProfit: isLong ?
            ((activePosition.stopLoss / activePosition.entryPrice) - 1) * 100 :
            ((activePosition.entryPrice / activePosition.stopLoss) - 1) * 100
        });
        
        activePosition = null;
      }
      // Check for take profit hits
      else if (activePosition.takeProfit && 
              ((isLong && currentHigh >= activePosition.takeProfit) ||
               (isShort && currentLow <= activePosition.takeProfit))) {
        // Take profit hit
        trades.push({
          ...activePosition,
          exitPrice: activePosition.takeProfit,
          exitTime: i,
          result: 'take_profit',
          profit: isLong ?
            (activePosition.takeProfit - activePosition.entryPrice) :
            (activePosition.entryPrice - activePosition.takeProfit),
          percentProfit: isLong ?
            ((activePosition.takeProfit / activePosition.entryPrice) - 1) * 100 :
            ((activePosition.entryPrice / activePosition.takeProfit) - 1) * 100
        });
        
        activePosition = null;
      }
    }
    
    // Check for new signals
    if (signal && signal.body?.entry) {
      signals.push({
        time: i,
        price: signal.body.entry,
        type: signal.header.position
      });
      
      // Close any existing position if we get a signal in the opposite direction
      if (activePosition && activePosition.position !== signal.header.position) {
        const currentPrice = signal.body.entry;
        const isLong = activePosition.position === 'long';
        
        trades.push({
          ...activePosition,
          exitPrice: currentPrice,
          exitTime: i,
          result: 'signal_reverse',
          profit: isLong ?
            (currentPrice - activePosition.entryPrice) :
            (activePosition.entryPrice - currentPrice),
          percentProfit: isLong ?
            ((currentPrice / activePosition.entryPrice) - 1) * 100 :
            ((activePosition.entryPrice / currentPrice) - 1) * 100
        });
        
        activePosition = null;
      }
      
      // Create new position if none exists
      if (!activePosition) {
        activePosition = {
          entryTime: i,
          entryPrice: signal.body.entry,
          position: signal.header.position,
          stopLoss: signal.body.stop_loss,
          takeProfit: signal.body.take_profit || null
        };
      }
    }
    
    // Update stop loss if we have an update signal
    if (signal && signal.body?.update_stop_loss && activePosition) {
      activePosition.stopLoss = signal.body.update_stop_loss;
    }
  }
  
  // Close any remaining open position at the end of the test
  if (activePosition) {
    const finalPrice = candles.close[candles.close.length - 1];
    const isLong = activePosition.position === 'long';
    
    trades.push({
      ...activePosition,
      exitPrice: finalPrice,
      exitTime: candles.close.length - 1,
      result: 'test_end',
      profit: isLong ?
        (finalPrice - activePosition.entryPrice) :
        (activePosition.entryPrice - finalPrice),
      percentProfit: isLong ?
        ((finalPrice / activePosition.entryPrice) - 1) * 100 :
        ((activePosition.entryPrice / finalPrice) - 1) * 100
    });
  }
  
  return { signals, trades };
}

/**
 * Calculate performance metrics from backtest results
 * @param {Object} results - Backtest results
 * @returns {Object} - Performance metrics
 */
function calculatePerformance(results) {
  const { trades } = results;
  
  if (!trades.length) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      averageTrade: 0
    };
  }
  
  // Calculate various metrics
  const winners = trades.filter(t => t.profit > 0);
  const losers = trades.filter(t => t.profit <= 0);
  
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const grossProfit = winners.reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.profit, 0));
  
  // Calculate drawdown
  let maxBalance = 0;
  let maxDrawdown = 0;
  let currentBalance = 0;
  
  trades.forEach(trade => {
    currentBalance += trade.profit;
    maxBalance = Math.max(maxBalance, currentBalance);
    const drawdown = maxBalance - currentBalance;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });
  
  return {
    totalTrades: trades.length,
    winRate: (winners.length / trades.length) * 100,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    totalProfit,
    maxDrawdown,
    averageTrade: totalProfit / trades.length,
    averageWinner: winners.length ? grossProfit / winners.length : 0,
    averageLoser: losers.length ? -grossLoss / losers.length : 0,
    longTrades: trades.filter(t => t.position === 'long').length,
    shortTrades: trades.filter(t => t.position === 'short').length
  };
}

/**
 * Main backtest function
 * @param {string} filePath - Path to historical data file
 */
async function main(filePath) {
  try {
    console.log(`Starting backtest using data from ${filePath}`);
    
    // Load historical data
    const candles = await loadHistoricalData(filePath);
    console.log(`Loaded ${candles.close.length} candles for backtest`);
    
    // Run backtest
    const results = runBacktest(candles);
    console.log(`Generated ${results.signals.length} signals and ${results.trades.length} trades`);
    
    // Calculate performance
    const performance = calculatePerformance(results);
    
    // Display results
    console.log('\n===== BACKTEST RESULTS =====');
    console.log(`Total trades: ${performance.totalTrades}`);
    console.log(`Win rate: ${performance.winRate.toFixed(2)}%`);
    console.log(`Profit factor: ${performance.profitFactor.toFixed(2)}`);
    console.log(`Total profit: ${performance.totalProfit.toFixed(2)}`);
    console.log(`Average trade: ${performance.averageTrade.toFixed(2)}`);
    console.log(`Max drawdown: ${performance.maxDrawdown.toFixed(2)}`);
    console.log(`Long trades: ${performance.longTrades}`);
    console.log(`Short trades: ${performance.shortTrades}`);
    console.log('============================\n');
    
    // Save detailed results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(
      `backtest-results-${timestamp}.json`,
      JSON.stringify({ results, performance }, null, 2)
    );
    
    console.log(`Detailed results saved to backtest-results-${timestamp}.json`);
  } catch (error) {
    console.error('Backtest failed:', error);
  }
}

// Run backtest if this file is executed directly
if (process.argv[1].includes('backtest.js')) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Please provide a path to historical data file');
    console.log('Usage: node backtest.js path/to/data.csv');
    process.exit(1);
  }
  
  main(filePath);
}

export { loadHistoricalData, runBacktest, calculatePerformance };