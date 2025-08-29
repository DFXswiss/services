import { PaymentLinkPaymentStatus } from '@dfx.swiss/react';
import { StyledButton, StyledButtonColor, StyledButtonWidth, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PaymentStatusTile from 'src/components/pl/payment-status-tile';
import { CloseType, useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useSettingsContext } from '../contexts/settings.context';
import { useLayoutOptions } from '../hooks/layout-config.hook';

export default function PaymentLinkResultScreen(): JSX.Element {
  const { params, closeServices } = useAppHandlingContext();
  const { translate } = useSettingsContext();
  const [searchParams] = useSearchParams();
  const [status] = useState(searchParams.get('status') as PaymentLinkPaymentStatus);
  const { navigate, clearParams } = useNavigation();
  
  const lightning = searchParams.get('lightning');

  useLayoutOptions({ backButton: false, smallMenu: true });

  useEffect(() => {
    if (params?.redirectUri) {
      closeServices({ type: CloseType.PAYMENT }, false);
    }
    if (searchParams.get('status')) {
      clearParams(['status']);
    }
  }, [params, status, searchParams]);

  const onGoBack = () => {
    if (lightning) {
      navigate(`/pl`);
    }
  };

  return (
    <StyledVerticalStack gap={4} center className="pt-2">
      <PaymentStatusTile status={status} />

      {lightning && (
        <StyledButton
          label={translate('screens/payment', 'Go back to the payment page')}
          onClick={onGoBack}
          width={StyledButtonWidth.FULL}
          color={StyledButtonColor.STURDY_WHITE}
        />
      )}

      {params?.redirectUri && (
        <p className="text-dfxBlue-800 text-center">
          {translate('screens/payment', 'You will be redirected to the site shortly')}
        </p>
      )}

      <p className="text-dfxGray-800 text-xs text-center mt-8">
        {translate(
          'screens/payment',
          'By using this service, the outstanding claim of the above-mentioned company against DFX is assigned, and the General Terms and Conditions of DFX AG apply.',
        )}
      </p>
    </StyledVerticalStack>
  );
}
