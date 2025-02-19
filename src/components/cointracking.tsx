import { ApiError, TransactionFilterKey, useUserContext } from '@dfx.swiss/react';
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
  const { filterCT, keyCT, generateKeyCT, deleteKeyCT, updateFilterCT } = useUserContext();
  const { lang } = useAppParams();
  const { translate } = useSettingsContext();
  const { width } = useWindowContext();
  const [error, setError] = useState<string>();
  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [apiSecret, setApiSecret] = useState<string | undefined>(undefined);

  const filterOptions = [
    {
      key: 'all',
      label: 'All',
      value: 'Transfer all data',
    },
    {
      key: 'filtered',
      label: 'Filtered',
      value: 'Transfer filtered data',
    },
  ] as FilterMode[];

  const filterTypes = [
    {
      key: 'buy',
      label: 'Buy',
      value: 'Buy transactions',
    },
    {
      key: 'sell',
      label: 'Sell',
      value: 'Sell transactions',
    },
    {
      key: 'staking',
      label: 'Staking',
      value: 'Staking transactions',
    },
    {
      key: 'ref',
      label: 'Referral',
      value: 'Referral rewards',
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
    if (!filterMode) {
      setValue('filterMode', filterOptions[filterCT?.length ? 1 : 0]);
      setValue(
        'filter',
        filterTypes.filter((f) => filterCT?.includes(f.key)),
      );
    }
  }, [filterMode, filterCT]);

  useEffect(() => {
    if (filterMode === 'all' && filterCT?.length) {
      setValue('filter', undefined);
      updateFilter();
    }
  }, [filterMode, filterCT]);

  useEffect(() => {
    if (filter && !equalKeys(filterCT, filter)) {
      updateFilter(filter);
    }
  }, [filter, filterCT]);

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
    generateKeyCT(filterCT)
      .then((keys) => setApiSecret(keys?.secret))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsKeyLoading(false));
  };

  const onDeleteKey = () => {
    setIsKeyLoading(true);
    deleteKeyCT()
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsKeyLoading(false));
  };

  const updateFilter = (types?: TransactionFilterKey[]) => {
    updateFilterCT(types)
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
          {keyCT == null ? (
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
                    <p>{blankedAddress(keyCT, { width })}</p>
                    <StyledIconButton icon={IconVariant.COPY} onClick={() => copy(keyCT ?? '')} />
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
                placeholder={translate('general/actions', 'Select') + '...'}
                items={filterOptions}
                labelFunc={(item) => translate('screens/payment', item.label)}
                descriptionFunc={(item) => translate('screens/payment', item.value)}
              />
              {filterMode === 'filtered' && (
                <StyledDropdownMultiChoice
                  name="filter"
                  rootRef={rootRef}
                  placeholder={translate('general/actions', 'Select data to import...')}
                  items={filterTypes}
                  labelFunc={(item) => translate('screens/payment', item.label)}
                  descriptionFunc={(item) => translate('screens/payment', item.value)}
                />
              )}
            </StyledVerticalStack>
          </Form>
        </>
      )}
    </StyledVerticalStack>
  );
}
