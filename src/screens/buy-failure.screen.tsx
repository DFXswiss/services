import {
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../contexts/settings.context';
import { useLayoutOptions } from '../hooks/layout-config.hook';
import { useNavigation } from '../hooks/navigation.hook';

export default function BuyFailureScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const header = translate('screens/payment', 'Your payment has failed. Please try again.');

  useLayoutOptions({
    title: `${translate('screens/payment', 'Failed')}!`,
    backButton: false,
    textStart: true,
  });

  return (
    <StyledVerticalStack gap={4}>
      <div className="mx-auto">
        <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_FAILED} color={IconColor.BLUE} />
      </div>
      <p className="text-base font-bold text-center text-dfxBlue-800">{header}</p>
      <StyledButton
        label={translate('general/actions', 'Retry')}
        onClick={() => navigate('/buy')}
        width={StyledButtonWidth.FULL}
      />
    </StyledVerticalStack>
  );
}
