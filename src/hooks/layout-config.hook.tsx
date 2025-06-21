import { isEqual } from 'lodash';
import { useEffect, useRef } from 'react';
import { LayoutConfig, useLayoutConfigContext } from '../contexts/layout-config.context';

export function useLayoutOptions({ title, backButton, textStart, noPadding, smallMenu, onBack }: LayoutConfig): void {
  const { setConfig } = useLayoutConfigContext();
  const prevConfig = useRef<LayoutConfig>();

  useEffect(() => {
    const newConfig: LayoutConfig = {
      title,
      backButton,
      textStart,
      noPadding,
      smallMenu,
      onBack,
    };

    const changed = !isEqual(
      { ...prevConfig.current, onBack: Boolean(prevConfig.current?.onBack) },
      { ...newConfig, onBack: Boolean(newConfig.onBack) }
    );

    if (changed) {
      prevConfig.current = newConfig;
      setConfig(newConfig);
    }
  }, [title, backButton, textStart, noPadding, smallMenu, onBack, setConfig]);

  useEffect(() => {
    return () => setConfig({});
  }, [setConfig]);
}
