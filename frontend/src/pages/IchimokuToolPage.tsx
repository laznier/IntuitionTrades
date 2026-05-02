import { SignalFocusPage } from '../components/SignalFocusPage';

export function IchimokuToolPage() {
  return (
    <SignalFocusPage
      eyebrow="Ichimoku drill-down"
      title="Ichimoku cloud analysis"
      lead="This React version focuses on the Ichimoku slice of the backend technical stack, turning the legacy cloud chart into a concise public signal report."
      signalId="ichimoku"
      signalLabel="Ichimoku"
      signalDescription="Ichimoku blends cloud position, span spread, and Tenkan-Kijun alignment into a single directional signal owned by the backend snapshot model."
      legacyPath="/ichimoku/"
    />
  );
}