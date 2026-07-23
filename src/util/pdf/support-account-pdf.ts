import { jsPDF } from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { BankDataInfo, BankTxInfo, TransactionInfo, UserDataDetail } from 'src/hooks/compliance.hook';
import {
  ageFromBirthday,
  COLOR,
  dashIfEmpty,
  drawFooter,
  filenameSafe,
  formatAmount,
  formatDateTimeUtc,
  PdfLang,
  saveWithFilename,
} from './support-pdf-common';

interface AccountLabels {
  bannerLeft: string; // "DFX-Account"
  bannerRight: string; // "Bank-Account ..."
  accountName: string;
  firstLast: string;
  streetHouse: string;
  zipCountry: string;
  city: string;
  citizenshipAge: string;
  userDataId: string;
  accountRiskStatus: string;
  kycStatusLimit: string;
  email: string;
  phone: string;
  accountHolder: string;
  extraInfo: string;
  addressLine1: string;
  addressLine2: string;
  amountReceived: string;
  time: string;
  transactionCol: string;
  buyCryptoId: string;
  txId: string;
  deposit: string;
  refCode: string;
  purpose: string;
  onrampNote: string;
  noBicNote: string;
  fromIban: string;
  onIban: string;
}

const LABELS: Record<PdfLang, AccountLabels> = {
  de: {
    bannerLeft: 'DFX-Account',
    bannerRight: 'Bank-Account  -  inkl. Zusatzinfos zu der betreffenden Banküberweisung  (Onramp = Fiat2Krypto)',
    accountName: 'Account Name',
    firstLast: 'Vorname + Name',
    streetHouse: 'Straße + Hs-Nr.',
    zipCountry: 'PLZ + Land',
    city: 'Wohnort',
    citizenshipAge: 'Staatsbürger von + Age',
    userDataId: 'User Data ID',
    accountRiskStatus: 'Account + Risk Status',
    kycStatusLimit: 'KYC-Status + Limit',
    email: 'Email-Adresse',
    phone: 'Telefon-Nr.',
    accountHolder: 'Konto-Halter',
    extraInfo: 'Zusatz-Angabe',
    addressLine1: 'Adress Zeile 1',
    addressLine2: 'Adress Zeile 2',
    amountReceived: 'Betrag erhalten',
    time: 'Uhrzeit',
    transactionCol: 'Transaktion',
    buyCryptoId: 'Buy Crypto ID',
    txId: 'Tx-ID',
    deposit: 'Einzahlung',
    refCode: 'RefCode',
    purpose: 'Zahlungszweck',
    onrampNote: 'Onramp = Fiat2Krypto',
    noBicNote: '<keine BIC erhalten>',
    fromIban: 'von',
    onIban: 'auf',
  },
  en: {
    bannerLeft: 'DFX-Account',
    bannerRight: 'Bank-Account  -  incl. additional info on the relevant bank transfer  (Onramp = Fiat2Crypto)',
    accountName: 'Account Name',
    firstLast: 'First name + Last name',
    streetHouse: 'Street + Nr.',
    zipCountry: 'ZIP + Country',
    city: 'City',
    citizenshipAge: 'Citizen of + Age',
    userDataId: 'User Data ID',
    accountRiskStatus: 'Account + Risk Status',
    kycStatusLimit: 'KYC Status + Limit',
    email: 'Email Address',
    phone: 'Phone number',
    accountHolder: 'Account Holder',
    extraInfo: 'Additional info',
    addressLine1: 'Address line 1',
    addressLine2: 'Address line 2',
    amountReceived: 'Amount received',
    time: 'Time',
    transactionCol: 'Transaction',
    buyCryptoId: 'Buy Crypto ID',
    txId: 'Tx-ID',
    deposit: 'Deposit',
    refCode: 'RefCode',
    purpose: 'Payment purpose',
    onrampNote: 'Onramp = Fiat2Crypto',
    noBicNote: '<no BIC received>',
    fromIban: 'from',
    onIban: 'on',
  },
};

interface AccountPdfInput {
  userData: UserDataDetail;
  transaction?: TransactionInfo;
  bankTx?: BankTxInfo;
  bankData?: BankDataInfo;
  lang: PdfLang;
}

function pushRow(
  rows: RowInput[],
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string,
): void {
  rows.push([
    { content: leftLabel + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: leftValue },
    { content: rightLabel + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: rightValue },
  ]);
}

