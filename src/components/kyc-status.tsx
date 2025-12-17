import {
  isStepDone,
  KycInfo,
  KycLevel,
  KycSession,
  KycStep,
  KycStepStatus,
  TradingLimit,
  useKyc,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledIconButton,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useNavigation } from '../hooks/navigation.hook';

export function useKycStepIcon() {
  const { translate } = useSettingsContext();

  return function stepIcon(step: KycStep): { icon: IconVariant | undefined; label: string; size: IconSize } {
    switch (step.status) {
      case KycStepStatus.NOT_STARTED:
        return { icon: IconVariant.CHECKBOX_EMPTY, label: translate('screens/kyc', 'Not started'), size: IconSize.MD };
      case KycStepStatus.IN_PROGRESS:
        return { icon: IconVariant.EDIT, label: translate('screens/kyc', 'In progress'), size: IconSize.MD };
      case KycStepStatus.IN_REVIEW:
        return { icon: IconVariant.REVIEW, label: translate('screens/kyc', 'In review'), size: IconSize.XS };
      case KycStepStatus.COMPLETED:
        return { icon: IconVariant.CHECKBOX_CHECKED, label: translate('screens/kyc', 'Completed'), size: IconSize.MD };
      case KycStepStatus.FAILED:
        return { icon: IconVariant.CLOSE, label: translate('screens/kyc', 'Failed'), size: IconSize.MD };
      case KycStepStatus.OUTDATED:
        return { icon: IconVariant.REPEAT, label: translate('screens/kyc', 'Outdated'), size: IconSize.MD };
      case KycStepStatus.DATA_REQUESTED:
        return { icon: IconVariant.HELP, label: translate('screens/kyc', 'Data requested'), size: IconSize.MD };
      case KycStepStatus.ON_HOLD:
        return { icon: IconVariant.CHECKBOX_EMPTY, label: '', size: IconSize.MD };
    }
  };
}

interface KycStatusTableProps {
  kycInfo: KycInfo | KycSession;
  tradingLimit: TradingLimit;
  showLabel?: boolean;
  onLimitIncrease?: () => void;
  isLoading?: boolean;
}

export function KycStatusTable({
  kycInfo,
  tradingLimit,
  showLabel = true,
  onLimitIncrease,
  isLoading = false,
}: KycStatusTableProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { levelToString, limitToString, nameToString, typeToString } = useKycHelper();
  const stepIcon = useKycStepIcon();

  const allStepsCompleted = kycInfo.kycSteps.every((s) => isStepDone(s));
  const canContinue = !allStepsCompleted || kycInfo.kycLevel >= KycLevel.Completed;

  return (
    <StyledDataTable
      label={showLabel ? translate('screens/home', 'KYC') : undefined}
      alignContent={AlignContent.RIGHT}
      showBorder
      minWidth={false}
    >
      <StyledDataTableExpandableRow
        label={translate('screens/kyc', 'KYC level')}
        expansionItems={
          kycInfo.kycSteps.length
            ? kycInfo.kycSteps.map((step) => {
                const icon = stepIcon(step);
                return {
                  label: `${nameToString(step.name)}${step.type ? ` (${typeToString(step.type)})` : ''}`,
                  text: icon?.label || '',
                  icon: icon?.icon,
                };
              })
            : []
        }
      >
        <p>{levelToString(kycInfo.kycLevel)}</p>
      </StyledDataTableExpandableRow>
      <StyledDataTableRow label={translate('screens/kyc', 'Trading limit')}>
        <div className="flex flex-row gap-1 items-center">
          <p>{limitToString(tradingLimit)}</p>
          {canContinue && onLimitIncrease && (
            <StyledIconButton icon={IconVariant.ARROW_UP} onClick={onLimitIncrease} isLoading={isLoading} />
          )}
        </div>
      </StyledDataTableRow>
    </StyledDataTable>
  );
}

interface KycStatusProps {
  showStartButton?: boolean;
}

export function KycStatus({ showStartButton = true }: KycStatusProps): JSX.Element | null {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { getKycInfo } = useKyc();
  const { navigate } = useNavigation();
  const { levelToString, limitToString } = useKycHelper();

  const [kycInfo, setKycInfo] = useState<KycInfo>();
  const [isLoading, setIsLoading] = useState(true);

  const kycStarted = kycInfo?.kycSteps.some((s) => s.status !== KycStepStatus.NOT_STARTED);
  const allStepsCompleted = kycInfo?.kycSteps.every((s) => isStepDone(s));

  useEffect(() => {
    if (user?.kyc.hash) {
      setIsLoading(true);
      getKycInfo(user.kyc.hash)
        .then(setKycInfo)
        .catch(() => {
          // KYC info not available, will use fallback from user object
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user?.kyc.hash]);

  function onLimitIncrease() {
    return allStepsCompleted
      ? navigate({ pathname: '/support/issue', search: '?issue-type=LimitRequest' })
      : navigate('/kyc');
  }

  if (!user) return null;

  // Show fallback while loading or if kycInfo failed to load
  if (!kycInfo) {
    return (
      <StyledDataTable
        label={translate('screens/home', 'KYC')}
        alignContent={AlignContent.RIGHT}
        showBorder
        minWidth={false}
      >
        <StyledDataTableRow label={translate('screens/kyc', 'KYC level')}>
          <p>{levelToString(user.kyc.level)}</p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/kyc', 'Trading limit')}>
          <div className="flex flex-row gap-1 items-center">
            <p>{limitToString(user.tradingLimit)}</p>
            <StyledIconButton
              icon={IconVariant.ARROW_UP}
              onClick={() =>
                user.kyc.level < KycLevel.Completed
                  ? navigate('/kyc')
                  : navigate({ pathname: '/support/issue', search: '?issue-type=LimitRequest' })
              }
              isLoading={isLoading}
            />
          </div>
        </StyledDataTableRow>
      </StyledDataTable>
    );
  }

  return (
    <>
      <KycStatusTable
        kycInfo={kycInfo}
        tradingLimit={kycInfo.tradingLimit}
        onLimitIncrease={onLimitIncrease}
        isLoading={isLoading}
      />
      {showStartButton && !allStepsCompleted && (
        <StyledButton
          width={StyledButtonWidth.FULL}
          label={translate('general/actions', kycStarted ? 'Continue' : 'Start')}
          onClick={() => navigate('/kyc')}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
