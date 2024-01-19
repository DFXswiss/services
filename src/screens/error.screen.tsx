import { IconVariant, StyledButton, StyledButtonColor, StyledVerticalStack } from '@dfx.swiss/react-components';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';

export function ErrorScreen(): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <Layout>
      <StyledVerticalStack center gap={5} marginY={5}>
        <div>
          <h2 className="text-dfxBlue-800">{translate('screens/error', 'Oh sorry something went wrong')}</h2>
          <p className="text-dfxGray-700">
            {translate(
              'screens/error',
              'Please return to the previous page. If this problem persists, please contact our support.',
            )}
          </p>
        </div>

        <StyledButton
          icon={IconVariant.HELP}
          label={translate('navigation/links', 'Help')}
          color={StyledButtonColor.GRAY_OUTLINE}
          onClick={() => window.open(process.env.REACT_APP_HELP_URL, '_blank', 'noreferrer')}
        />
      </StyledVerticalStack>
    </Layout>
  );
}
