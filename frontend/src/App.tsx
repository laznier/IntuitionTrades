import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { ToolsPage } from './pages/ToolsPage';
import { FundamentalToolPage } from './pages/FundamentalToolPage';
import { StockForecastToolPage } from './pages/StockForecastToolPage';
import { AnalystToolPage } from './pages/AnalystToolPage';
import { SentimentToolPage } from './pages/SentimentToolPage';
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
        <Route path="/tools/:toolSlug" element={<ToolDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}