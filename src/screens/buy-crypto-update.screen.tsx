import { useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

interface FormData {
  buyCryptoId: string;
  buyId: string;
}

export default function BuyCryptoUpdateScreen(): JSX.Element {
  useAdminGuard();

  const { translate, translateError } = useSettingsContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
    reset,
  } = useForm<FormData>({ mode: 'onChange' });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(undefined);

    call({
      url: `buyCrypto/${data.buyCryptoId}`,
      method: 'PUT',
      data: { buyId: +data.buyId },
    })
      .then(() => {
        toggleNotification();
        reset();
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }

  const toggleNotification = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const rules = Utils.createRules({
    buyCryptoId: [Validations.Required, Validations.Custom((id) => (!isNaN(Number(id)) ? true : 'pattern'))],
    buyId: [Validations.Required, Validations.Custom((id) => (!isNaN(Number(id)) ? true : 'pattern'))],
  });

  useLayoutOptions({ title: translate('screens/buy-crypto', 'Update Buy Route') });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <StyledInput
          name="buyCryptoId"
          type="text"
          label={translate('screens/buy-crypto', 'BuyCrypto ID')}
          placeholder={translate('screens/buy-crypto', 'Transaction ID')}
          full
        />

        <StyledInput
          name="buyId"
          type="text"
          label={translate('screens/buy-crypto', 'New Buy ID')}
          placeholder={translate('screens/buy-crypto', 'Buy Route ID')}
          full
        />

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        {showNotification ? (
          <p className="flex flex-row gap-1 items-center text-dfxRed-100 font-normal transition-opacity duration-200">
            <DfxIcon icon={IconVariant.CHECK} size={IconSize.SM} />
            {translate('screens/payment', 'Saved')}
          </p>
        ) : (
          <StyledButton
            type="submit"
            label={translate('general/actions', 'Save')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isLoading}
          />
        )}
      </StyledVerticalStack>
    </Form>
  );
}
