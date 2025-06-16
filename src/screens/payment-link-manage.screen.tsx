import { PaymentLinkPaymentStatus, useApi, Utils, Validations } from '@dfx.swiss/react';
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
import { Lnurl } from 'src/util/lnurl';
import { Layout } from '../components/layout';

interface PaymentFormProps {
  payRequest: PaymentLinkPayRequest;
  paymentLinkApiUrl: string;
  fetchPayRequest: (url: string) => void;
}

export default function PaymentLinkManageScreen(): JSX.Element {
  const { error, payRequest, paymentLinkApiUrl, paymentStatus, paymentHasQuote, fetchPayRequest } =
    usePaymentLinkContext();
  const { isInitialized } = useAppParams();

  return (
    <Layout backButton={false} smallMenu>
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
    </Layout>
  );
}

function CreatePaymentForm({ payRequest, paymentLinkApiUrl, fetchPayRequest }: PaymentFormProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { route, key } = useAppParams();
  const { call } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const rules = Utils.createRules({
    paymentAmount: [Validations.Required, Validations.Custom((value) => !isNaN(Number(value)) || 'invalid amount')],
  });

  const createPayment = useCallback(
    async (data: { amount: number }) => {
      if (!route || !key || !payRequest) return;
      setIsLoading(true);

      const params = new URLSearchParams({
        route: route,
        externalLinkId: payRequest.externalId as string,
        key: key,
      });

      await call({
        url: `paymentLink/payment?${params.toString()}`,
        method: 'POST',
        data: {
          amount: +data.amount,
          externalId: Math.random().toString(36).substring(2, 15),
        },
      });

      await fetchPayRequest(paymentLinkApiUrl);
      setIsLoading(false);
    },
    [route, key, payRequest, call, fetchPayRequest, paymentLinkApiUrl],
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ amount: number }>({
    mode: 'onTouched',
  });

  return (
    <Form control={control} rules={rules} onSubmit={handleSubmit(createPayment)} errors={errors}>
      <StyledVerticalStack gap={6} full>
        <StyledInput
          name="amount"
          label={translate('screens/payment', 'Amount')}
          smallLabel
          placeholder={'0.00'}
          full
        />
        <div className="flex flex-col w-full mt-4">
          <StyledButton
            type="submit"
            label={translate('screens/payment', 'Create Payment')}
            onClick={handleSubmit(createPayment)}
            width={StyledButtonWidth.FULL}
            isLoading={isLoading}
          />
        </div>
      </StyledVerticalStack>
    </Form>
  );
}

const PendingPaymentForm = ({ payRequest, paymentLinkApiUrl, fetchPayRequest }: PaymentFormProps): JSX.Element => {
  const { route, key } = useAppParams();
  const { translate } = useSettingsContext();
  const { call } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const remainingTime = useMemo(() => {
    const now = new Date();
    const paymentTime = new Date(payRequest.quote.expiration);
    const diff = paymentTime.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / 1000));
  }, [payRequest]);

  const cancelPayment = async () => {
    if (!route || !key || !payRequest) return;
    setIsLoading(true);

    const params = new URLSearchParams({
      route: route,
      externalLinkId: payRequest.externalId as string,
      key: key,
    });

    await call({
      url: `paymentLink/payment?${params.toString()}`,
      method: 'DELETE',
    });

    await fetchPayRequest(paymentLinkApiUrl);

    setIsLoading(false);
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
  const { route, key } = useAppParams();
  const { translate } = useSettingsContext();
  const { call } = useApi();
  const [transactionHistory, setTransactionHistory] = useState<PaymentLinkHistoryPayment[]>([]);

  const fetchTransactionHistory = async () => {
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

    const response: PaymentLinkHistoryResponse[] = await call({
      url: `paymentLink/history?${params.toString()}`,
      method: 'GET',
    });

    setTransactionHistory(
      response[0].payments
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10),
    );
  };

  useEffect(() => {
    fetchTransactionHistory();
  }, [paymentStatus]);

  const statusIcon = {
    [PaymentLinkPaymentStatus.COMPLETED]: <GoCheckCircleFill className="text-[#4BB543]" />,
    [PaymentLinkPaymentStatus.CANCELLED]: <GoXCircleFill className="text-[#FF4444]" />,
    [PaymentLinkPaymentStatus.EXPIRED]: <GoXCircleFill className="text-[#65728A]" />,
    [PaymentLinkPaymentStatus.PENDING]: <GoClockFill className="text-[#65728A]" />,
  };

  return (
    <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
      {transactionHistory.map((payment) => (
        <StyledDataTableRow
          key={payment.id}
          label={
            <span className="flex items-center gap-2">
              {statusIcon[payment.status as keyof typeof statusIcon]}
              {translate('screens/payment', `${payment.status}`)}
            </span>
          }
        >
          <div className="flex flex-col items-end">
            <p>
              {payment.amount} {payment.currency.toUpperCase()}
            </p>
            <span className="text-dfxGray-800 text-xs">
              {new Date(payment.updatedAt).toDateString() === new Date().toDateString()
                ? new Date(payment.updatedAt).toLocaleTimeString()
                : new Date(payment.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </StyledDataTableRow>
      ))}
    </StyledDataTable>
  );
}

function CircularCountdown({
  duration = 10,
  size = 80,
  strokeWidth = 6,
  color = '#64748b',
  textColor = '#1e293b',
  onComplete,
}: {
  duration?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  textColor?: string;
  onComplete?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / duration;

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onComplete) onComplete();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onComplete]);

  return (
    <div
      style={{
        width: size,
        height: size,
      }}
      className="relative flex justify-center items-center"
    >
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (progress - 1)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          color: textColor,
          fontWeight: 600,
          fontSize: size * 0.3,
          userSelect: 'none',
        }}
      >
        {timeLeft}
      </span>
    </div>
  );
}
