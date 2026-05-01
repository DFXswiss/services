import { MouseEvent as ReactMouseEvent, RefObject, useRef, useState } from 'react';

interface UseSplitPaneOptions {
  initial?: number;
  min?: number;
  max?: number;
}

interface UseSplitPaneResult {
  containerRef: RefObject<HTMLDivElement>;
  splitPercent: number;
  setSplitPercent: (percent: number) => void;
  handleSplitDrag: (e: ReactMouseEvent) => void;
}

export function useSplitPane({ initial = 70, min = 30, max = 80 }: UseSplitPaneOptions = {}): UseSplitPaneResult {
  const [splitPercent, setSplitPercent] = useState(initial);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleSplitDrag(e: ReactMouseEvent): void {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (moveEvent: MouseEvent): void => {
      const rect = container.getBoundingClientRect();
      const percent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(max, Math.max(min, percent)));
    };

    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  return { containerRef, splitPercent, setSplitPercent, handleSplitDrag };
}
