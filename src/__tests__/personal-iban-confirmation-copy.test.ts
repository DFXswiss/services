import de from '../translations/languages/de.json';
import fr from '../translations/languages/fr.json';
import italian from '../translations/languages/it.json';

const PROMPT =
  'Bank Frick will assign you a unique IBAN for transfers. The account behind it belongs to DFX AG. This cannot be undone. Do you want to request and use it?';

describe('Bank Frick confirmation copy', () => {
  it('states in German, French, and Italian that DFX AG owns the account', () => {
    expect(de['screens/payment'][PROMPT]).toBe(
      'Bank Frick weist dir eine eindeutige IBAN für Überweisungen zu. Das dahinterliegende Konto gehört der DFX AG. Dies kann nicht rückgängig gemacht werden. Möchtest du die IBAN beantragen und verwenden?',
    );
    expect(fr['screens/payment'][PROMPT]).toBe(
      'Bank Frick vous attribue un IBAN unique pour les virements. Le compte associé appartient à DFX AG. Cette opération est irréversible. Souhaitez-vous demander et utiliser cet IBAN ?',
    );
    expect(italian['screens/payment'][PROMPT]).toBe(
      'Bank Frick ti assegna un IBAN univoco per i bonifici. Il conto associato appartiene a DFX AG. Questa operazione è irreversibile. Vuoi richiedere e utilizzare questo IBAN?',
    );
  });
});
