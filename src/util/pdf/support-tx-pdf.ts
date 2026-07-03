import { jsPDF } from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { BankTxInfo, CryptoInputInfo, TransactionInfo, UserDataDetail } from 'src/hooks/compliance.hook';
import {
  COLOR,
  dashIfEmpty,
  drawFooter,
  filenameSafe,
  formatAmount,
  formatDateTimeUtc,
  PdfLang,
  saveWithFilename,
} from './support-pdf-common';

export type TxRamp = 'onramp' | 'offramp';

interface TxPdfLabels {
  headingOn: string;
  headingOff: string;
  intro: string;
  paymentMethod: string;
  date: string;
  time: string;
  buyCryptoId: string;
  paymentAmount: string;
  paymentAmountFromIban: string;
  kycStatus: string;
  refCodeWallet: string;
  cryptoAsset: string;
  wipStatus: string;
  order: string;
  amount: string;
  cryptoDelivery: string;
  emailAddress: string;
  emailConfirmation: string;
  transactionId: string;
  additionalInfo: string;
  remittanceInfo: string;
  dfxIban: string;
  registered: string;
  presentKycFound: string;
  successfullyPassed: string;
  cryptoDelivered: string;
  moneyTransferred: string;
  complete: string;
  offrampComplete: string;
  payoutAmount: string;
  paidToIbanOrArrived: string;
  bankTransfer: string;
  additionalInfoWithdrawal: string;
  cryptoSold: string;
  statusUrl: string;
  payout: string;
  bank: string;
  amountReceivedNote: string;
}

const LABELS: Record<PdfLang, TxPdfLabels> = {
  de: {
    headingOn: 'Analysebericht zu deiner Onramp (Fiat2Krypto / Kauf) Suchanfrage',
    headingOff: 'Analysebericht zu deiner Offramp (Krypto2Fiat-Verkauf) Suchanfrage',
    intro: 'Deine letzte Einzahlung haben wir erhalten:',
    paymentMethod: 'Zahlungs-Methode',
    date: 'Datum',
    time: 'Uhrzeit',
    buyCryptoId: 'BuyCrypto- / Tx-ID',
    paymentAmount: 'Einzahlungsbetrag',
    paymentAmountFromIban: 'von IBAN',
    kycStatus: 'KYC-Status',
    refCodeWallet: 'RefCode / Wallet',
    cryptoAsset: 'Crypto- / Asset',
    wipStatus: 'Bearbeitungsstatus',
    order: 'Kaufauftrag',
    amount: 'Betrag',
    cryptoDelivery: 'Krypto-Lieferung',
    emailAddress: 'Email-Adresse',
    emailConfirmation: 'Email-Konfirmation',
    transactionId: 'Transaktions-ID',
    additionalInfo: 'Zusatzinfo zur Banküberweisung',
    remittanceInfo: 'Remittance Info',
    dfxIban: 'DFX-IBAN (Bank)',
    registered: '(Einzahlung registriert)',
    presentKycFound: '(KYC vorhanden)',
    successfullyPassed: 'erfolgreich durchgeführt',
    cryptoDelivered: 'erledigt - Krypto ausgeliefert',
    moneyTransferred: 'erledigt - Geld überwiesen',
    complete: 'Complete',
    offrampComplete: 'Offramp-Prozess ist abgeschlossen',
    payoutAmount: 'Dein Auszahlungsbetrag',
    paidToIbanOrArrived: 'wurde an die IBAN überwiesen oder ist dort eingetroffen',
    bankTransfer: 'SEPA-Banküberweisung',
    additionalInfoWithdrawal: 'Zusatzinfo zu deiner Auszahlung',
    cryptoSold: 'Kryptoasset verkauft',
    statusUrl: 'Status-URL',
    payout: 'Auszahlung',
    bank: '(Banküberweisung)',
    amountReceivedNote: 'wurde an deine IBAN überwiesen',
  },
  en: {
    headingOn: 'Analysis Report on an Onramp (Fiat2Crypto / Buy) Search Request',
    headingOff: 'Analysis Report on your Offramp (Crypto2Fiat - Sell) search request',
    intro: 'We have received your last payment:',
    paymentMethod: 'Payment Method',
    date: 'Date',
    time: 'Time',
    buyCryptoId: 'BuyCrypto- / Tx-ID',
    paymentAmount: 'Payment amount',
    paymentAmountFromIban: 'from IBAN',
    kycStatus: 'KYC status',
    refCodeWallet: 'RefCode / Wallet',
    cryptoAsset: 'Crypto- / Asset',
    wipStatus: 'WIP-status',
    order: 'Buy order',
    amount: 'Amount',
    cryptoDelivery: 'Crypto Delivery',
    emailAddress: 'Email Address',
    emailConfirmation: 'Email Confirmation',
    transactionId: 'Transaction ID',
    additionalInfo: 'Additional Info on the SEPA Bank Transfer',
    remittanceInfo: 'Remittance Info',
    dfxIban: 'DFX-IBAN (Bank)',
    registered: '(Payment registered)',
    presentKycFound: 'present (KYC done)',
    successfullyPassed: 'passed',
    cryptoDelivered: 'done · crypto delivered',
    moneyTransferred: 'done · money transferred',
    complete: 'Complete',
    offrampComplete: 'Offramp Process is completed',
    payoutAmount: 'Your payout amount',
    paidToIbanOrArrived: 'has been transferred to your IBAN or has arrived there',
    bankTransfer: 'SEPA Bank Transfer',
    additionalInfoWithdrawal: 'Additional Info on your Withdrawal',
    cryptoSold: 'Crypto Asset sold',
    statusUrl: 'Status-URL',
    payout: 'Payout',
    bank: '(bank transfer)',
    amountReceivedNote: 'has been transferred to your IBAN',
  },
};

