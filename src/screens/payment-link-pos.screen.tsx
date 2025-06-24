import { ApiError, PaymentLinkPaymentStatus, useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  AlignContent,
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { GoCheckCircleFill, GoClockFill, GoXCircleFill } from 'react-icons/go';
import { useSearchParams } from 'react-router-dom';
import { CircularCountdown } from 'src/components/circular-countdown';
import { ErrorHint } from 'src/components/error-hint';
import { QrBasic } from 'src/components/payment/qr-code';
import { usePaymentLinkContext } from 'src/contexts/payment-link.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import {
  ExtendedPaymentLinkStatus,
  PaymentLinkHistoryPayment,
  PaymentLinkHistoryResponse,
  PaymentLinkPayRequest,
  PaymentLinkPayTerminal,
} from 'src/dto/payment-link.dto';
import { useAppParams } from 'src/hooks/app-params.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { Lnurl } from 'src/util/lnurl';

interface PaymentFormProps {
  payRequest: PaymentLinkPayRequest;
  paymentLinkApiUrl: string;
  fetchPayRequest: (url: string) => void;
}

export default function PaymentLinkPosScreen(): JSX.Element {
  const { error, payRequest, paymentLinkApiUrl, paymentStatus, paymentHasQuote, fetchPayRequest } =
    usePaymentLinkContext();
  const { isInitialized } = useAppParams();

  useLayoutOptions({ backButton: false, smallMenu: true });

  return (
    <>
      {error ? (
        <p className="text-dfxGray-800 text-sm mt-4">{error}</p>
      ) : !payRequest || !isInitialized ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={4} center className="pt-2">
          <div className="flex flex-col w-full gap-4 justify-center">
            <p className="text-dfxBlue-800 font-bold text-base">{payRequest?.displayName}</p>
            <div className="w-full h-[1px] bg-gradient-to-r bg-dfxGray-500 from-white via-dfxGray-500 to-white" />
          </div>
          <div className="flex justify-center items-center w-full">
            <QrBasic data={Lnurl.prependLnurl(Lnurl.encode(paymentLinkApiUrl.current))} />
          </div>
          <div className="flex flex-col w-full gap-4">
            {paymentStatus === PaymentLinkPaymentStatus.PENDING && paymentHasQuote(payRequest) ? (
              <PendingPaymentForm
                payRequest={payRequest}
                paymentLinkApiUrl={paymentLinkApiUrl.current}
                fetchPayRequest={fetchPayRequest}
              />
            ) : (
              <CreatePaymentForm
                payRequest={payRequest as PaymentLinkPayRequest}
                paymentLinkApiUrl={paymentLinkApiUrl.current}
                fetchPayRequest={fetchPayRequest}
              />
            )}
          </div>
          <div className="flex flex-col w-full mt-4">
            <TransactionHistory payRequest={payRequest} paymentStatus={paymentStatus} />
          </div>
        </StyledVerticalStack>
      )}
    </>
  );
}

function CreatePaymentForm({ payRequest, paymentLinkApiUrl, fetchPayRequest }: PaymentFormProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const [urlParams] = useSearchParams();
  const { call } = useApi();

  const route = urlParams.get('route');
  const key = urlParams.get('key');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const rules = Utils.createRules({
    amount: [Validations.Required, Validations.Custom((value) => !isNaN(Number(value)) || 'pattern')],
  });

  const createPayment = useCallback(
    async (data: { amount: number }) => {
      if (!route || !key || !payRequest) return;

      const params = new URLSearchParams({
        route: route,
        externalLinkId: payRequest.externalId as string,
        key: key,
      });

      setIsLoading(true);
      setError(undefined);
      call({
        url: `paymentLink/payment?${params.toString()}`,
        method: 'POST',
        data: {
          amount: +data.amount,
          externalId: Math.random().toString(36).substring(2, 15),
        },
      })
        .then(() => fetchPayRequest(paymentLinkApiUrl))
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsLoading(false));
    },
    [route, key, payRequest, call, fetchPayRequest, paymentLinkApiUrl],
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<{ amount: number }>({
    mode: 'onTouched',
  });

  return (
    <Form
      control={control}
      rules={rules}
      onSubmit={handleSubmit(createPayment)}
      errors={errors}
      translate={translateError}
    >
      <StyledVerticalStack gap={6} full>
        <StyledInput
          type="number"
          name="amount"
          label={translate('screens/payment', 'Amount')}
          smallLabel
          placeholder={'0.00'}
          full
        />
        <StyledButton
          type="submit"
          label={translate('screens/payment', 'Create Payment')}
          onClick={handleSubmit(createPayment)}
          width={StyledButtonWidth.FULL}
          isLoading={isLoading}
          disabled={!isValid}
        />
        {error && <ErrorHint message={error} />}
      </StyledVerticalStack>
    </Form>
  );
}

