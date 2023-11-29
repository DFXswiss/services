import { useSettingsContext } from '../contexts/settings.context';

export function ErrorHint({ message }: { message: string }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <p className="text-dfxRed-100">
        {translate(
          'general/errors',
          'Something went wrong. Please try again. If the issue persists please reach out to our support.',
        )}
      </p>
      <p className="text-dfxGray-800 text-sm">{message}</p>
    </>
  );
}
