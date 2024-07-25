import { ApiError, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { useWindowContext } from 'src/contexts/window.context';
import { blankedAddress } from 'src/util/utils';
import { useSettingsContext } from '../../contexts/settings.context';
import { ErrorHint } from '../error-hint';

export enum OverlayType {
  NONE,
  DELETE_ADDRESS,
  DELETE_ACCOUNT,
  RENAME_ADDRESS,
}

export const OverlayHeader: Record<OverlayType, string> = {
  [OverlayType.NONE]: '',
  [OverlayType.DELETE_ADDRESS]: 'Delete address',
  [OverlayType.DELETE_ACCOUNT]: 'Delete account',
  [OverlayType.RENAME_ADDRESS]: 'Rename address',
};

interface OverlayProps {
  onClose: (result?: any) => Promise<void>;
  address?: string;
}

interface OverlayContentProps extends OverlayProps {
  type: OverlayType;
}

interface FormData {
  label: string;
}

export function OverlayContent({ type, onClose, address }: OverlayContentProps): JSX.Element {
  switch (type) {
    case OverlayType.DELETE_ADDRESS:
      return <DeleteAddressOverlay onClose={onClose} address={address} />;
    case OverlayType.DELETE_ACCOUNT:
      return <DeleteAccountOverlay onClose={onClose} />;
    case OverlayType.RENAME_ADDRESS:
      return <RenameAddressOverlay onClose={onClose} />;
    default:
      return <></>;
  }
}

export function DeleteAddressOverlay({ onClose, address }: OverlayProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { width } = useWindowContext();

  const formattedAddress = blankedAddress(address ?? '', { width });

  return (
    <>
      <p className="text-dfxBlue-800 mb-2">
        <Trans i18nKey="screens/settings.delete" values={{ address: formattedAddress }}>
          Are you sure you want to delete the address <strong>{formattedAddress}</strong> from your DFX account? This
          action is irreversible.
        </Trans>
      </p>
      <StyledHorizontalStack>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Cancel')}
          onClick={() => onClose(false)}
        />
        <StyledButton
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Delete')}
          onClick={() => onClose(true)}
        />
      </StyledHorizontalStack>
    </>
  );
}

export function DeleteAccountOverlay({ onClose }: OverlayProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <p className="text-dfxBlue-800 mb-2">
        {translate(
          'screens/settings',
          'Deleting your account is irreversible. Your data will remain on our servers temporarily before permanent deletion. If you have any questions, please contact our support team.',
        )}
      </p>
      <StyledHorizontalStack>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Cancel')}
          onClick={() => onClose(false)}
        />
        <StyledButton
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Delete')}
          onClick={() => onClose(true)}
        />
      </StyledHorizontalStack>
    </>
  );
}

export function RenameAddressOverlay({ onClose }: OverlayProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onTouched' });

  function onSubmit(data: FormData) {
    setIsUpdating(true);
    setError(undefined);
    onClose(data.label)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    label: Validations.Required,
  });

  return (
    <StyledVerticalStack gap={6} full>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledInput
          name="label"
          autocomplete="label"
          label={translate('screens/kyc', 'Name')}
          placeholder={translate('screens/kyc', 'Name')}
          full
          smallLabel
        />
      </Form>

      <StyledHorizontalStack gap={6} spanAcross>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.FULL}
          label={translate('general/actions', 'Cancel')}
          onClick={() => onClose()}
        />
        <StyledButton
          type="submit"
          label={translate('general/actions', 'Save')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isUpdating}
        />
      </StyledHorizontalStack>

      {error && (
        <div>
          <ErrorHint message={error} />
        </div>
      )}
    </StyledVerticalStack>
  );
}
