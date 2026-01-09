# Mail-Login "E-MAIL EINGEBEN" Problem - Analyse

## Problem-Beschreibung

Wenn ein User sich per Mail einloggt und dann zu `/buy` navigiert:
1. Er sieht die Meldung: "Um zu handeln, gib bitte Deine E-Mail-Adresse ein"
2. Button "E-MAIL EINGEBEN" erscheint
3. Klick führt zu `/kyc` mit **leerem** E-Mail-Feld

Das ist verwirrend, da der User bereits per Mail eingeloggt ist.

---

## Root Cause Analyse

### Problem 1: Irreführende Fehlermeldung

**Datei:** `api/src/subdomains/supporting/payment/services/transaction-helper.ts:882-891`

```typescript
if (
  !DisabledProcess(Process.TRADE_APPROVAL_DATE) &&
  user?.userData &&
  !user.userData.tradeApprovalDate &&  // ← KEIN TradeApprovalDate!
  !user.wallet.autoTradeApproval       // ← KEIN autoTradeApproval!
) {
  return user.userData.kycLevel >= KycLevel.LEVEL_10
    ? QuoteError.RECOMMENDATION_REQUIRED
    : QuoteError.EMAIL_REQUIRED;       // ← Dieser Fehler bei kycLevel < 10
}
```

**Was passiert bei Mail-Login:**

| Feld | Wert | Grund |
|------|------|-------|
| `tradeApprovalDate` | `undefined` | Nicht gesetzt bei Neu-Registrierung |
| `kycLevel` | 0 | Standard für neue User |
| `user.wallet` | Default-Wallet | Mail-Login hat keine echte Wallet |
| `autoTradeApproval` | `false` | Standard-Wallet hat das nicht |

**Ergebnis:** `EMAIL_REQUIRED` wird zurückgegeben, obwohl das eigentliche Problem `!tradeApprovalDate` ist.

### Problem 2: E-Mail nicht vorausgefüllt im KYC

**Datei:** `api/src/subdomains/generic/kyc/services/kyc.service.ts:1000-1001`

```typescript
const lastTry = nextStep && Util.maxObj(user.getStepsWith(nextStep), 'sequenceNumber');
const preventDirectEvaluation = lastTry != null;
```

**Datei:** `api/src/subdomains/generic/kyc/services/kyc.service.ts:1111-1112`

```typescript
case KycStepName.CONTACT_DATA:
  if (user.mail && !preventDirectEvaluation) await this.trySetMail(user, kycStep, user.mail);
  break;
```

**Das Problem:**
- `preventDirectEvaluation = true` wenn bereits ein vorheriger Versuch existiert
- Bei einem **neuen User** ohne vorherige KYC-Steps sollte `preventDirectEvaluation = false` sein
- **ABER:** Das E-Mail-Feld im Frontend ist trotzdem leer

**Mögliche Ursachen:**
1. Frontend übergibt `user.mail` nicht an das Formular
2. Race Condition zwischen Login und KYC-Aufruf
3. KYC-Endpoint wird ohne die richtigen Relations aufgerufen

---

## Token-Unterschiede: Mail vs Wallet Login

**Datei:** `api/src/subdomains/generic/user/models/auth/auth.service.ts:307`

```typescript
// Mail-Login generiert ACCOUNT-Token
const token = this.generateAccountToken(account, ip);
```

| Aspekt | Wallet-Login (USER Token) | Mail-Login (ACCOUNT Token) |
|--------|--------------------------|---------------------------|
| `role` | `User` | `Account` |
| `user` | user.id | `undefined` |
| `address` | wallet-adresse | `undefined` |
| `account` | userData.id | userData.id |
| `blockchains` | [...] | `[]` |

---

## Trade Approval Flow

`tradeApprovalDate` wird gesetzt durch:

1. **Recommendation** (Empfehlung von bestehendem DFX-User)
   - `api/src/subdomains/generic/kyc/services/kyc.service.ts:1319`

2. **Organization Accounts** (automatisch)
   - `api/src/subdomains/generic/user/models/user-data/user-data.service.ts:458`

3. **Wallet mit autoTradeApproval**
   - `api/src/subdomains/generic/user/models/auth/auth.service.ts:386`

**Bei Mail-Login:** Keine dieser Bedingungen trifft zu → `tradeApprovalDate = undefined`

---

## Lösungsansätze

### Option 1: Fehlermeldung korrigieren (Minimal)

**Problem:** `EMAIL_REQUIRED` ist irreführend bei Mail-Login.