interface AmlStyle {
  bg: [number, number, number];
  textColor: [number, number, number];
}

function amlStyle(amlCheck?: string): AmlStyle {
  const c = (amlCheck ?? '').toLowerCase();
  if (c === 'pass') return { bg: [220, 245, 220], textColor: COLOR.okDark };
  if (c === 'fail') return { bg: [253, 230, 230], textColor: COLOR.errorDark };
  return { bg: [255, 250, 220], textColor: COLOR.warnDark };
}

interface TxPdfInput {
  transaction: TransactionInfo;
  bankTx?: BankTxInfo;
  cryptoInput?: CryptoInputInfo;
  userData: Pick<UserDataDetail, 'mail' | 'kycLevel' | 'kycStatus'>;
  ramp: TxRamp;
  lang: PdfLang;
  dfxIban?: string;
  bankName?: string;
  refCode?: string;
  wallet?: string;
  cryptoDeliveryDate?: string;
}

export function generateTransactionPdf(input: TxPdfInput): void {
  const { transaction: tx, bankTx, cryptoInput, userData, ramp, lang } = input;
  const t = LABELS[lang];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Title ---
  const heading = ramp === 'onramp' ? t.headingOn : t.headingOff;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.okDark);
  doc.text(heading, 10, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.text);
  doc.text(t.intro, 10, 22);

  // --- Body table ---
  const created = formatDateTimeUtc(tx.created);
  const paymentMethod = t.bankTransfer;
  const idCell = `${tx.buyCryptoId ?? tx.buyFiatId ?? '-'} / ${tx.id}`;
  const inputAmountCell = tx.inputAmount != null ? `${formatAmount(tx.inputAmount)} ${tx.inputAsset ?? ''}`.trim() : '-';
  const outputAmountCell =
    tx.outputAmount != null ? `${formatAmount(tx.outputAmount)} ${tx.outputAsset ?? ''}`.trim() : '-';
  const kycLevelStr = userData.kycLevel != null ? `${userData.kycLevel}` : '-';
  const kycStatusStr = userData.kycStatus ? ` (${userData.kycStatus})` : '';
  const wipStyle = amlStyle(tx.amlCheck);

  const rows: RowInput[] = [];

  rows.push([
    { content: t.paymentMethod + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: paymentMethod, styles: { textColor: COLOR.link, fontStyle: 'bold' } },
    { content: t.registered, styles: { fontStyle: 'italic' } },
  ]);
  rows.push([
    { content: t.date + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: created.date },
    '',
  ]);
  rows.push([
    { content: t.time + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: created.time },
    '',
  ]);
  rows.push([
    { content: t.buyCryptoId + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: idCell },
    '',
  ]);
  rows.push([
    { content: t.paymentAmount + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: inputAmountCell },
    { content: bankTx?.iban ? `${t.paymentAmountFromIban} ${bankTx.iban}` : '', styles: { fontStyle: 'italic' } },
  ]);
  rows.push([
    { content: t.kycStatus + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: `${kycLevelStr}${kycStatusStr}`, styles: { fontStyle: 'bold' } },
    { content: t.presentKycFound, styles: { fontStyle: 'italic' } },
  ]);
  rows.push([
    { content: t.wipStatus + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    {
      content: dashIfEmpty(tx.amlCheck) + (tx.amlReason ? ` (${tx.amlReason})` : ''),
      styles: { fillColor: wipStyle.bg, textColor: wipStyle.textColor, fontStyle: 'bold' },
    },
    { content: t.successfullyPassed, styles: { fontStyle: 'italic' } },
  ]);

  // Order status (ramp-specific)
  const orderLabel = ramp === 'onramp' ? t.order : t.payout;
  const orderStatus = tx.isCompleted
    ? ramp === 'onramp'
      ? t.cryptoDelivered
      : t.moneyTransferred
    : dashIfEmpty(tx.amlCheck);
  rows.push([
    { content: orderLabel + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: orderStatus, styles: { fontStyle: 'bold' } },
    { content: '', styles: { fontStyle: 'italic' } },
  ]);
  rows.push([
    { content: t.refCodeWallet + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: `${dashIfEmpty(input.refCode)}   ${dashIfEmpty(input.wallet)}` },
    '',
  ]);
  rows.push([
    { content: t.amount + ' / ' + t.cryptoAsset + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: outputAmountCell },
    '',
  ]);
  rows.push([
    { content: t.cryptoDelivery + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: formatDateTimeUtc(input.cryptoDeliveryDate).date + ' ' + formatDateTimeUtc(input.cryptoDeliveryDate).time },
    '',
  ]);
  rows.push([
    { content: t.emailAddress + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: dashIfEmpty(userData.mail) },
    '',
  ]);

  const txHash = cryptoInput?.inTxId ?? tx.inputTxId ?? '';
  rows.push([
    { content: t.transactionId + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: txHash, styles: { font: 'courier', fontSize: 7 }, colSpan: 2 },
  ]);

  autoTable(doc, {
    startY: 26,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.5, textColor: COLOR.text, lineColor: COLOR.border },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 65 },
      2: { cellWidth: pageWidth - 20 - 55 - 65 },
    },
    body: rows,
  });

  // --- Additional info block ---
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const infoTitle = ramp === 'onramp' ? t.additionalInfo : t.additionalInfoWithdrawal;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.text);
  doc.text(infoTitle + ':', 10, finalY + 6);

  const extraRows: RowInput[] = [];
  extraRows.push([
    { content: t.remittanceInfo + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    { content: dashIfEmpty(bankTx?.remittanceInfo), styles: { font: 'courier', fontSize: 7 } },
  ]);
  extraRows.push([
    { content: t.dfxIban + ':', styles: { fillColor: COLOR.labelBg, fontStyle: 'bold' } },
    {
      content:
        `${dashIfEmpty(input.dfxIban)} ${input.bankName ? '(' + input.bankName + ')' : ''}`.trim(),
      styles: { textColor: COLOR.link },
    },
  ]);

  autoTable(doc, {
    startY: finalY + 8,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.5, textColor: COLOR.text, lineColor: COLOR.border },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: pageWidth - 20 - 55 },
    },
    body: extraRows,
  });

  drawFooter(doc, lang);

  const filename = filenameSafe(`DFX_${ramp === 'onramp' ? 'OnRamp' : 'OffRamp'}_${tx.uid}_${lang.toUpperCase()}.pdf`);
  saveWithFilename(doc, filename);
}