const PendingPaymentForm = ({ payRequest, paymentLinkApiUrl, fetchPayRequest }: PaymentFormProps): JSX.Element => {
  const [urlParams] = useSearchParams();
  const { translate } = useSettingsContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const remainingTime = useMemo(() => {
    const now = new Date();
    const paymentTime = new Date(payRequest.quote.expiration);
    const diff = paymentTime.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / 1000));
  }, [payRequest]);

  const cancelPayment = async () => {
    const route = urlParams.get('route');
    const key = urlParams.get('key');
    if (!route || !key || !payRequest) return;

    const params = new URLSearchParams({
      route: route,
      externalLinkId: payRequest.externalId as string,
      key: key,
    });

    setIsLoading(true);
    setError(undefined);
    call({
      url: `paymentLink/payment?${params.toString()}`,
      method: 'DELETE',
    })
      .then(() => fetchPayRequest(paymentLinkApiUrl))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  };

  return (
    <>
      <div className="flex justify-center items-center w-full gap-4">
        <CircularCountdown duration={remainingTime} size={80} strokeWidth={6} color="#a7f3d0" textColor="#1e293b" />
      </div>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/payment', 'Amount')}>
          <p>
            {payRequest.requestedAmount.amount} {payRequest.requestedAmount.asset}
          </p>
        </StyledDataTableRow>
      </StyledDataTable>
      <StyledButton
        label={translate('general/actions', 'Cancel')}
        onClick={cancelPayment}
        width={StyledButtonWidth.FULL}
        isLoading={isLoading}
      />
      {error && <ErrorHint message={error} />}
    </>
  );
};

function TransactionHistory({
  payRequest,
  paymentStatus,
}: {
  payRequest: PaymentLinkPayTerminal;
  paymentStatus: ExtendedPaymentLinkStatus;
}): JSX.Element {
  const [urlParams] = useSearchParams();
  const { translate } = useSettingsContext();
  const { call } = useApi();

  const [transactionHistory, setTransactionHistory] = useState<PaymentLinkHistoryPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchTransactionHistory = useCallback(() => {
    const route = urlParams.get('route');
    const key = urlParams.get('key');
    if (!route || !key || !payRequest) return;

    const params = new URLSearchParams({
      route: route,
      externalLinkId: payRequest.externalId as string,
      status: [
        PaymentLinkPaymentStatus.PENDING,
        PaymentLinkPaymentStatus.COMPLETED,
        PaymentLinkPaymentStatus.CANCELLED,
        PaymentLinkPaymentStatus.EXPIRED,
      ].join(','),
      key: key,
    });

    setError(undefined);
    call<PaymentLinkHistoryResponse[]>({
      url: `paymentLink/history?${params.toString()}`,
      method: 'GET',
    })
      .then((response) => {
        setTransactionHistory(
          response[0].payments?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10) ??
            [],
        );
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [urlParams, payRequest, call]);

  useEffect(() => {
    fetchTransactionHistory();
  }, [fetchTransactionHistory, paymentStatus]);

  const statusIcon = {
    [PaymentLinkPaymentStatus.COMPLETED]: <GoCheckCircleFill className="text-[#4BB543]" />,
    [PaymentLinkPaymentStatus.CANCELLED]: <GoXCircleFill className="text-[#FF4444]" />,
    [PaymentLinkPaymentStatus.EXPIRED]: <GoXCircleFill className="text-[#65728A]" />,
    [PaymentLinkPaymentStatus.PENDING]: <GoClockFill className="text-[#65728A]" />,
  };

  return isLoading ? (
    <div className="flex justify-center items-center w-full h-32">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  ) : error ? (
    <ErrorHint message={error} />
  ) : (
    <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
      {transactionHistory.map((payment) => (
        <StyledDataTableRow key={payment.id}>
          <div className="flex flex-1 justify-between items-start">
            <div className="flex items-center justify-center gap-2 text-dfxGray-800">
              {statusIcon[payment.status as keyof typeof statusIcon]}
              {translate('screens/payment', `${payment.status}`)}
            </div>
            <div className="flex flex-col items-end justify-start">
              {payment.amount} {payment.currency.toUpperCase()}
              <span className="text-dfxGray-800 text-xs">
                {new Date(payment.date).toDateString() === new Date().toDateString()
                  ? new Date(payment.date).toLocaleTimeString()
                  : new Date(payment.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </StyledDataTableRow>
      ))}
    </StyledDataTable>
  );
}
