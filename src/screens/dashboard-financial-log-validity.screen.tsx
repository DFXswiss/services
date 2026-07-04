import { useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDateAndTimePicker,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

interface IdFormData {
  id: string;
}

interface RangeFormData {
  from?: Date;
  to?: Date;
  min: string;
  max: string;
}

interface LogValidityResponse {
  id: number;
  valid: boolean;
}

interface FinancialValidityRequest {
  from?: string;
  to?: string;
  min?: number;
  max?: number;
  valid: boolean;
}

export default function DashboardFinancialLogValidityScreen(): JSX.Element {
  useAdminGuard();

  const { translateError } = useSettingsContext();
  const { call } = useApi();

  // --- Section A: by log ID -------------------------------------------------
  const {
    control: idControl,
    handleSubmit: handleIdSubmit,
    formState: { errors: idErrors },
    reset: resetId,
  } = useForm<IdFormData>({ mode: 'onTouched', defaultValues: { id: '' } });

  const [idLoading, setIdLoading] = useState(false);
  const [idError, setIdError] = useState<string>();
  const [idSuccess, setIdSuccess] = useState<string>();

  const idRules = Utils.createRules({
    id: [Validations.Required, Validations.Custom((value) => (/^\d+$/.test(String(value)) ? true : 'pattern'))],
  });

  async function onSubmitId(data: IdFormData, valid: boolean) {
    setIdLoading(true);
    setIdError(undefined);
    setIdSuccess(undefined);

    try {
      const response = await call<LogValidityResponse>({
        url: `log/${+data.id}`,
        method: 'PUT',
        data: { valid },
      });
      setIdSuccess(`Saved: log #${response.id} set to valid = ${valid}`);
      setTimeout(() => setIdSuccess(undefined), 4000);
      resetId();
    } catch (e) {
      setIdError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIdLoading(false);
    }
  }

  // --- Section B: by financial range / threshold ----------------------------
  const {
    control: rangeControl,
    handleSubmit: handleRangeSubmit,
    formState: { errors: rangeErrors },
    reset: resetRange,
  } = useForm<RangeFormData>({
    mode: 'onTouched',
    defaultValues: { min: '', max: '' },
  });

  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string>();
  const [rangeSuccess, setRangeSuccess] = useState<string>();

  async function onSubmitRange(data: RangeFormData, valid: boolean) {
    setRangeError(undefined);
    setRangeSuccess(undefined);

    const { from, to } = data;
    const minStr = data.min.trim();
    const maxStr = data.max.trim();

    const hasMin = minStr !== '';
    const hasMax = maxStr !== '';

    if (!from && !to && !hasMin && !hasMax) {
      setRangeError('At least one filter is required (from, to, min or max).');
      return;
    }

    if (from && to && from.getTime() > to.getTime()) {
      setRangeError("'from' must be earlier than or equal to 'to'.");
      return;
    }

    const min = hasMin ? Number(minStr) : undefined;
    const max = hasMax ? Number(maxStr) : undefined;

    if (min !== undefined && isNaN(min)) {
      setRangeError("'min' must be a number.");
      return;
    }
    if (max !== undefined && isNaN(max)) {
      setRangeError("'max' must be a number.");
      return;
    }
    if (min !== undefined && max !== undefined && min >= max) {
      setRangeError("'min' must be less than 'max'.");
      return;
    }

    // The picker yields a Date in the browser's local time; toISOString() sends the
    // unambiguous UTC instant the backend expects.
    const payload: FinancialValidityRequest = { valid };
    if (from) payload.from = from.toISOString();
    if (to) payload.to = to.toISOString();
    if (min !== undefined) payload.min = min;
    if (max !== undefined) payload.max = max;

    setRangeLoading(true);
    try {
      const response = await call<{ affected: number }>({
        url: 'log/financial/validity',
        method: 'PUT',
        data: payload,
      });
      setRangeSuccess(
        `Updated ${response.affected} ${response.affected === 1 ? 'entry' : 'entries'} to valid = ${valid}.`,
      );
      setTimeout(() => setRangeSuccess(undefined), 4000);
      resetRange();
    } catch (e) {
      setRangeError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setRangeLoading(false);
    }
  }

  useLayoutOptions({ title: 'Log Validity', noMaxWidth: true });

  return (
    <div className="space-y-6 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      {/* Section A: by log ID */}
      <div className="bg-white rounded-lg shadow p-6 max-w-xl">
        <h2 className="text-lg font-semibold mb-1">By log ID</h2>
        <p className="text-sm text-gray-500 mb-4">Set the validity of any single log entry by its ID.</p>

        <Form control={idControl} rules={idRules} errors={idErrors} translate={translateError} hasFormElement={false}>
          <StyledVerticalStack gap={4} full>
            <StyledInput name="id" type="number" label="Log ID" placeholder="1234" full smallLabel />

            {idError && <ErrorHint message={idError} />}

            <StyledButton
              label="Set valid = true"
              color={StyledButtonColor.GREEN}
              onClick={handleIdSubmit((data) => onSubmitId(data, true))}
              width={StyledButtonWidth.FULL}
              isLoading={idLoading}
              disabled={idLoading}
            />
            <StyledButton
              label="Set valid = false"
              color={StyledButtonColor.RED}
              onClick={handleIdSubmit((data) => onSubmitId(data, false))}
              width={StyledButtonWidth.FULL}
              isLoading={idLoading}
              disabled={idLoading}
            />

            {idSuccess && (
              <p className="flex flex-row gap-1 items-center font-medium" style={{ color: '#16a34a' }}>
                <DfxIcon icon={IconVariant.CHECK} size={IconSize.SM} />
                {idSuccess}
              </p>
            )}
          </StyledVerticalStack>
        </Form>
      </div>

      {/* Section B: by financial range / threshold */}
      <div className="bg-white rounded-lg shadow p-6 max-w-xl">
        <h2 className="text-lg font-semibold mb-1">By financial range / threshold</h2>
        <p className="text-sm text-gray-500 mb-4">
          Bulk-update the validity of financial data logs. At least one filter is required. Dates are picked in your
          local time and sent as UTC; from is inclusive, to is exclusive. min/max apply exclusively to totalBalanceChf.
        </p>

        <Form control={rangeControl} errors={rangeErrors} translate={translateError} hasFormElement={false}>
          <StyledVerticalStack gap={4} full>
            <StyledDateAndTimePicker name="from" label="From (created >=)" smallLabel />
            <StyledDateAndTimePicker name="to" label="To (created <)" smallLabel />
            <StyledInput name="min" type="number" label="Min totalBalanceChf (exclusive)" placeholder="0" full smallLabel />
            <StyledInput name="max" type="number" label="Max totalBalanceChf (exclusive)" placeholder="0" full smallLabel />

            {rangeError && <ErrorHint message={rangeError} />}

            <StyledButton
              label="Set valid = true"
              color={StyledButtonColor.GREEN}
              onClick={handleRangeSubmit((data) => onSubmitRange(data, true))}
              width={StyledButtonWidth.FULL}
              isLoading={rangeLoading}
              disabled={rangeLoading}
            />
            <StyledButton
              label="Set valid = false"
              color={StyledButtonColor.RED}
              onClick={handleRangeSubmit((data) => onSubmitRange(data, false))}
              width={StyledButtonWidth.FULL}
              isLoading={rangeLoading}
              disabled={rangeLoading}
            />

            {rangeSuccess && (
              <p className="flex flex-row gap-1 items-center font-medium" style={{ color: '#16a34a' }}>
                <DfxIcon icon={IconVariant.CHECK} size={IconSize.SM} />
                {rangeSuccess}
              </p>
            )}
          </StyledVerticalStack>
        </Form>
      </div>
    </div>
  );
}
