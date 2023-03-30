import { BankAccount } from '../../api/definitions/bank-account';
import { Utils } from '../../utils';
import DfxIcon, { IconVariant, IconColors } from '../DfxIcon';

export interface StyledBankAccountListItemProps {
  bankAccount: BankAccount;
}

export default function StyledBankAccountListItem({ bankAccount }: StyledBankAccountListItemProps) {
  const isLabelAvailable = bankAccount.label && bankAccount.label.length > 0;
  return (
    <div className="flex gap-3 mb-3 last:mb-0 rounded py-1 px-3 hover:bg-dfxGray-400/50 ">
      <div className="place-self-center">
        <DfxIcon icon={IconVariant.BANK} color={IconColors.BLACK} />
      </div>
      <div className="flex flex-col justify-center h-[42px]">
        {isLabelAvailable && <p className="text-dfxGray-800 text-xs">{bankAccount.label}</p>}
        <p className="text-dfxBlue-800">{Utils.formatIban(bankAccount.iban)}</p>
      </div>
    </div>
  );
}
