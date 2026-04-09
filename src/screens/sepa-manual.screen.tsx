import { ApiError, Country, useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledSearchDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useSettingsContext } from '../contexts/settings.context';
import { useAdminGuard } from '../hooks/guard.hook';

enum CreditDebitIndicator {
  CRDT = 'CRDT',
  DBIT = 'DBIT',
}

interface ManualBankTxForm {
  bookingDate: string;
  valueDate: string;
  amount: string;
  currency: string;
  direction: CreditDebitIndicator;
  accountIban: string;
  accountOwner: string;
  accountBank: string;
  name: string;
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
  country: Country;
  iban: string;
  remittanceInfo: string;
}

const CURRENCIES = ['EUR', 'CHF', 'USD'];

function escapeXml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildPartyXml(name: string, address?: { street?: string; houseNumber?: string; zip?: string; city?: string; country?: string }): string {
  const hasAddress = address?.street || address?.houseNumber || address?.zip || address?.city || address?.country;

  const addressXml = hasAddress
    ? [
        '<PstlAdr>',
        address?.street ? `<StrtNm>${escapeXml(address.street)}</StrtNm>` : '',
        address?.houseNumber ? `<BldgNb>${escapeXml(address.houseNumber)}</BldgNb>` : '',
        address?.zip ? `<PstCd>${escapeXml(address.zip)}</PstCd>` : '',
        address?.city ? `<TwnNm>${escapeXml(address.city)}</TwnNm>` : '',
        address?.country ? `<Ctry>${escapeXml(address.country)}</Ctry>` : '',
        '</PstlAdr>',
      ]
        .filter(Boolean)
        .join('')
    : '';

  return `<Nm>${escapeXml(name)}</Nm>${addressXml}`;
}

function buildCamt053Xml(data: ManualBankTxForm): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const isoTimestamp = now.toISOString().replace('Z', '+00:00');
  const ref = `${Date.now()}`;
  const amount = parseFloat(data.amount).toFixed(2);
  const isCredit = data.direction === CreditDebitIndicator.CRDT;

  const accountIban = data.accountIban.replace(/\s/g, '');
  const accountOwner = data.accountOwner;
  const accountBank = data.accountBank;

  const counterpartyAddress = {
    street: data.street,
    houseNumber: data.houseNumber,
    zip: data.zip,
    city: data.city,
    country: data.country?.symbol,
  };
  const cleanIban = data.iban.replace(/\s/g, '');

  const debtorXml = isCredit
    ? `<Dbtr>${buildPartyXml(data.name, counterpartyAddress)}</Dbtr>
                            <DbtrAcct><Id><IBAN>${escapeXml(cleanIban)}</IBAN></Id></DbtrAcct>`
    : `<Dbtr><Nm>${escapeXml(accountOwner)}</Nm></Dbtr>
                            <DbtrAcct><Id><IBAN>${escapeXml(accountIban)}</IBAN></Id></DbtrAcct>`;

  const creditorXml = isCredit
    ? `<Cdtr><Nm>${escapeXml(accountOwner)}</Nm></Cdtr>
                            <CdtrAcct><Id><IBAN>${escapeXml(accountIban)}</IBAN></Id></CdtrAcct>`
    : `<Cdtr>${buildPartyXml(data.name, counterpartyAddress)}</Cdtr>
                            <CdtrAcct><Id><IBAN>${escapeXml(cleanIban)}</IBAN></Id></CdtrAcct>`;

  const txCode = isCredit
    ? '<Cd>RCDT</Cd><SubFmlyCd>XBCT</SubFmlyCd>'
    : '<Cd>ICDT</Cd><SubFmlyCd>DMCT</SubFmlyCd>';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Document xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:camt.053.001.04 camt.053.001.04.xsd" xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.04" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <BkToCstmrStmt>
        <GrpHdr>
            <MsgId>MSG-C053-${timestamp}-01</MsgId>
            <CreDtTm>${isoTimestamp}</CreDtTm>
            <AddtlInf>PRODUCTIVE</AddtlInf>
        </GrpHdr>
        <Stmt>
            <Id>STM-C053-${timestamp}-01</Id>
            <ElctrncSeqNb>1</ElctrncSeqNb>
            <CreDtTm>${isoTimestamp}</CreDtTm>
            <FrToDt>
                <FrDtTm>${data.bookingDate}T00:00:00.000+00:00</FrDtTm>
                <ToDtTm>${data.bookingDate}T23:59:59.999+00:00</ToDtTm>
            </FrToDt>
            <Acct>
                <Id>
                    <IBAN>${escapeXml(accountIban)}</IBAN>
                </Id>
                <Ownr>
                    <Nm>${escapeXml(accountOwner)}</Nm>
                </Ownr>
                <Svcr>
                    <FinInstnId>
                        <Nm>${escapeXml(accountBank)}</Nm>
                    </FinInstnId>
                </Svcr>
            </Acct>
            <Bal>
                <Tp>
                    <CdOrPrtry>
                        <Cd>OPBD</Cd>
                    </CdOrPrtry>
                </Tp>
                <Amt Ccy="${escapeXml(data.currency)}">0</Amt>
                <CdtDbtInd>CRDT</CdtDbtInd>
                <Dt>
                    <Dt>${data.bookingDate}</Dt>
                </Dt>
            </Bal>
            <Bal>
                <Tp>
                    <CdOrPrtry>
                        <Cd>CLBD</Cd>
                    </CdOrPrtry>
                </Tp>
                <Amt Ccy="${escapeXml(data.currency)}">0</Amt>
                <CdtDbtInd>CRDT</CdtDbtInd>
                <Dt>
                    <Dt>${data.bookingDate}</Dt>
                </Dt>
            </Bal>
            <Ntry>
                <Amt Ccy="${escapeXml(data.currency)}">${amount}</Amt>
                <CdtDbtInd>${data.direction}</CdtDbtInd>
                <RvslInd>false</RvslInd>
                <Sts>BOOK</Sts>
                <BookgDt>
                    <Dt>${data.bookingDate}</Dt>
                </BookgDt>
                <ValDt>
                    <Dt>${data.valueDate}</Dt>
                </ValDt>
                <AcctSvcrRef>${ref}</AcctSvcrRef>
                <BkTxCd>
                    <Domn>
                        <Cd>PMNT</Cd>
                        <Fmly>
                            ${txCode}
                        </Fmly>
                    </Domn>
                    <Prtry>
                        <Cd>1000</Cd>
                    </Prtry>
                </BkTxCd>
                <AmtDtls>
                    <TxAmt>
                        <Amt Ccy="${escapeXml(data.currency)}">${amount}</Amt>
                    </TxAmt>
                </AmtDtls>
                <NtryDtls>
                    <TxDtls>
                        <Amt Ccy="${escapeXml(data.currency)}">${amount}</Amt>
                        <CdtDbtInd>${data.direction}</CdtDbtInd>
                        <BkTxCd>
                            <Domn>
                                <Cd>PMNT</Cd>
                                <Fmly>
                                    ${txCode}
                                </Fmly>
                            </Domn>
                        </BkTxCd>
                        <RltdPties>
                            ${debtorXml}
                            ${creditorXml}
                        </RltdPties>
                        <RmtInf>
                            <Ustrd>${escapeXml(data.remittanceInfo)}</Ustrd>
                        </RmtInf>
                    </TxDtls>
                </NtryDtls>
                <AddtlNtryInf>${isCredit ? 'Gutschrift' : 'Zahlung'} ${escapeXml(data.name)}</AddtlNtryInf>
            </Ntry>
        </Stmt>
    </BkToCstmrStmt>
