import { useUserContext } from '@dfx.swiss/react';
import { Layout } from '../components/layout';
import { BuyCompletion } from '../components/payment/buy-completion';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';

export function BuySuccessScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { user } = useUserContext();

  return (
    <Layout title={translate('screens/buy', 'Done!')} backButton={false} textStart>
      <BuyCompletion user={user} navigateOnClose />
    </Layout>
  );
}
