import stockSnapshotHandler from "./stock-snapshot.js";

const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;
const TIMEFRAME_PATTERN = /^(short|medium|long)$/;
const MAX_SYMBOLS = 8;

function normalizeSymbols(input) {
  const unique = [];
  const seen = new Set();

  for (const candidate of String(input || "").split(/[\s,]+/)) {
    const symbol = candidate.trim().toUpperCase();
    if (!symbol || seen.has(symbol)) {
      continue;
    }

    if (!SYMBOL_PATTERN.test(symbol)) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }

    seen.add(symbol);
    unique.push(symbol);
  }

  return unique.slice(0, MAX_SYMBOLS);
}

async function buildSnapshotViaHandler(symbol, timeframe) {
  let statusCode = 200;

  return new Promise((resolve, reject) => {
    const response = {
      setHeader() {},
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        if (statusCode >= 400) {
          reject(new Error(payload?.error || `Snapshot request failed for ${symbol}.`));
          return this;
        }

        resolve(payload);
        return this;
      },
      end() {
        if (statusCode >= 400) {
          reject(new Error(`Snapshot request failed for ${symbol}.`));
          return this;
        }

        resolve(null);
        return this;
      },
    };

    Promise.resolve(
      stockSnapshotHandler(
        {
          method: "GET",
          query: { symbol, timeframe },
        },
        response,
      ),
    ).catch(reject);
  });
}

function mapSnapshotResult(snapshot) {
  const rankedSignals = snapshot.signalScores
    .slice()
    .sort((left, right) => right.weightedContribution - left.weightedContribution);

  return {
    symbol: snapshot.symbol,
    companyName: snapshot.companyName,
    combinedScore: snapshot.combinedScore,
    tone: snapshot.tone,
    regime: snapshot.regime,
    latestClose: snapshot.priceWindow.latestClose,
    changePercent: snapshot.priceWindow.changePercent,
    leadingSignals: rankedSignals.slice(0, 3).map((signal) => ({
      id: signal.id,
      label: signal.label,
      score: signal.score,
      weight: signal.weight,
    })),
  };
}

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const timeframe = String(req.query.timeframe || "medium").trim().toLowerCase();
  if (!TIMEFRAME_PATTERN.test(timeframe)) {
    return res.status(400).json({ error: "Timeframe must be short, medium, or long." });
  }

  let symbols;
  try {
    symbols = normalizeSymbols(req.query.symbols);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid symbols." });
  }

  if (symbols.length === 0) {
    return res.status(400).json({ error: "Provide at least one valid ticker symbol." });
  }

  try {
    const settled = await Promise.allSettled(
      symbols.map(async (symbol) => ({
        symbol,
        snapshot: await buildSnapshotViaHandler(symbol, timeframe),
      })),
    );

    const results = [];
    const failures = [];

    for (const entry of settled) {
      if (entry.status === "fulfilled") {
        results.push(mapSnapshotResult(entry.value.snapshot));
      } else {
        failures.push(entry.reason instanceof Error ? entry.reason.message : "Snapshot request failed.");
      }
    }

    if (results.length === 0) {
      return res.status(502).json({
        error: failures[0] || "Unable to rank the submitted shortlist.",
        failures,
      });
    }

    return res.status(200).json({
      results: results.sort((left, right) => right.combinedScore - left.combinedScore),
      failures,
      requestedCount: symbols.length,
      processedCount: results.length,
    });
  } catch (error) {
    console.error("Error in /api/top-picks route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}