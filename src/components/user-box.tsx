import { useState } from 'react';
import { useUserContext } from '../api/contexts/user.context';
import { useSessionContext } from '../contexts/session.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useClipboard } from '../hooks/clipboard.hook';
import { IconColors, IconSizes, IconVariant } from '../stories/DfxIcon';
import StyledButton, { StyledButtonColors, StyledButtonSizes, StyledButtonWidths } from '../stories/StyledButton';
import StyledDataBox from '../stories/StyledDataBox';
import StyledDataTextRow from '../stories/StyledDataTextRow';
import StyledModal, { StyledModalColors } from '../stories/StyledModal';
import { MailEdit } from './edit/mail.edit';
import { UserData } from './user-data';

export function UserBox(): JSX.Element {
  const { isConnected } = useWalletContext();
  const { isLoggedIn } = useSessionContext();
  const { user, refLink, isUserLoading } = useUserContext();
  const { copy, isCopying } = useClipboard();
  const [showsEmailEdit, setShowsEmailEdit] = useState(false);
  const [showsUserData, setShowsUserData] = useState(false);

  return isConnected && isLoggedIn ? (
    <>
      {/* MODALS */}
      <StyledModal
        heading="E-mail address"
        color={StyledModalColors.DFX_GRADIENT}
        isVisible={showsEmailEdit}
        onClose={setShowsEmailEdit}
      >
        <MailEdit onSubmit={() => setShowsEmailEdit(false)} />
      </StyledModal>
      <StyledModal
        heading="Your Data"
        color={StyledModalColors.DFX_GRADIENT}
        isVisible={showsUserData}
        onClose={setShowsUserData}
      >
        <UserData />
      </StyledModal>
      {/* CONTENT */}
      <StyledDataBox
        heading="Your Data"
        rightIconButton={{
          icon: IconVariant.SETTINGS,
          color: IconColors.RED,
          size: IconSizes.LG,
          onClick: () => setShowsUserData(true),
        }}
      >
        <StyledDataTextRow label="E-mail address" isLoading={isUserLoading}>
          {user?.mail ?? (
            <StyledButton
              label="Add E-mail address"
              size={StyledButtonSizes.SMALL}
              width={StyledButtonWidths.MIN}
              color={StyledButtonColors.WHITE}
              caps={false}
              onClick={() => setShowsEmailEdit(true)}
              deactivateMargin
            />
          )}
        </StyledDataTextRow>
        {user?.ref && (
          <StyledDataTextRow label="Your referral link">
            {user.ref}
            <StyledButton
              label="Copy link to share"
              size={StyledButtonSizes.SMALL}
              width={StyledButtonWidths.MIN}
              caps={false}
              onClick={() => copy(refLink)}
              isLoading={isCopying}
            />
          </StyledDataTextRow>
        )}
      </StyledDataBox>
    </>
  ) : (
    <></>
  );
}
