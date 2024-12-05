import { IconVariant, StyledButton, StyledButtonColor } from '@dfx.swiss/react-components';
import { useSettingsContext } from '../contexts/settings.context';

export function ErrorHint({ message, onBack }: { message: string; onBack?: () => void }): JSX.Element {
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
      <div className="flex justify-center" hidden={!onBack}>
        <StyledButton
          className="mt-4"
          icon={IconVariant.BACK}
          label={translate('general/actions', 'Back')}
          color={StyledButtonColor.GRAY_OUTLINE}
          onClick={onBack!}
        />
      </div>
    </>
  );
}
