import { ApiError, TransactionFilterKey, useUser, useUserContext } from '@dfx.swiss/react';
import {
  AlignContent,
  Form,
  IconVariant,
  StyledButton,
  StyledButtonColor,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledDropdownMultiChoice,
  StyledIconButton,
  StyledSpacer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { blankedAddress } from 'src/util/utils';
import { ErrorHint } from './error-hint';

interface FilterMode {
  key: 'all' | 'filtered';
  label: string;
  value: string;
}

interface Filter {
  key: TransactionFilterKey;
  label: string;
  value: string;
}

interface FormData {
  filterMode?: FilterMode;
  filter?: Filter[];
}

const equalKeys = (a: TransactionFilterKey[] | undefined, b: TransactionFilterKey[] | undefined) =>
  !(a || b) || (a && b && a.length === b.length && a.every((v) => b.includes(v)));

export default function CoinTracking({ rootRef }: { rootRef: React.RefObject<HTMLDivElement> }) {
  const { user, reloadUser } = useUserContext();
  const { lang } = useAppParams();
  const { translate } = useSettingsContext();
  const { width } = useWindowContext();
  const { apiFilterCT, apiKeyCT } = user?.activeAddress ?? {};
  const { generateCTApiKey, deleteCTApiKey, updateCTApiFilter } = useUser();
  const [error, setError] = useState<string>();
  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const [apiSecret, setApiSecret] = useState<string | undefined>(undefined);
  const [showNotification, setShowNotification] = useState(false);

  const filterOptions = [
    {
      key: 'all',
      label: translate('screens/payment', 'All'),
      value: translate('screens/payment', 'Transfer all data'),
    },
    {
      key: 'filtered',
      label: translate('screens/payment', 'Filtered'),
      value: translate('screens/payment', 'Transfer filtered data'),
    },
  ] as FilterMode[];

  const filterTypes = [
    {
      key: 'buy',
      label: translate('screens/payment', 'Buy'),
      value: translate('screens/payment', 'Buy transactions'),
    },
    {
      key: 'sell',
      label: translate('screens/payment', 'Sell'),
      value: translate('screens/payment', 'Sell transactions'),
    },
    {
      key: 'staking',
      label: translate('screens/payment', 'Staking'),
      value: translate('screens/payment', 'Staking transactions'),
    },
    {
      key: 'ref',
      label: translate('screens/payment', 'Referral'),
      value: translate('screens/payment', 'Referral rewards'),
    },
  ] as Filter[];

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>({ mode: 'onTouched' });

  const filterMode = useWatch({ control, name: 'filterMode' })?.key;
  const filter = useWatch({ control, name: 'filter' })?.map((f) => f.key);

  useEffect(() => {
    if (!filter) {
      setValue('filterMode', filterOptions[apiFilterCT?.length ? 1 : 0]);
      setValue(
        'filter',
        filterTypes.filter((f) => apiFilterCT?.includes(f.key)),
      );
    }
  }, [apiFilterCT]);

  useEffect(() => {
    if (filterMode === 'all' && apiFilterCT?.length) {
      setValue('filter', undefined);
      updateFilter();
    }
  }, [filterMode]);

  useEffect(() => {
    if (filter && !equalKeys(apiFilterCT, filter)) {
      updateFilter(filter);
    }
  }, [filter]);

  const toggleNotification = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const onOpenCt = () => {
    let url = 'https://cointracking.info/?ref=D270827';
    url += lang ? `&language=${lang.toLowerCase()}` : '';
    window.open(url, '_blank');
  };

  const onGenerateKey = () => {
    setIsKeyLoading(true);
    generateCTApiKey(apiFilterCT)
      .then((keys) => {
        reloadUser();
        setApiSecret(keys.secret);
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsKeyLoading(false));
  };

  const onDeleteKey = () => {
    setIsKeyLoading(true);
    deleteCTApiKey()
      .then(() => reloadUser())
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsKeyLoading(false));
  };

  const updateFilter = (types?: TransactionFilterKey[]) => {
    updateCTApiFilter(types)
      .then(() => reloadUser())
      .then(() => toggleNotification())
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  };

  return (
    <StyledVerticalStack gap={4} full className="text-dfxBlue-700">
      {error ? (
        <div>
          <ErrorHint message={error} />
        </div>
      ) : (
        <>
          <p>{translate('screens/payment', 'You can link your DFX account to your Cointracking account.')}</p>
          <StyledButton
            label={translate('screens/payment', 'Cointracking homepage')}
            onClick={onOpenCt}
            color={StyledButtonColor.STURDY_WHITE}
          />
          {apiKeyCT == null ? (
            <StyledVerticalStack gap={3} full>
              <StyledButton
                label={translate('screens/payment', 'Generate API key')}
                onClick={onGenerateKey}
                isLoading={isKeyLoading}
              />
            </StyledVerticalStack>
          ) : (
            <StyledVerticalStack gap={4} full>
              <StyledDataTable alignContent={AlignContent.RIGHT} minWidth={false}>
                <StyledDataTableRow label={translate('screens/payment', 'API key')}>
                  <div className="flex flex-row gap-2">
                    <p>{blankedAddress(apiKeyCT, { width })}</p>
                    <StyledIconButton icon={IconVariant.COPY} onClick={() => copy(apiKeyCT ?? '')} />
                  </div>
                </StyledDataTableRow>
                {apiSecret && (
                  <StyledDataTableRow label={translate('screens/payment', 'API secret')}>
                    <p>{blankedAddress(apiSecret, { width })}</p>
                    <StyledIconButton icon={IconVariant.COPY} onClick={() => copy(apiSecret)} />
                  </StyledDataTableRow>
                )}
              </StyledDataTable>

              <StyledButton
                label={translate('screens/payment', 'Delete API key')}
                onClick={onDeleteKey}
                isLoading={isKeyLoading}
              />
            </StyledVerticalStack>
          )}
          <StyledSpacer spacing={0} />

          <Form control={control} errors={errors}>
            <StyledVerticalStack gap={4} full className="relative">
              <div
                className={`absolute text-sm text-dfxRed-100 text-right w-full pr-4 transition-opacity duration-100 ${
                  showNotification ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {translate('screens/payment', 'Saved')}!
              </div>
              <StyledDropdown
                label={translate('screens/payment', 'Import filter')}
                name="filterMode"
                rootRef={rootRef}
                placeholder={translate('general/actions', 'Select...')}
                items={filterOptions}
                labelFunc={(item) => item.label}
                descriptionFunc={(item) => item.value}
              />
              {filterMode === 'filtered' && (
                <StyledDropdownMultiChoice
                  name="filter"
                  rootRef={rootRef}
                  placeholder={translate('general/actions', 'Select data to import...')}
                  items={filterTypes}
                  labelFunc={(item) => item.label}
                  descriptionFunc={(item) => item.value}
                />
              )}
            </StyledVerticalStack>
          </Form>
        </>
      )}
    </StyledVerticalStack>
  );
}