**Lösung:** Prüfen ob `user.mail` existiert, bevor `EMAIL_REQUIRED` zurückgegeben wird.

**Datei:** `api/src/subdomains/supporting/payment/services/transaction-helper.ts`

```typescript
// Ändern von:
return user.userData.kycLevel >= KycLevel.LEVEL_10
  ? QuoteError.RECOMMENDATION_REQUIRED
  : QuoteError.EMAIL_REQUIRED;

// Zu:
return user.userData.kycLevel >= KycLevel.LEVEL_10 || user.userData.mail
  ? QuoteError.RECOMMENDATION_REQUIRED
  : QuoteError.EMAIL_REQUIRED;
```

**Aufwand:** Gering
**Risiko:** Gering

---

### Option 2: E-Mail vorausfüllen im KYC (UX-Fix)

**Problem:** E-Mail-Feld ist leer obwohl `userData.mail` existiert.

**Lösung:** Frontend prüft `userData.mail` und füllt das Feld vor.

**Datei:** `services/src/screens/kyc.screen.tsx`

```typescript
// Im CONTACT_DATA Step:
const defaultMail = user?.mail || '';
// Setze defaultMail als Initialwert im Formular
```

**Aufwand:** Gering
**Risiko:** Gering

---

### Option 3: Automatische Trade Approval für Mail-Login

**Problem:** Mail-Login-User haben kein `tradeApprovalDate`.

**Lösung:** Bei Mail-Login automatisch `tradeApprovalDate` setzen (wie bei `autoTradeApproval` Wallets).

**Datei:** `api/src/subdomains/generic/user/models/auth/auth.service.ts:314`

```typescript
// Nach: if (!account.tradeApprovalDate) await this.checkPendingRecommendation(account);
// Hinzufügen:
if (!account.tradeApprovalDate && account.mail) {
  await this.userDataService.updateUserDataInternal(account, { tradeApprovalDate: new Date() });
}
```

**Aufwand:** Mittel
**Risiko:** Mittel (ändert Business-Logik)
**Hinweis:** Dies würde das Recommendation-System für Mail-User umgehen. Klären ob gewünscht.

---

### Option 4: CONTACT_DATA Step automatisch abschließen (Backend)

**Problem:** CONTACT_DATA Step wird nicht automatisch abgeschlossen wenn `mail` existiert.

**Lösung:** `preventDirectEvaluation` nur bei echten Wiederholungsversuchen setzen.

**Datei:** `api/src/subdomains/generic/kyc/services/kyc.service.ts:1000-1001`

```typescript
// Prüfen ob der lastTry tatsächlich fehlgeschlagen ist
const lastTry = nextStep && Util.maxObj(
  user.getStepsWith(nextStep).filter(s => s.isFailed), // Nur fehlgeschlagene
  'sequenceNumber'
);
const preventDirectEvaluation = lastTry != null;
```

**Aufwand:** Mittel
**Risiko:** Mittel (könnte andere KYC-Flows beeinflussen)

---

## Empfehlung

**Kurzfristig (Quick Fix):**
1. Option 2: E-Mail im Frontend vorausfüllen
2. Option 1: Fehlermeldung anpassen wenn `mail` existiert

**Langfristig (Product Decision):**
- Klären ob Mail-Login-User eine Recommendation brauchen oder nicht
- Wenn nein: Option 3 implementieren
- Wenn ja: Bessere UX mit klarer Erklärung warum Recommendation nötig ist

---

## Betroffene Dateien

| Datei | Beschreibung |
|-------|--------------|
| `api/src/subdomains/supporting/payment/services/transaction-helper.ts:882-891` | QuoteError Logik |
| `api/src/subdomains/generic/kyc/services/kyc.service.ts:1000-1001, 1111-1112` | preventDirectEvaluation |
| `api/src/subdomains/generic/user/models/auth/auth.service.ts:297-314` | Mail-Login Token Generation |
| `services/src/components/quote-error-hint.tsx:131-136` | Frontend Error Handling |
| `services/src/screens/kyc.screen.tsx` | KYC Formular |

---

## Test-Szenario zur Reproduktion

1. Öffne `https://dev.app.dfx.swiss/login/mail`
2. Gib eine neue E-Mail-Adresse ein
3. Klicke auf den OTP-Link aus der E-Mail
4. Navigiere zu `/buy`
5. Beobachte "E-MAIL EINGEBEN" Button
6. Klicke auf Button → `/kyc` mit leerem E-Mail-Feld

---

*Erstellt: 2026-01-09*
*Status: Dokumentiert, nicht gefixt*
