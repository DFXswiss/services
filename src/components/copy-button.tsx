import { useState } from 'react';
import { IconVariant } from '../stories/DfxIcon';
import StyledIconButton from '../stories/StyledIconButton';

interface CopyButtonProps {
  onCopy: () => void;
  inline?: boolean;
}

export function CopyButton({ onCopy, inline }: CopyButtonProps): JSX.Element {
  const [showsCheckmark, setShowsCheckmark] = useState(false);
  return (
    <StyledIconButton
      icon={showsCheckmark ? IconVariant.CHECK : IconVariant.COPY}
      onClick={() => {
        onCopy();
        setShowsCheckmark(true);
        setTimeout(() => {
          setShowsCheckmark(false);
        }, 1000);
      }}
      inline={inline}
    />
  );
}
