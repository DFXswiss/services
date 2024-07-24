import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIframe } from '../hooks/iframe.hook';
import { useNavigation } from '../hooks/navigation.hook';

export const IframeMessageType = 'dfx-iframe-message';

export default function KycRedirectScreen(): JSX.Element {
  const { sendMessage, isUsedByIframe } = useIframe();
  const { search } = useLocation();
  const { navigate } = useNavigation();

  const params = new URLSearchParams(search);
  const status = params.get('status');

  useEffect(() => {
    if (isUsedByIframe) {
      sendMessage({ type: IframeMessageType, status });
    } else {
      navigate({ pathname: '/kyc' }, { clearParams: ['status'] });
    }
  }, [search, isUsedByIframe]);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  );
}
