import { Navigation } from '../components/navigation';
import { useLanguageContext } from '../contexts/language.context';

export function ErrorScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  return (
    <>
      <Navigation />
      <div className="flex flex-col items-center text-center px-8 mt-6">
        <h2 className="text-dfxBlue-800">{translate('screens/error', 'Oh sorry something went wrong')}</h2>
        <p className="text-dfxGray-700">
          {translate(
            'screens/error',
            'Please return to your previous page, if this problem consists reach out to use via Telegram',
          )}
        </p>
      </div>
    </>
  );
}
