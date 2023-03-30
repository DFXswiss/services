import copy from 'copy-to-clipboard';
import { useState } from 'react';

interface ClipboardInterface {
  isCopying: boolean;
  copy: (text?: string) => void;
}

export function useClipboard(): ClipboardInterface {
  const [isCopying, setIsCopying] = useState(false);
  function copyHelper(text?: string): void {
    if (!text) return;
    setIsCopying(true);
    copy(text);

    setTimeout(() => {
      setIsCopying(false);
    }, 500);
  }

  return { copy: copyHelper, isCopying };
}
