// File: pages/top5.js

import Head from 'next/head';
import Script from 'next/script';
import { verifyUser } from '../lib/auth'; // Your custom authentication function

// 1. Server-side check: Only serve if user is premium
export async function getServerSideProps(context) {
  const { req } = context;
  const user = await verifyUser(req); // e.g. validate a cookie or JWT

  if (!user || !user.isPremium) {
    // Redirect to /login or wherever you handle unauthorized access
    return {
      redirect: {
        destination: '/login?error=access_denied',
        permanent: false,
      },
    };
  }

  // If user is premium, proceed
  return { props: { user } };
}

export default function Top5Page({ user }) {
  return (
    <>
      {/* 2. <Head> replaces <head> in Next.js */}
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Top Stocks Scanner (Premium)</title>

        {/* Inline CSS from your <style> block */}
        <style>{`
          :root {
            --primary-bg: #111;
            --secondary-bg: #333;
            --accent-color: #16a34a;
            --text-color: #fff;
            --font-family: 'Arial', sans-serif;
            --transition-speed: 0.3s;
            --progress-bar-bg: #222;
            --progress-fill-color: #06b6d4;
          }
          body {
            font-family: var(--font-family);
            background-color: var(--primary-bg);
            color: var(--text-color);
            margin: 0 auto;
            line-height: 1.6;
            max-width: 900px;
            padding: 2rem;
          }
          #techChart, #rriChart {
            margin-top: 20px;
            width: 100%;
            height: 600px;
            box-sizing: border-box;
          }
          @media screen and (max-width: 768px) {
            #techChart, #rriChart {
              height: 350px;
            }
          }
          button.backBtn {
            background: var(--accent-color);
            margin-bottom: 20px;
          }
          #status {
            max-height: 300px;
            overflow-y: auto;
            overflow-x: auto;
          }
          h1 {
            margin-bottom: 1rem;
            text-align: center;
            font-weight: 600;
          }
          p { margin-bottom: 1rem; }
          label, input, select {
            display: block;
            margin: 0.3rem 0;
            font-size: 1rem;
          }
          .param-section {
            border: 1px solid #444;
            background-color: var(--secondary-bg);
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
          }
          button {
            font-size: 1rem;
            padding: 0.5rem 1rem;
            cursor: pointer;
            margin-bottom: 1rem;
            border: none;
            border-radius: 4px;
            background: var(--accent-color);
            color: var(--text-color);
            transition: background var(--transition-speed), transform 0.2s ease;
          }
          button:hover {
            background: #1e3a8a;
            transform: scale(1.05);
          }
          #status {
            margin-top: 1rem;
            white-space: pre-wrap;
            font-family: monospace;
            background: var(--secondary-bg);
            padding: 1rem;
            border: 1px solid #444;
            border-radius: 4px;
            max-height: 300px;
            overflow-y: auto;
          }
          #progressContainer {
            margin-top: 1rem;
            display: none;
            background-color: var(--secondary-bg);
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
            position: relative;
          }
          #progressLabel {
            font-size: 1.2rem;
            margin-bottom: 10px;
            color: #bbb;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .progress-bar-base {
            width: 100%;
            background-color: var(--progress-bar-bg);
            border-radius: 10px;
            height: 24px;
            overflow: hidden;
            position: relative;
            margin-bottom: 0.5rem;
          }
          .progress-bar-fill {
            height: 100%;
            width: 0;
            background-color: var(--progress-fill-color);
            transition: width var(--transition-speed) ease-in-out;
          }
          .progress-bar-text {
            position: absolute;
            width: 100%;
            top: 0;
            height: 100%;
            text-align: center;
            line-height: 24px;
            font-weight: bold;
            color: #fff;
          }
          .score-positive { color: #00ff00; }
          .score-negative { color: #ff2d2d; }
          #techDetails {
            margin-top: 10px;
            font-weight: bold;
          }
          #rriSection {
            margin-top: 20px;
            padding: 20px;
            border: 1px solid #444;
            border-radius: 4px;
            background-color: var(--secondary-bg);
            display: none;
          }
          #rriChart {
            margin-top: 20px;
            height: 400px;
          }
          #rriDetails {
            margin-top: 10px;
            font-weight: bold;
          }
          #rriSliderSection {
            margin-top: 20px;
          }
          #rriSliderSection input[type="range"] {
            width: 100%;
            margin: 10px 0;
          }
          #sliderValue {
            margin-left: 10px;
          }
          #rriProb {
            margin-top: 5px;
            font-weight: bold;
          }
        `}</style>
      </Head>

      {/* 3. External Scripts (Highcharts, math.js) */}
      <Script
        src="https://code.highcharts.com/highcharts.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/10.6.4/math.min.js"
        strategy="beforeInteractive"
      />

      {/* 4. Your Premium Page Content (formerly <body>) */}
      <div>
        {/* The back button */}
        <button onClick={() => (window.location.href = 'https://www.intuitiontrades.com')}>
          Back to Main Page
        </button>

        <h1>Top Stocks Scanner (Premium)</h1>

        <p>
          This tool evaluates each ticker using 6 total signals:
          Risk vs Reward, Technical, Sentiment, Insider, Fundamental, and Congress.
          If “Use Manual Weights &amp; Scaling” is unchecked, it auto-detects SPY’s market regime
          (Bull/Bear/Neutral) and picks a weighting distribution. If checked, you can pick Bear/Neutral/Bull
          to auto-fill – or override any. At the end, it highlights the top 5 and bottom 5 aggregator scores.
        </p>

        {/* Manual Weights & Scaling */}
        <div className="param-section">
          <label>
            <input type="checkbox" id="manualModeCheckbox" />
            Use Manual Weights &amp; Scaling
          </label>
          <div id="manualInputs" style={{ display: 'none' }}>
            <label>
              Select Market Regime (for quick auto-fill):
              <select id="marketRegimeSelect">
                <option value="Neutral">Neutral</option>
                <option value="Bull">Bull</option>
                <option value="Bear">Bear</option>
              </select>
            </label>
            <label>
              RRI Weight (0..1):
              <input type="number" id="wRRI" defaultValue="0.15" min="0" max="1" step="0.01" />
            </label>
            <label>
              Technical Weight (0..1):
              <input type="number" id="wTech" defaultValue="0.20" min="0" max="1" step="0.01" />
            </label>
            <label>
              Sentiment Weight (0..1):
              <input type="number" id="wSent" defaultValue="0.15" min="0" max="1" step="0.01" />
            </label>
            <label>
              Insider Weight (0..1):
              <input type="number" id="wInsider" defaultValue="0.15" min="0" max="1" step="0.01" />
            </label>
            <label>
              Fundamental Weight (0..1):
              <input type="number" id="wFund" defaultValue="0.20" min="0" max="1" step="0.01" />
            </label>
            <label>
              Congress Weight (0..1):
              <input type="number" id="wCongress" defaultValue="0.15" min="0" max="1" step="0.01" />
            </label>
            <label>
              Overall Scaling Factor:
              <input type="number" id="scalingFactor" defaultValue="2.00" step="0.01" />
            </label>
          </div>
        </div>

        {/* Index Selection */}
        <div className="param-section">
          <label>
            Select Index:
            <select id="indexSelect">
              <option value="">-- Select an Index --</option>
              <option value="sp500">SP500</option>
              <option value="russell3000">Russell 3000</option>
              <option value="vti">VTI</option>
            </select>
          </label>
        </div>

        {/* Investment Timeframe */}
        <div className="param-section">
          <label>
            Investment Timeframe:
            <select id="investmentTimeframe">
              <option value="">-- Select Timeframe --</option>
              <option value="short">Short Term</option>
              <option value="medium">Medium Term</option>
              <option value="long">Long Term</option>
            </select>
          </label>
        </div>

        <div id="status"></div>
        <button onClick={() => window.runBatchAnalysis()}>Run Batch Analysis</button>

        <div id="progressContainer">
          <div id="progressLabel">Scanning Companies...</div>
          <div className="progress-bar-base">
            <div id="progressBarFill" className="progress-bar-fill"></div>
            <div id="progressBarText" className="progress-bar-text">0%</div>
          </div>
        </div>

        {/* Container for technical chart and details */}
        <div id="techChart"></div>
        <div id="techDetails"></div>

        {/* Risk vs Reward Index Section */}
        <div id="rriSection">
          <h2>Risk vs Reward Index (dbHJ Model)</h2>
          <div id="rriChart"></div>
          <div id="rriDetails"></div>
          <div id="rriSliderSection"></div>
        </div>
      </div>

      {/* 5. Inline scripts: we place all your JavaScript inside a single <Script>
          We'll attach these functions to window.* so we can call them from onClick, etc. */}
      <Script id="top5-inline-code" strategy="afterInteractive">{`
        // === BEGIN inline script code ===

        // Expose certain functions globally so your HTML can call them:
        window.runBatchAnalysis = runBatchAnalysis;
        window.updateRRISlider = updateRRISlider;

        // Your entire JS code from <script> goes here, EXACTLY as is,
        // except we have to ensure all top-level functions are defined on window or are accessible.
        // We'll wrap them so you can keep them as is, but we'll also define them on window if needed.

        const { create, all } = math;
        const mathInstance = create(all);

        function logStatus(msg){
          const s = document.getElementById("status");
          s.innerHTML += msg + "<br>";
          s.scrollTop = s.scrollHeight;
        }
        function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
        function parseAlphaDate(str){
          const year  = str.substring(0,4);
          const month = str.substring(4,6);
          const day   = str.substring(6,8);
          const hour  = str.substring(9,11) || "00";
          const min   = str.substring(11,13) || "00";
          const sec   = str.substring(13,15) || "00";
          return new Date(\`\${year}-\${month}-\${day}T\${hour}:\${min}:\${sec}Z\`);
        }

        // ... All your existing utility, fetch, chart, computeX, etc. code ...
        // Copy/paste the rest EXACTLY from your script block:
        // (Below is the entire code from your original script, unmodified,
        //  except we remove "import { verifyUser }..." or references to top5.js
        //  because we already have that in getServerSideProps.)

        /*----------------------------------------------------------------
          The remainder of your code, from "Loading Tickers..." to the end
          is appended here. 
          Make sure each function is declared in the same scope or assigned 
          to window.* if you need them globally.
        ----------------------------------------------------------------*/
        
        
        // *** PLACE THE REMAINDER OF YOUR EXACT "script" CODE BELOW: ***

        // For brevity, I'll collapse some repeated code. 
        // But you would literally copy everything from "Loading Tickers" 
        // down to "}" of runBatchAnalysis().

        // Example:
        window.predeterminedTickers = [];
        async function loadTickers(index) {
          ...
        }
        document.getElementById("indexSelect").addEventListener("change", async function() {
          ...
        });
        document.getElementById("indexSelect").dispatchEvent(new Event('change'));

        function processHistoricalData(fullTS, periodMonths){ ... }
        async function fetchHistoricalData(ticker){ ... }

        // Premium check was for getServerSideProps, so we skip that here.

        function computeIchimoku(prices){ ... }
        function computeEMA(prices, period){ ... }
        function computeMACD(prices, fast, slow, signal){ ... }
        function computeRSI(prices, period=14){ ... }
        function computeBollingerBands(prices, period=20, k=2){ ... }
        function computeWMA(prices, period=20){ ... }
        function polynomialRegression(x,y,degree){ ... }
        function predictValue(coeffs, x){ ... }
        function computeMomentumScoreUsingRegression(histVals){ ... }
        function computeGapTrendScore(macdLine, signalLine){ ... }
        function computeNewMACDScore(prices){ ... }
        function scoreRSI(latestRSI, prevRSI){ ... }
        function scoreBollingerDual(latestPrice, latestBand, prevPrice, prevBand){ ... }
        function scoreWMADual(latestPrice, latestWMA, prevPrice, prevWMA){ ... }
        function updateTechChart(prices){ ... }

        async function fetchSentimentData(ticker, periodMonths){ ... }
        function computeSentBull(arr){ ... }

        async function fetchInsiderData(ticker, periodMonths, currentPrice){ ... }
        async function fetchInsiderSentiment(ticker, periodMonths, simDate){ ... }
        function computeNewInsiderScore(insiderSentData, totalBuys, totalSells){ ... }

        function computeFundScores(data){ ... }
        async function fetchFundamentalData(ticker){ ... }

        async function fetchCongressData(ticker, periodMonths){ ... }
        function computeDollarsScore(netDollars){ ... }
        function computeUniqueScore(uniqueBuyCount, uniqueSellCount){ ... }
        function computeCongressScore(totalPurchase, totalSale, uniqueBuyCount, uniqueSellCount){ ... }

        async function determineSPYMarketRegime(periodMonths){ ... }
        function computeSMA(priceArray, period){ ... }
        function classifyBySMA(shortSMA, longSMA){ ... }
        function computePriceSlope(prices){ ... }
        function classifyBySlope(slope){ ... }

        function getAutoWeightsForRegime(regime){ ... }
        function aggregatorFinal(tech, sent, ins, fund, cong, rri, regime){ ... }

        async function fetchOptionsIV(ticker){ ... }
        function computeStatsRRI(prices){ ... }
        function randn(){ ... }
        function runDBHJSimulation(S0, v10, v20, mu, kappa1,theta1, sigma1, rho1, kappa2,theta2, sigma2, rho2, lambda, jumpMean, jumpStd, T, dt, sims){ ... }
        function computeRiskMetrics(finalPrices, currentPrice){ ... }
        function computeRiskVsRewardIndex(finalPrices, currentPrice, cvarFraction, T){ ... }

        async function simulateOneTicker(ticker, periodMonths, regime){ ... }

        function updateRRISlider(val){ ... }

        async function runBatchAnalysis(){ ... }

        // === END inline script code ===
      `}</Script>
    </>
  );
}