</Document>`;
}

export default function SepaManualScreen(): JSX.Element {
  const { translate, translateError, allowedCountries } = useSettingsContext();
  const { call } = useApi();
  const { rootRef } = useLayoutContext();

  const [isUploading, setIsUploading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [error, setError] = useState<string>();

  useAdminGuard();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, errors },
  } = useForm<ManualBankTxForm>({
    mode: 'onChange',
    defaultValues: {
      currency: 'EUR',
      direction: CreditDebitIndicator.CRDT,
    },
  });

  function onSubmit(data: ManualBankTxForm) {
    const xml = buildCamt053Xml(data);
    const file = new File([xml], 'manual-bank-tx.xml', { type: 'text/xml' });

    const fileData = new FormData();
    fileData.append('files', file);

    setIsUploading(true);
    setError(undefined);
    call({
      url: 'bankTx',
      method: 'POST',
      data: fileData,
      noJson: true,
    })
      .then(() => {
        setIsUploading(false);
        toggleNotification();
        reset();
      })
      .catch((e: ApiError) => {
        setIsUploading(false);
        setError(e.message);
      });
  }

  const toggleNotification = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const rules = Utils.createRules({
    bookingDate: [Validations.Required],
    valueDate: [Validations.Required],
    amount: [Validations.Required],
    currency: [Validations.Required],
    direction: [Validations.Required],
    accountIban: [Validations.Required],
    accountOwner: [Validations.Required],
    accountBank: [Validations.Required],
    name: [Validations.Required],
    iban: [Validations.Required],
    remittanceInfo: [Validations.Required],
  });

  useLayoutOptions({ title: translate('screens/kyc', 'Manual bank transaction') });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <StyledVerticalStack gap={2} full>
          <p className="flex flex-row justify-between w-full text-dfxGray-700 text-xs font-semibold uppercase text-start px-3">
            <span>{translate('screens/kyc', 'Transaction details')}</span>
            <span
              className={`flex flex-row gap-1 items-center text-dfxRed-100 font-normal transition-opacity duration-200 ${
                showNotification ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <DfxIcon icon={IconVariant.CHECK} size={IconSize.SM} />
              {translate('screens/kyc', 'Uploaded')}
            </span>
          </p>

          <StyledInput name="bookingDate" type="date" label={translate('screens/kyc', 'Booking date')} full smallLabel />
          <StyledInput name="valueDate" type="date" label={translate('screens/kyc', 'Value date')} full smallLabel />
          <StyledInput name="amount" type="number" label={translate('screens/kyc', 'Amount')} placeholder="0.00" full smallLabel />
          <StyledDropdown
            name="currency"
            label={translate('screens/kyc', 'Currency')}
            items={CURRENCIES}
            labelFunc={(item) => item}
            full
            smallLabel
          />
          <StyledDropdown
            name="direction"
            label={translate('screens/kyc', 'Direction')}
            items={Object.values(CreditDebitIndicator)}
            labelFunc={(item) => (item === CreditDebitIndicator.CRDT ? 'Credit (incoming)' : 'Debit (outgoing)')}
            full
            smallLabel
          />
        </StyledVerticalStack>

        <StyledVerticalStack gap={2} full>
          <p className="w-full text-dfxGray-700 text-xs font-semibold uppercase text-start px-3">
            {translate('screens/kyc', 'Account')}
          </p>

          <StyledInput name="accountOwner" label={translate('screens/kyc', 'Account owner')} placeholder="DFX AG" full smallLabel />
          <StyledInput name="accountIban" label={translate('screens/kyc', 'Account IBAN')} placeholder="CH78 8080 8002 6086 1409 2" full smallLabel />
          <StyledInput name="accountBank" label={translate('screens/kyc', 'Bank name')} placeholder="Raiffeisenbank" full smallLabel />
        </StyledVerticalStack>

        <StyledVerticalStack gap={2} full>
          <p className="w-full text-dfxGray-700 text-xs font-semibold uppercase text-start px-3">
            {translate('screens/kyc', 'Counterparty')}
          </p>

          <StyledInput name="name" autocomplete="name" label={translate('screens/kyc', 'Name')} placeholder={translate('screens/kyc', 'John Doe')} full smallLabel />
          <StyledHorizontalStack gap={2}>
            <StyledInput
              name="street"
              autocomplete="street"
              label={translate('screens/kyc', 'Street')}
              placeholder={translate('screens/kyc', 'Street')}
              full
              smallLabel
            />
            <StyledInput
              name="houseNumber"
              autocomplete="house-number"
              label={translate('screens/kyc', 'House nr.')}
              placeholder="xx"
              small
              smallLabel
            />
          </StyledHorizontalStack>
          <StyledHorizontalStack gap={2}>
            <StyledInput
              name="zip"
              autocomplete="zip"
              label={translate('screens/kyc', 'ZIP code')}
              placeholder="12345"
              small
              smallLabel
            />
            <StyledInput
              name="city"
              autocomplete="city"
              label={translate('screens/kyc', 'City')}
              placeholder={translate('screens/kyc', 'City')}
              full
              smallLabel
            />
          </StyledHorizontalStack>
          <StyledSearchDropdown<Country>
            rootRef={rootRef}
            name="country"
            autocomplete="country"
            label={translate('screens/kyc', 'Country')}
            placeholder={translate('general/actions', 'Select') + '...'}
            items={allowedCountries}
            labelFunc={(item) => item.name}
            filterFunc={(i, s) => !s || [i.name, i.symbol].some((w) => w.toLowerCase().includes(s.toLowerCase()))}
            matchFunc={(i, s) => i.name.toLowerCase() === s?.toLowerCase()}
            full
            smallLabel
          />
          <StyledInput name="iban" label={translate('screens/kyc', 'IBAN')} placeholder="DE89 3704 0044 0532 0130 00" full smallLabel />
        </StyledVerticalStack>

        <StyledVerticalStack gap={2} full>
          <p className="w-full text-dfxGray-700 text-xs font-semibold uppercase text-start px-3">
            {translate('screens/kyc', 'Payment details')}
          </p>

          <StyledInput
            name="remittanceInfo"
            label={translate('screens/kyc', 'Remittance info')}
            placeholder="XXXX-XXXX-XXXX"
            full
            smallLabel
          />
        </StyledVerticalStack>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          label={translate('general/actions', 'Next')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isUploading}
        />
      </StyledVerticalStack>
    </Form>
  );
}
