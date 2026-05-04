import { DfxIcon, IconColor, IconVariant } from '@dfx.swiss/react-components';
import { useState } from 'react';

interface Props {
  title: string;
  count?: number;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}

export function CollapsibleSection({ title, count, children, initiallyOpen = false }: Props): JSX.Element {
  const [open, setOpen] = useState(initiallyOpen);
  const label = count != null ? `${title} (${count})` : title;

  return (
    <div className="w-full">
      <h2
        className="text-dfxGray-700 flex items-center justify-center gap-2 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <DfxIcon icon={open ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE} color={IconColor.DARK_GRAY} />
      </h2>
      {open && <div className="w-full overflow-x-auto">{children}</div>}
    </div>
  );
}
