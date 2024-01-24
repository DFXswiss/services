import {
  ApiError,
  FundOrigin,
  InvestmentDate,
  Limit,
  LimitRequest,
  Utils,
  Validations,
  useKyc,
  useUserContext,
} from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledFileUpload,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { toBase64 } from '../util/utils';

// TODO: translations
const LimitLabels = {
  [Limit.K_500]: "CHF 100'000 - 500'000",
  [Limit.M_1]: "CHF 500'000 - 1'000'000",
  [Limit.M_5]: "CHF 1'000'000 - 5'000'000",
  [Limit.M_10]: "CHF 5'000'000 - 10'000'000",
  [Limit.M_15]: "CHF 10'000'000 - 15'000'000",
  [Limit.INFINITY]: "> CHF 15'000'000",
};

const DateLabels = {
  [InvestmentDate.NOW]: 'Current assets',
  [InvestmentDate.FUTURE]: 'Future assets',
};

const OriginNowLabels = {
  [FundOrigin.SAVINGS]: 'Savings',
  [FundOrigin.BUSINESS_PROFITS]: 'Business profits',
  [FundOrigin.STOCK_GAINS]: 'Stock price gains',
  [FundOrigin.CRYPTO_GAINS]: 'Crypto price gains',
  [FundOrigin.INHERITANCE]: 'Inheritance',
  [FundOrigin.OTHER]: 'Other',
};

const OriginFutureLabels = {
  [FundOrigin.SAVINGS]: 'Future savings',
  [FundOrigin.BUSINESS_PROFITS]: 'Future business profits',
  [FundOrigin.STOCK_GAINS]: 'Future stock price gains',
  [FundOrigin.CRYPTO_GAINS]: 'Future crypto price gains',
  [FundOrigin.INHERITANCE]: 'Future inheritance',
  [FundOrigin.OTHER]: 'Other',
};

interface FormData {
  limit: Limit;
  investmentDate: InvestmentDate;
  fundOrigin: FundOrigin;
  fundOriginText?: string;
  documentProof?: File;
}

export function LimitScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { user } = useUserContext();
  const { navigate } = useNavigation();
  const { search } = useLocation();
  const { increaseLimit } = useKyc();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [requestSent, setRequestSent] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const params = new URLSearchParams(search);
  const paramKycCode = params.get('code');
  const kycCode = paramKycCode ?? user?.kycHash;

  useSessionGuard('/login', !kycCode);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({ mode: 'onTouched' });
  const investmentDate = useWatch({ control, name: 'investmentDate' });

  async function onSubmit(data: FormData) {
    if (!kycCode) return;

    setIsLoading(true);

    try {
      const request: LimitRequest = {
        limit: data.limit,
        investmentDate: data.investmentDate,
        fundOrigin: data.fundOrigin,
        fundOriginText: data.fundOriginText,
        documentProof: data.documentProof && (await toBase64(data.documentProof)),
        documentProofName: data.documentProof?.name,
      };

      await increaseLimit(kycCode, request);

      setRequestSent(true);
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function onBack() {
    setIsLoading(true);
    navigate('/kyc');
  }

  const rules = Utils.createRules({
    limit: Validations.Required,
    investmentDate: Validations.Required,
    fundOrigin: Validations.Required,
  });

  return (
    <Layout title={translate('screens/limit', 'Limit increase')} rootRef={rootRef}>
      {requestSent ? (
        <StyledVerticalStack gap={6} full>
          <p className="text-dfxGray-700">
            {translate(
              'screens/limit',
              'The request has been successfully submitted. You will be contacted by email as soon as the data has been verified.',
            )}
          </p>

          <StyledButton
            label={translate('general/actions', 'Ok')}
            onClick={onBack}
            width={StyledButtonWidth.FULL}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
        >
          <StyledVerticalStack gap={6} full center>
            <StyledDropdown<Limit>
              rootRef={rootRef}
              label={translate('screens/limit', 'Investment volume')}
              items={Object.values(Limit).filter((i) => typeof i !== 'string') as number[]}
              labelFunc={(item) => LimitLabels[item]}
              name="limit"
              placeholder={translate('general/actions', 'Select...')}
              full
            />

            <StyledDropdown<InvestmentDate>
              rootRef={rootRef}
              label={translate('screens/limit', 'Investment date')}
              items={Object.values(InvestmentDate)}
              labelFunc={(item) => translate('screens/limit', DateLabels[item])}
              name="investmentDate"
              placeholder={translate('general/actions', 'Select...')}
              full
            />

            <StyledDropdown<FundOrigin>
              rootRef={rootRef}
              label={translate('screens/limit', 'Origin of funds')}
              items={Object.values(FundOrigin)}
              labelFunc={(item) =>
                translate(
                  'screens/limit',
                  investmentDate === InvestmentDate.FUTURE ? OriginFutureLabels[item] : OriginNowLabels[item],
                )
              }
              name="fundOrigin"
              placeholder={translate('general/actions', 'Select...')}
              full
            />

            <StyledInput
              name="fundOriginText"
              label={`${translate('screens/limit', 'Origin of funds')} (${translate('screens/limit', 'free text')})`}
              full
            />

            <StyledFileUpload
              name="documentProof"
              label={translate('screens/limit', 'Document proof')}
              placeholder={translate('general/actions', 'Drop files here')}
              buttonLabel={translate('general/actions', 'Browse')}
              full
            />

            {error && (
              <div>
                <ErrorHint message={error} />
              </div>
            )}

            <StyledButton
              type="submit"
              label={translate('general/actions', 'Next')}
              onClick={handleSubmit(onSubmit)}
              width={StyledButtonWidth.FULL}
              disabled={!isValid}
              isLoading={isLoading}
            />
          </StyledVerticalStack>
        </Form>
      )}
    </Layout>
  );
}
