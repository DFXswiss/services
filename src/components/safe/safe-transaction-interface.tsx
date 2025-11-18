import { useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { ButtonGroup, ButtonGroupSize } from './button-group';
import { DepositInterface } from './deposit-interface';
import { ReceiveInterface } from './receive-interface';
import { SendInterface } from './send-interface';
import { SwapInterface } from './swap-interface';
import { TransactionMode, TransactionType } from './transaction.types';
import { WithdrawInterface } from './withdraw-interface';

export const SafeTransactionInterface = () => {
  const { translate } = useSettingsContext();
  const [mode, setMode] = useState<TransactionMode>(TransactionMode.DEPOSIT);
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.FIAT);

  return (
    <div>
      <div className="mb-2 flex justify-center">
        <ButtonGroup<TransactionMode>
          items={[TransactionMode.DEPOSIT, TransactionMode.WITHDRAW, TransactionMode.SWAP]}
          selected={mode}
          onClick={setMode}
          buttonLabel={(mode) => {
            switch (mode) {
              case TransactionMode.DEPOSIT:
                return translate('screens/safe', 'Deposit');
              case TransactionMode.WITHDRAW:
                return translate('screens/safe', 'Withdraw');
              case TransactionMode.SWAP:
                return translate('screens/safe', 'Swap');
            }
          }}
          isHeader={true}
        />
      </div>
      {[TransactionMode.DEPOSIT, TransactionMode.WITHDRAW].includes(mode) && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-dfxGray-700">{translate('screens/payment', 'Type')}:</span>
          <ButtonGroup<TransactionType>
            items={[TransactionType.FIAT, TransactionType.CRYPTO]}
            selected={transactionType}
            onClick={setTransactionType}
            buttonLabel={(type) =>
              type === TransactionType.FIAT
                ? translate('screens/payment', 'Fiat')
                : translate('screens/payment', 'Crypto')
            }
            size={ButtonGroupSize.SM}
          />
        </div>
      )}
      {mode === TransactionMode.DEPOSIT &&
        (transactionType === TransactionType.FIAT ? <DepositInterface /> : <ReceiveInterface />)}
      {mode === TransactionMode.WITHDRAW &&
        (transactionType === TransactionType.FIAT ? <WithdrawInterface /> : <SendInterface />)}
      {mode === TransactionMode.SWAP && <SwapInterface />}
    </div>
  );
};
