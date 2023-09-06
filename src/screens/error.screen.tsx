import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';

export function ErrorScreen(): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <Layout>
      <div className="flex flex-col items-center text-center px-8 mt-6">
        <h2 className="text-dfxBlue-800">{translate('screens/error', 'Oh sorry something went wrong')}</h2>
        <p className="text-dfxGray-700">
          {translate(
            'screens/error',
            'Please return to your previous page. If this problem consists reach out to use via Telegram.',
          )}
        </p>
      </div>
    </Layout>
  );
}
