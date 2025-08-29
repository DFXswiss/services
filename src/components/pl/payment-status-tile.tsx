import {
    PaymentLinkPaymentStatus
} from '@dfx.swiss/react';
import { GoCheckCircleFill, GoClockFill, GoSkip, GoXCircleFill } from 'react-icons/go';
import { useSettingsContext } from 'src/contexts/settings.context';
import {
    ExtendedPaymentLinkStatus,
    NoPaymentLinkPaymentStatus
} from 'src/dto/payment-link.dto';
  
  interface PaymentStatusTileProps {
    status?: ExtendedPaymentLinkStatus;
    filterStatuses?: ExtendedPaymentLinkStatus[];
  }
  
  function PaymentStatusTile({ status, filterStatuses }: PaymentStatusTileProps): JSX.Element {
    const { translate } = useSettingsContext();
  
    if (!status || status === PaymentLinkPaymentStatus.PENDING || (filterStatuses && filterStatuses.includes(status))) {
      return <></>;
    }
  
    let tileBackgroundStyle = 'flex flex-col items-center justify-center w-full py-16 rounded-lg border';
    let iconStyle = 'text-[7rem] m-auto';
  
    switch (status) {
      case PaymentLinkPaymentStatus.COMPLETED:
        tileBackgroundStyle += ' bg-[#4BB543]/10 border-[#4BB543]';
        iconStyle += ' text-[#4BB543]';
        break;
      case PaymentLinkPaymentStatus.CANCELLED:
        tileBackgroundStyle += ' bg-[#FF4444]/10 border-[#FF4444]';
        iconStyle += ' text-[#FF4444]';
        break;
      case PaymentLinkPaymentStatus.EXPIRED:
        tileBackgroundStyle += ' bg-[#65728A]/10 border-[#65728A]';
        iconStyle += ' text-[#65728A]';
        break;
      case NoPaymentLinkPaymentStatus.NO_PAYMENT:
        tileBackgroundStyle += ' bg-[#65728A]/10 border-[#65728A]';
        iconStyle += ' text-[#65728A]';
        break;
    }
  
    const statusIcon = {
      [PaymentLinkPaymentStatus.COMPLETED]: <GoCheckCircleFill />,
      [PaymentLinkPaymentStatus.CANCELLED]: <GoXCircleFill />,
      [PaymentLinkPaymentStatus.EXPIRED]: <GoClockFill />,
      [NoPaymentLinkPaymentStatus.NO_PAYMENT]: <GoSkip />,
    };
  
    const statusLabel = {
      [PaymentLinkPaymentStatus.COMPLETED]: 'Completed',
      [PaymentLinkPaymentStatus.CANCELLED]: 'Cancelled',
      [PaymentLinkPaymentStatus.EXPIRED]: 'Expired',
      [NoPaymentLinkPaymentStatus.NO_PAYMENT]: 'No payment active',
    };
  
    return (
      <div className={tileBackgroundStyle}>
        <div className={iconStyle}>{statusIcon[status]}</div>
        <p className="text-dfxBlue-800 font-bold text-xl mt-4 leading-snug">
          {translate('screens/payment', statusLabel[status]).toUpperCase()}
        </p>
      </div>
    );
  }

  export default PaymentStatusTile;