import { useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { ButtonGroup } from './button-group';
import { DepositInterface } from './deposit-interface';
import { ReceiveInterface } from './receive-interface';
import { SwapInterface } from './swap-interface';

enum TransactionMode {
  DEPOSIT = 'deposit',
  RECEIVE = 'receive',
  SWAP = 'swap',
}

export const SafeTransactionInterface = () => {
  const { translate } = useSettingsContext();
  const [mode, setMode] = useState<TransactionMode>(TransactionMode.DEPOSIT);

  return (
    <div>
      <div className="mb-2">
        <ButtonGroup<TransactionMode>
          items={[TransactionMode.DEPOSIT, TransactionMode.RECEIVE, TransactionMode.SWAP]}
          selected={mode}
          onClick={setMode}
          buttonLabel={(mode) => {
            switch (mode) {
              case TransactionMode.DEPOSIT:
                return translate('screens/safe', 'Deposit');
              case TransactionMode.RECEIVE:
                return translate('screens/safe', 'Receive');
              case TransactionMode.SWAP:
                return translate('screens/safe', 'Swap');
            }
          }}
          isHeader={true}
        />
      </div>
      {mode === TransactionMode.DEPOSIT && <DepositInterface />}
      {mode === TransactionMode.RECEIVE && <ReceiveInterface />}
      {mode === TransactionMode.SWAP && <SwapInterface />}
    </div>
  );
};
