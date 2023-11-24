import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIframe } from '../hooks/iframe.hook';

export const IframeMessageType = 'dfx-iframe-message';

export function IframeMessageScreen(): JSX.Element {
  const { sendMessage } = useIframe();
  const { search } = useLocation();

  useEffect(() => sendMessage({ ...toSearchObject(search), type: IframeMessageType }), [search]);

  function toSearchObject(search: string): Record<string, string> {
    return Array.from(new URLSearchParams(search).entries()).reduce((prev, [key, val]) => {
      prev[key] = val;
      return prev;
    }, {} as Record<string, string>);
  }

  return (
    <div className="w-full h-full flex justify-center items-center">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  );
}
