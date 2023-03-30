import { useState } from 'react';
import { useUserContext } from '../api/contexts/user.context';
import { useClipboard } from '../hooks/clipboard.hook';
import { useKyc } from '../hooks/kyc.hook';
import { IconColors } from '../stories/DfxIcon';
import StyledVerticalStack from '../stories/layout-helpers/StyledVerticalStack';
import StyledButton, { StyledButtonColors, StyledButtonSizes, StyledButtonWidths } from '../stories/StyledButton';
import StyledDataTable from '../stories/StyledDataTable';
import StyledDataTableRow from '../stories/StyledDataTableRow';
import StyledModal, { StyledModalColors } from '../stories/StyledModal';
import { Utils } from '../utils';
import { MailEdit, MailEditInfoTextPlacement } from './edit/mail.edit';

export function UserData(): JSX.Element {
  const { user, refLink } = useUserContext();
  const { isComplete } = useKyc();
  const { copy, isCopying } = useClipboard();
  const { start, status, limit } = useKyc();
  const [showsUserEdit, setShowsUserEdit] = useState(false);

  const userData = [
    {
      title: 'E-mail address',
      value: user?.mail,
      button:
        user?.mail != null
          ? undefined
          : {
              color: StyledButtonColors.WHITE,
              label: 'Add E-mail address',
              func: () => setShowsUserEdit(true),
              isLoading: false,
              deactivateMargin: true,
            },
    },
    { title: 'KYC status', value: status },
    {
      title: 'Transaction limit',
      value: limit,
      button: {
        color: StyledButtonColors.WHITE,
        label: isComplete ? 'Increase limit' : 'Start KYC to increase',
        func: start,
        isLoading: false,
        deactivateMargin: false,
      },
    },
  ];

  const referralData = [
    {
      title: 'Referral link',
      value: user?.ref ?? 'Complete a buy to receive your referral link',
      button:
        user?.ref != null
          ? {
              color: StyledButtonColors.RED,
              label: 'Copy to share',
              func: () => copy(refLink),
              isLoading: isCopying,
              deactivateMargin: false,
            }
          : undefined,
    },
    { title: 'Referral commission', value: `${user?.refFeePercent ?? 0 * 100} %` },
    { title: 'Referred users', value: user?.refCount },
    { title: 'Referral volume', value: `${Utils.formatAmount(user?.refVolume)} €` },
    { title: 'Referral bonus', value: `${Utils.formatAmount(user?.paidRefCredit)} €` },
  ];

  const data = [
    { header: 'User Data', content: userData },
    { header: 'User Referral', content: referralData },
  ];

  return (
    <>
      {/* MODALS */}
      <StyledModal
        heading="User data"
        color={StyledModalColors.DFX_GRADIENT}
        isVisible={showsUserEdit}
        onClose={setShowsUserEdit}
      >
        <MailEdit
          onSubmit={() => setShowsUserEdit(false)}
          infoText="Enter your email address if you want to be informed about the progress of any purchase or sale."
          infoTextIconColor={IconColors.WHITE}
          infoTextPlacement={MailEditInfoTextPlacement.BELOW_INPUT}
        />
      </StyledModal>
      {/* CONTENT */}
      <StyledVerticalStack gap={6}>
        {data.map(({ header, content }, index) => (
          <StyledDataTable heading={header} key={index} showBorder={false} darkTheme>
            {content.map((entry, entryIndex) => (
              <StyledDataTableRow key={entryIndex} label={entry.title}>
                {entry.value}
                {entry.button && (
                  <StyledButton
                    onClick={entry.button.func}
                    label={entry.button.label}
                    color={entry.button.color}
                    size={StyledButtonSizes.SMALL}
                    width={StyledButtonWidths.MIN}
                    caps={false}
                    isLoading={entry.button.isLoading}
                    deactivateMargin={entry.button.deactivateMargin}
                  />
                )}
              </StyledDataTableRow>
            ))}
          </StyledDataTable>
        ))}
        <StyledButton label="edit user data" onClick={() => setShowsUserEdit(true)} />
      </StyledVerticalStack>
    </>
  );
}
