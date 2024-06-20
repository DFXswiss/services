import {
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useNavigation } from '../hooks/navigation.hook';

export function BuyFailureScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const header = translate('screens/payment', 'Your payment has failed. Please try again.');

  return (
    <Layout title={translate('screens/payment', 'Credit Card Payment')} backButton={false} textStart>
      <StyledVerticalStack gap={4}>
        <div className="mx-auto">
          <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_FAILED} color={IconColor.BLUE} />
        </div>
        <p className="text-base font-bold text-center text-dfxBlue-800">{header}</p>
        <StyledButton
          label={translate('screens/payment', 'Try again')}
          onClick={() => navigate('/buy')}
          width={StyledButtonWidth.FULL}
        />
      </StyledVerticalStack>
    </Layout>
  );
}
