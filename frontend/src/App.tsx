import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { ToolsPage } from './pages/ToolsPage';
import { FundamentalToolPage } from './pages/FundamentalToolPage';
import { StockForecastToolPage } from './pages/StockForecastToolPage';
import { AnalystToolPage } from './pages/AnalystToolPage';
import { SentimentToolPage } from './pages/SentimentToolPage';
import { TechnicalToolPage } from './pages/TechnicalToolPage';
import { IntradayToolPage } from './pages/IntradayToolPage';
import { IchimokuToolPage } from './pages/IchimokuToolPage';
import { MacdToolPage } from './pages/MacdToolPage';
import { RiskToolPage } from './pages/RiskToolPage';
import { TopCongressToolPage } from './pages/TopCongressToolPage';
import { InsiderToolPage } from './pages/InsiderToolPage';
import { CongressToolPage } from './pages/CongressToolPage';
import { TopPicksToolPage } from './pages/TopPicksToolPage';
import { SupportToolPage } from './pages/SupportToolPage';
import { ToolDetailPage } from './pages/ToolDetailPage';
import { AboutPage } from './pages/AboutPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/stocks" element={<StockForecastToolPage />} />
        <Route path="/tools/fundamental" element={<FundamentalToolPage />} />
        <Route path="/tools/analyst" element={<AnalystToolPage />} />
        <Route path="/tools/sentiment" element={<SentimentToolPage />} />
        <Route path="/tools/technical" element={<TechnicalToolPage />} />
        <Route path="/tools/intraday" element={<IntradayToolPage />} />
        <Route path="/tools/ichimoku" element={<IchimokuToolPage />} />
        <Route path="/tools/macd" element={<MacdToolPage />} />
        <Route path="/tools/risk" element={<RiskToolPage />} />
        <Route path="/tools/insider" element={<InsiderToolPage />} />
        <Route path="/tools/congress" element={<CongressToolPage />} />
        <Route path="/tools/top5" element={<TopPicksToolPage />} />
        <Route path="/tools/support" element={<SupportToolPage />} />
        <Route path="/tools/topcongress" element={<TopCongressToolPage />} />
        <Route path="/tools/:toolSlug" element={<ToolDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}