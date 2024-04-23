import { Asset, Blockchain, Fiat, Utils, useFiat } from '@dfx.swiss/react';
import { IconColor, StyledCollapsible, StyledInfoText, StyledVerticalStack } from '@dfx.swiss/react-components';
import { Fees } from '@dfx.swiss/react/dist/definitions/fees';
import { useSettingsContext } from '../contexts/settings.context';

interface ExchangeRateProps {
  exchangeRate: number;
  rate: number;
  fees: Fees;
  feeCurrency: Fiat | Asset;
  from: Fiat | Asset;
  to: Fiat | Asset;
}

export function ExchangeRate({ exchangeRate, rate, fees, feeCurrency, from, to }: ExchangeRateProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { toSymbol } = useFiat();

  const feeSymbol = 'blockchain' in feeCurrency ? ` ${feeCurrency.name}` : toSymbol(feeCurrency);

  const baseRate = `${Utils.formatAmount(exchangeRate)} ${from.name}/${to.name}`;
  const minFee = `, min. ${fees.min}${feeSymbol}`;
  const dfxFee = `${fees.dfx}${feeSymbol} (${(fees.rate * 100).toFixed(2)}%${fees.min ? minFee : ''})`;
  const networkFee = `${fees.network}${feeSymbol}`;

  const l1Replacement =
    'blockchain' in to &&
    (to.blockchain === Blockchain.BITCOIN
      ? 'Lightning'
      : to.blockchain === Blockchain.ETHEREUM
      ? 'Arbitrum / Optimism'
      : undefined);

  return (
    <StyledCollapsible
      full
      label={translate('screens/payment', 'Exchange rate')}
      title={`${rate === Number.MAX_VALUE ? '∞' : Utils.formatAmount(rate)} ${from.name}/${to.name}`}
    >
      <StyledVerticalStack gap={2}>
        <div className="grid gap-1 w-full text-sm grid-cols-[8rem_1fr]">
          <div className="text-dfxGray-800">{translate('screens/payment', 'Base rate')}</div>
          <div>{baseRate}</div>
          <div className="text-dfxGray-800">{translate('screens/payment', 'DFX fee')}</div>
          <div>{dfxFee}</div>
          <div className="text-dfxGray-800">{translate('screens/payment', 'Network fee')}</div>
          <StyledVerticalStack>
            <div>{networkFee}</div>
            {l1Replacement && (
              <div className="mt-1 text-xs text-dfxGray-700 leading-tight">
                {translate(
                  'screens/buy',
                  'Use {{chain}} as a Layer 2 solution to benefit from lower transaction fees',
                  { chain: l1Replacement },
                )}
              </div>
            )}
          </StyledVerticalStack>
        </div>
        <StyledInfoText iconColor={IconColor.GRAY} discreet>
          {translate(
            'screens/payment',
            'This exchange rate is not guaranteed. The effective rate will be determined once the transactions have been received by DFX and the crypto assets can be delivered.',
          )}
        </StyledInfoText>
      </StyledVerticalStack>
    </StyledCollapsible>
  );
}