export function generateAccountInfoPdf(input: AccountPdfInput): void {
  const { userData: ud, transaction: tx, bankTx, bankData, lang } = input;
  const t = LABELS[lang];
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header banner ---
  const bannerY = 10;
  const bannerH = 8;
  const halfW = (pageWidth - 20) / 2;
  doc.setFillColor(...COLOR.headerBg);
  doc.rect(10, bannerY, halfW, bannerH, 'F');
  doc.rect(10 + halfW, bannerY, halfW, bannerH, 'F');
  doc.setDrawColor(...COLOR.border);
  doc.rect(10, bannerY, halfW, bannerH, 'S');
  doc.rect(10 + halfW, bannerY, halfW, bannerH, 'S');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.text);
  doc.text(t.bannerLeft, 12, bannerY + 5.5);
  doc.text(t.bannerRight, 12 + halfW, bannerY + 5.5);

  // --- Table body ---
  const rows: RowInput[] = [];
  const dfxName = ud.verifiedName ?? [ud.firstname, ud.surname].filter(Boolean).join(' ');
  const streetHouse = [ud.street, ud.houseNumber].filter(Boolean).join(' ');
  const zipCountry = `${dashIfEmpty(ud.zip)}   ${dashIfEmpty(ud.country?.symbol ?? ud.country?.name)}`;
  const kycLimit = `${dashIfEmpty(ud.kycStatus)} · ${dashIfEmpty(ud.kycLevel)}   ${
    ud.depositLimit != null ? formatAmount(ud.depositLimit, 0) + ' CHF' : ''
  }`.trim();
  const accountRisk = `${dashIfEmpty(ud.status)}   ${dashIfEmpty(ud.riskStatus)}`;
  const citizen = `${dashIfEmpty(ud.nationality?.name)}   ${ageFromBirthday(ud.birthday)}`;

  const bank = bankData ?? undefined;
  const bankHolder = bank?.name ?? bankTx?.name ?? '-';
  const receivedDt = tx?.created ? formatDateTimeUtc(tx.created) : { date: '-', time: '-' };
  const txCell = `${dashIfEmpty(tx?.buyCryptoId ?? tx?.buyFiatId)}   /   ${dashIfEmpty(tx?.id)}`;
  const inputAmountCell =
    tx?.inputAmount != null ? `${formatAmount(tx.inputAmount)} ${dashIfEmpty(tx.inputAsset)}` : '-';

  pushRow(rows, t.accountName, dfxName || '-', t.accountHolder, bankHolder);
  pushRow(rows, t.firstLast, dashIfEmpty([ud.firstname, ud.surname].filter(Boolean).join(' ')), t.extraInfo, '');
  pushRow(rows, t.streetHouse, streetHouse || '-', t.addressLine1, dashIfEmpty(bank?.iban));
  pushRow(rows, t.zipCountry, zipCountry, t.addressLine2, '');
  pushRow(rows, t.city, dashIfEmpty(ud.location), t.amountReceived, `${receivedDt.date}   ${t.onIban}   ${dashIfEmpty(bank?.iban)}`);
  pushRow(rows, t.citizenshipAge, citizen, t.time, `${receivedDt.time}   ${t.noBicNote}`);
  pushRow(rows, t.userDataId, String(ud.id), t.buyCryptoId, dashIfEmpty(tx?.buyCryptoId ?? tx?.buyFiatId));
  pushRow(rows, t.accountRiskStatus, accountRisk, t.txId, txCell);
  pushRow(rows, t.kycStatusLimit, kycLimit, t.deposit, inputAmountCell);
  pushRow(rows, t.email, dashIfEmpty(ud.mail), t.refCode, '-');
  pushRow(rows, t.phone, dashIfEmpty(ud.phone), t.purpose, dashIfEmpty(bankTx?.remittanceInfo));

  autoTable(doc, {
    startY: bannerY + bannerH + 2,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.5, textColor: COLOR.text, lineColor: COLOR.border },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: halfW - 42 },
      2: { cellWidth: 42 },
      3: { cellWidth: halfW - 42 },
    },
    body: rows,
  });

  drawFooter(doc, lang);

  const filename = filenameSafe(`DFX_AccountInfo_${ud.id}_${lang.toUpperCase()}.pdf`);
  saveWithFilename(doc, filename);
}
