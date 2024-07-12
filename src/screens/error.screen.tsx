import { IconVariant, StyledButton, StyledButtonColor, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useSearchParams } from 'react-router-dom';
import { useNavigation } from 'src/hooks/navigation.hook';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';

export function ErrorScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const [params] = useSearchParams();

  const error = params.get('msg');

  return (
    <Layout>
      <StyledVerticalStack center gap={5} marginY={5}>
        <div>
          <h2 className="text-dfxBlue-800">{translate('screens/error', 'Oh sorry something went wrong')}</h2>
          <p className="text-dfxGray-700">
            {error ??
              translate(
                'screens/error',
                'Please return to the previous page. If this problem persists, please contact our support.',
              )}
          </p>
        </div>

        <StyledButton
          icon={IconVariant.HELP}
          label={translate('navigation/links', 'Support')}
          color={StyledButtonColor.GRAY_OUTLINE}
          onClick={() => navigate('/support')}
        />
      </StyledVerticalStack>
    </Layout>
  );
}
