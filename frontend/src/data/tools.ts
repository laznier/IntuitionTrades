export type ToolStatus = 'legacy-live' | 'migrating' | 'planned';

export type ToolRecord = {
  slug: string;
  name: string;
  category: string;
  summary: string;
  legacyPath: string;
  status: ToolStatus;
  migrationFocus: string;
};

export const tools: ToolRecord[] = [
  {
    slug: 'stocks',
    name: 'Stock Forecast Simulator',
    category: 'Forecasting',
    summary: 'Combines multiple market signals into a single stock analysis workflow.',
    legacyPath: '/stocks/',
    status: 'migrating',
    migrationFocus: 'Move scoring and simulation logic to server-side compute modules.',
  },
  {
    slug: 'fundamental',
    name: 'Fundamental Analysis',
    category: 'Research',
    summary: 'Surface valuation and company quality metrics through a cleaner comparison flow.',
    legacyPath: '/fundamental/',
    status: 'migrating',
    migrationFocus: 'Normalize Alpha Vantage responses and add typed request validation.',
  },
  {
    slug: 'technical',
    name: 'Technical Analysis',
    category: 'Charting',
    summary: 'Rebuild charts with keyboard-friendly summaries and stronger mobile layouts.',
    legacyPath: '/technical/',
    status: 'migrating',
    migrationFocus: 'Replace chart-only outputs with accessible narrative and tabular views.',
  },
  {
    slug: 'sentiment',
    name: 'Market Sentiment',
    category: 'Signals',
    summary: 'Modernize the sentiment score pipeline and make loading and empty states explicit.',
    legacyPath: '/sentiment/',
    status: 'migrating',
    migrationFocus: 'Centralize API calls behind a single server-only market data service.',
  },
  {
    slug: 'insider',
    name: 'Insider Activity',
    category: 'Signals',
    summary: 'Turn insider transactions into a scannable, filterable public research view.',
    legacyPath: '/insider/',
    status: 'migrating',
    migrationFocus: 'Harden external API proxying and add consistent error reporting.',
  },
  {
    slug: 'congress',
    name: 'Congress Trading',
    category: 'Signals',
    summary: 'Present congressional trade data through clearer trend summaries and context.',
    legacyPath: '/congress/',
    status: 'migrating',
    migrationFocus: 'Protect Quiver endpoints with backend aggregation and cache controls.',
  },
  {
    slug: 'intraday',
    name: 'Intraday Snapshot',
    category: 'Charting',
    summary: 'Focus the intraday tool on fast scans, strong feedback, and touch-friendly controls.',
    legacyPath: '/intraday/',
    status: 'migrating',
    migrationFocus: 'Add input validation and rate protection on all symbol-based requests.',
  },
  {
    slug: 'ichimoku',
    name: 'Ichimoku Cloud',
    category: 'Charting',
    summary: 'Simplify a dense visual tool into an explainable workflow with accessible annotations.',
    legacyPath: '/ichimoku/',
    status: 'migrating',
    migrationFocus: 'Split calculation, chart rendering, and explanatory content into separate layers.',
  },
  {
    slug: 'macd',
    name: 'MACD Analysis',
    category: 'Charting',
    summary: 'Focus the MACD signal on a backend-owned summary instead of a standalone client calculator.',
    legacyPath: '/MACD/',
    status: 'migrating',
    migrationFocus: 'Present MACD trend context through the shared stock snapshot rather than direct client math.',
  },
  {
    slug: 'analyst',
    name: 'Analyst Score',
    category: 'Research',
    summary: 'Reshape the analyst score into a guided analysis path with clear confidence notes.',
    legacyPath: '/analyst/',
    status: 'migrating',
    migrationFocus: 'Move weighting formulas off the client and expose only result summaries.',
  },
  {
    slug: 'risk',
    name: 'Risk and Reward',
    category: 'Forecasting',
    summary: 'Rebuild the risk model as an accessible report with readable assumptions.',
    legacyPath: '/risk/',
    status: 'migrating',
    migrationFocus: 'Create server-side calculation contracts and versioned result payloads.',
  },
  {
    slug: 'top5',
    name: 'Top Picks',
    category: 'Curation',
    summary: 'Rank public shortlists through the combined backend market model.',
    legacyPath: '/top5/',
    status: 'migrating',
    migrationFocus: 'Keep shortlist ranking on the backend and limit browser-side scan scope.',
  },
  {
    slug: 'support',
    name: 'Support Bounce Scanner',
    category: 'Curation',
    summary: 'Replace the old support-zone crawler with a bounded public shortlist workflow.',
    legacyPath: '/support/',
    status: 'migrating',
    migrationFocus: 'Keep support scoring on the backend and retire browser-driven all-index scans.',
  },
  {
    slug: 'topcongress',
    name: 'Top Congress Picks',
    category: 'Curation',
    summary: 'Highlight congressional conviction ideas without login or payment friction.',
    legacyPath: '/topcongress/',
    status: 'migrating',
    migrationFocus: 'Keep bulk congressional activity public, searchable, and easy to scan.',
  },
];

export function getToolBySlug(slug: string) {
  return tools.find((tool) => tool.slug === slug);
}