import { ApiError, usePaymentRoutes, Utils, Validations } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledInput,
  StyledLink,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { LanguageLabels } from 'src/config/labels';
import { useSettingsContext } from 'src/contexts/settings.context';
import { StickerLanguage } from 'src/dto/payment-link.dto';
import useDebounce from 'src/hooks/debounce.hook';
import { downloadFile, filenameDateFormat, url } from 'src/util/utils';

interface FormData {
  route: string;
  externalIds: string;
  language: StickerLanguage;
}

export default function StickersScreen(): JSX.Element {
  const { translate, translateError, language } = useSettingsContext();
  const { getPaymentRecipient, getPaymentStickers } = usePaymentRoutes();

  const rootRef = useRef<HTMLDivElement>(null);

  const [urlParams, setUrlParams] = useSearchParams();
  const [errorRecipient, setErrorRecipient] = useState<string>();
  const [isLoadingRecipient, setIsLoadingRecipient] = useState(false);
  const [validatedRecipient, setValidatedRecipient] = useState<string>();
  const [errorGeneratingPdf, setErrorGeneratingPdf] = useState<string>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const {
    watch,
    control,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'all',
  });

  const selectedLanguage = watch('language');
  const debouncedData = useDebounce(watch(), 500);

  useEffect(() => {
    if (language && !selectedLanguage) {
      setValue('language', language.symbol.toLowerCase() as StickerLanguage);
    }
  }, [language]);

  useEffect(() => {
    const route = urlParams.get('route');
    const externalIds = urlParams.get('externalIds');
    const language = urlParams.get('language') as StickerLanguage;
    if (!route && !externalIds && !language) return;

    if (route) setValue('route', route);
    if (externalIds) setValue('externalIds', externalIds);
    if (language) setValue('language', language);

    trigger();
    setUrlParams(new URLSearchParams());
  }, []);

  useEffect(() => {
    setValidatedRecipient(undefined);
    setErrorRecipient(undefined);

    if (debouncedData?.route) validateRecipient(debouncedData.route);
  }, [debouncedData?.route]);

  useEffect(() => {
    setErrorGeneratingPdf(undefined);
  }, [debouncedData?.route, debouncedData?.externalIds]);

  async function validateRecipient(route: string) {
    getPaymentRecipient(route)
      .then((_) => {
        setErrorRecipient(undefined);
        setValidatedRecipient(route);
      })
      .catch((_) => setErrorRecipient(route))
      .finally(() => setIsLoadingRecipient(false));
  }

  function onSubmit(data?: FormData) {
    if (!data) return;

    setIsGeneratingPdf(true);
    setErrorGeneratingPdf(undefined);
    getPaymentStickers(data.route, data.externalIds, undefined, data.language)
      .then(({ data, headers }) => {
        downloadFile(data, headers, `DFX_OCP_stickers_${filenameDateFormat()}.pdf`);
      })
      .catch((error: ApiError) => setErrorGeneratingPdf(error.message ?? 'Unknown Error'))
      .finally(() => setIsGeneratingPdf(false));
  }

  const rules = Utils.createRules({
    route: Validations.Required,
    externalIds: Validations.Required,
  });

  return (
    <Layout title={translate('screens/payment', 'Open CryptoPay Stickers')}>
      <StyledVerticalStack gap={6} full center>
        <Form control={control} rules={rules} errors={errors} translate={translateError}>
          <StyledVerticalStack gap={6} full center>
            <div className="relative w-full">
              <StyledInput
                name="route"
                autocomplete="route"
                label={translate('screens/payment', 'Route')}
                placeholder={translate('screens/payment', 'Route')}
                full
                smallLabel
                forceError={!!errorRecipient}
                loading={isLoadingRecipient}
              />
              {validatedRecipient && (
                <div className="absolute top-[44px] right-5">
                  <DfxIcon icon={IconVariant.CHECK} size={IconSize.MD} color={IconColor.BLUE} />
                </div>
              )}
            </div>
            <StyledInput
              name="externalIds"
              autocomplete="externalIds"
              label={translate('screens/payment', 'External IDs (comma separated)')}
              placeholder={'123, 456, 789'}
              full
              smallLabel
            />
            <StyledDropdown<StickerLanguage>
              full
              rootRef={rootRef}
              name="language"
              label={translate('screens/settings', 'Language')}
              smallLabel={true}
              placeholder={translate('general/actions', 'Select') + '...'}
              items={Object.values(StickerLanguage)}
              labelFunc={(item) => LanguageLabels[item].translated}
              descriptionFunc={(item) => LanguageLabels[item].local}
            />
            <StyledButton
              type="submit"
              label={translate('general/actions', 'Download')}
              onClick={() => onSubmit(debouncedData)}
              width={StyledButtonWidth.FULL}
              disabled={!isValid || !validatedRecipient || isGeneratingPdf}
              isLoading={isGeneratingPdf}
            />
            {errorRecipient && (
              <p className="text-dfxGray-800 text-sm">
                <Trans
                  i18nKey="general/errors.invoice"
                  defaults="DFX does not recognize a recipient with the name <strong>{{recipient}}</strong>. This service can only be used for recipients who have an active account with DFX and are activated for the invoicing service. If you wish to register as a recipient with DFX, please contact support at <link>{{supportLink}}</link>."
                  values={{ recipient: errorRecipient, supportLink: '' }}
                  components={{
                    strong: <strong />,
                    link: <StyledLink label={`app.dfx.swiss/support`} url={url({ path: '/support' })} dark />,
                  }}
                />
              </p>
            )}
            {errorGeneratingPdf && <ErrorHint message={errorGeneratingPdf} />}
          </StyledVerticalStack>
        </Form>
      </StyledVerticalStack>
    </Layout>
  );
}
