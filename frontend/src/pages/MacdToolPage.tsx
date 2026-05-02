import { SignalFocusPage } from '../components/SignalFocusPage';

export function MacdToolPage() {
  return (
    <SignalFocusPage
      eyebrow="MACD drill-down"
      title="MACD analysis"
      lead="This React version focuses on the MACD slice of the backend technical stack, replacing the standalone legacy calculator with a server-owned signal report."
      signalId="macd"
      signalLabel="MACD"
      signalDescription="MACD tracks crossover direction, histogram trend, and the current relationship between the MACD line and its signal line."
      legacyPath="/MACD/"
    />
  );
}