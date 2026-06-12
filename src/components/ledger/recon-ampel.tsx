import { AMPEL_HEX, AmpelColor } from 'src/util/ledger';

interface ReconAmpelProps {
  color: AmpelColor;
  title?: string;
}

// Reconciliation traffic-light dot used across the ledger screens (§9.4).
export function ReconAmpel({ color, title }: ReconAmpelProps): JSX.Element {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full align-middle"
      style={{ backgroundColor: AMPEL_HEX[color] }}
      title={title}
    />
  );
}
