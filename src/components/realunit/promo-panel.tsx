import { SpinnerSize, StyledButton, StyledButtonWidth, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { FormEvent, useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { RealUnitPromoCode } from 'src/dto/realunit-referral.dto';
import { useRealunitReferral } from 'src/hooks/realunit-referral.hook';

interface PromoPanelProps {
  translate: (ns: string, key: string) => string;
}

export function RealunitPromoPanel({ translate }: PromoPanelProps): JSX.Element {
  const { getPromoCodes, createPromoCode, deactivatePromoCode } = useRealunitReferral();

  const [codes, setCodes] = useState<RealUnitPromoCode[]>();
  const [listError, setListError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number>();

  const [code, setCode] = useState('');
  const [redemptionCap, setRedemptionCap] = useState('');
  const [minBuyRealu, setMinBuyRealu] = useState('200');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  useEffect(() => {
    loadCodes();
  }, []);

  function loadCodes(): void {
    setIsLoading(true);
    setListError(undefined);
    getPromoCodes()
      .then(setCodes)
      .catch((e: Error) => {
        setCodes(undefined);
        setListError(e.message ?? 'Unknown error');
      })
      .finally(() => setIsLoading(false));
  }

  const cap = Number(redemptionCap);
  const minBuy = Number(minBuyRealu);
  const canSubmit =
    code.trim().length > 0 &&
    Number.isInteger(cap) &&
    cap >= 1 &&
    Number.isInteger(minBuy) &&
    minBuy >= 1 &&
    validFrom.length > 0 &&
    validUntil.length > 0 &&
    validUntil >= validFrom &&
    !isSubmitting;

  function onSubmit(event?: FormEvent): void {
    event?.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setFormError(undefined);
    createPromoCode({
      code: code.trim(),
      redemptionCap: cap,
      minBuyRealu: minBuy,
      validFrom: new Date(`${validFrom}T00:00:00.000Z`).toISOString(),
      validUntil: new Date(`${validUntil}T23:59:59.000Z`).toISOString(),
    })
      .then((created) => {
        setCodes((prev) => [created, ...(prev ?? [])]);
        setCode('');
        setRedemptionCap('');
        setMinBuyRealu('200');
        setValidFrom('');
        setValidUntil('');
      })
      .catch((e: Error) => setFormError(e.message ?? 'Unknown error'))
      .finally(() => setIsSubmitting(false));
  }

  function onDeactivate(id: number): void {
    setDeactivatingId(id);
    setListError(undefined);
    deactivatePromoCode(id)
      .then(() =>
        setCodes((prev) =>
          (prev ?? []).map((row) => (row.id === id ? { ...row, deactivatedAt: new Date().toISOString() } : row)),
        ),
      )
      .catch((e: Error) => setListError(e.message ?? 'Unknown error'))
      .finally(() => setDeactivatingId(undefined));
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-4 text-left">
      <h2 className="text-dfxGray-700">{translate('screens/referral', 'Start promo code')}</h2>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1 text-sm text-dfxBlue-800">
          {translate('screens/referral', 'Code')}
          <input
            className="border border-dfxGray-400 rounded px-2 py-1"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={256}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-dfxBlue-800">
          {translate('screens/referral', 'Redemption cap')}
          <input
            className="border border-dfxGray-400 rounded px-2 py-1"
            type="number"
            min={1}
            step={1}
            value={redemptionCap}
            onChange={(e) => setRedemptionCap(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-dfxBlue-800">
          {translate('screens/referral', 'Minimum buy (REALU)')}
          <input
            className="border border-dfxGray-400 rounded px-2 py-1"
            type="number"
            min={1}
            step={1}
            value={minBuyRealu}
            onChange={(e) => setMinBuyRealu(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-dfxBlue-800">
          {translate('screens/referral', 'Valid from')}
          <input
            className="border border-dfxGray-400 rounded px-2 py-1"
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-dfxBlue-800">
          {translate('screens/referral', 'Valid until')}
          <input
            className="border border-dfxGray-400 rounded px-2 py-1"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </label>
        <StyledButton
          label={translate('screens/referral', 'Start')}
          onClick={() => onSubmit()}
          width={StyledButtonWidth.MIN}
          disabled={!canSubmit}
          isLoading={isSubmitting}
        />
      </form>
      {formError && <ErrorHint message={formError} />}

      <h3 className="text-dfxGray-700 text-sm font-semibold">{translate('screens/referral', 'Promo codes')}</h3>
      {isLoading && <StyledLoadingSpinner size={SpinnerSize.SM} />}
      {listError && <ErrorHint message={listError} />}
      {codes && !isLoading && codes.length === 0 && (
        <p className="text-sm text-dfxGray-700">{translate('screens/referral', 'No promo codes yet')}</p>
      )}
      {codes && codes.length > 0 && (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-dfxGray-300">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/referral', 'Code')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/referral', 'Redemption cap')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/referral', 'Minimum buy (REALU)')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/referral', 'Valid from')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/referral', 'Valid until')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800" />
              </tr>
            </thead>
            <tbody>
              {codes.map((row) => (
                <tr key={row.id} className="border-b border-dfxGray-300">
                  <td className="px-3 py-2 text-dfxBlue-800 break-all">{row.code}</td>
                  <td className="px-3 py-2 text-dfxBlue-800">{row.redemptionCap}</td>
                  <td className="px-3 py-2 text-dfxBlue-800">{row.minBuyRealu}</td>
                  <td className="px-3 py-2 text-dfxBlue-800">{row.validFrom.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-dfxBlue-800">{row.validUntil.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    {row.deactivatedAt ? (
                      <span className="text-dfxGray-700">{translate('screens/referral', 'Deactivated')}</span>
                    ) : (
                      <button
                        type="button"
                        className="text-dfxRed-100 underline text-sm"
                        disabled={deactivatingId === row.id}
                        onClick={() => onDeactivate(row.id)}
                      >
                        {translate('screens/referral', 'Deactivate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
