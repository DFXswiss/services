import { useEffect, useRef } from 'react';
import { LayoutConfig, useLayoutConfigContext } from '../contexts/layout-config.context';

export function useLayoutOptions({ title, backButton, textStart, noPadding, smallMenu, onBack }: LayoutConfig): void {
  const { setConfig } = useLayoutConfigContext();
  const prevConfig = useRef<LayoutConfig>();

  useEffect(() => {
    const hasOnBack = Boolean(onBack);
    const prevOnBack = Boolean(prevConfig.current?.onBack);

    const changed =
      prevConfig.current?.title !== title ||
      prevConfig.current?.backButton !== backButton ||
      prevConfig.current?.textStart !== textStart ||
      prevConfig.current?.noPadding !== noPadding ||
      prevConfig.current?.smallMenu !== smallMenu ||
      prevOnBack !== hasOnBack;

    if (changed) {
      const newConfig: LayoutConfig = {
        title,
        backButton,
        textStart,
        noPadding,
        smallMenu,
        onBack,
      };

      prevConfig.current = newConfig;
      setConfig(newConfig);
    }
  }, [title, backButton, textStart, noPadding, smallMenu, onBack, setConfig]);

  useEffect(() => {
    return () => setConfig({});
  }, [setConfig]);
}
