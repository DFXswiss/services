// Covers only the five screens/support keys added for the free-text receiver IBAN check in de/fr/it.
// Full language-file parity across every key is intentionally out of scope for this change.

import de from 'src/translations/languages/de.json';
import fr from 'src/translations/languages/fr.json';
import itLang from 'src/translations/languages/it.json';

const RECEIVER_IBAN_KEYS = [
  'We have recognized this IBAN.',
  'We could not recognize this IBAN with the information available to us. You can submit your request anyway.',
  'This does not look like a valid IBAN.',
  'Please log in so that we can also check your personal IBAN.',
  'We could not check this IBAN at the moment. You can submit your request anyway.',
] as const;

const languages: Record<'de' | 'fr' | 'it', { 'screens/support': Record<string, string> }> = {
  de: de as { 'screens/support': Record<string, string> },
  fr: fr as { 'screens/support': Record<string, string> },
  it: itLang as { 'screens/support': Record<string, string> },
};

const EXPECTED: Record<'de' | 'fr' | 'it', Record<(typeof RECEIVER_IBAN_KEYS)[number], string>> = {
  de: {
    'We have recognized this IBAN.': 'Wir haben diese IBAN erkannt.',
    'We could not recognize this IBAN with the information available to us. You can submit your request anyway.':
      'Wir konnten diese IBAN mit den vorliegenden Informationen nicht erkennen. Du kannst Deine Anfrage trotzdem absenden.',
    'This does not look like a valid IBAN.': 'Das sieht nicht nach einer gültigen IBAN aus.',
    'Please log in so that we can also check your personal IBAN.':
      'Bitte melde Dich an, damit wir auch Deine persönliche IBAN prüfen können.',
    'We could not check this IBAN at the moment. You can submit your request anyway.':
      'Wir konnten diese IBAN gerade nicht prüfen. Du kannst Deine Anfrage trotzdem absenden.',
  },
  fr: {
    'We have recognized this IBAN.': 'Nous avons reconnu cet IBAN.',
    'We could not recognize this IBAN with the information available to us. You can submit your request anyway.':
      "Nous n'avons pas pu reconnaître cet IBAN avec les informations dont nous disposons. Vous pouvez tout de même soumettre votre demande.",
    'This does not look like a valid IBAN.': 'Cela ne ressemble pas à un IBAN valide.',
    'Please log in so that we can also check your personal IBAN.':
      'Veuillez vous connecter afin que nous puissions également vérifier votre IBAN personnel.',
    'We could not check this IBAN at the moment. You can submit your request anyway.':
      "Nous n'avons pas pu vérifier cet IBAN pour le moment. Vous pouvez tout de même soumettre votre demande.",
  },
  it: {
    'We have recognized this IBAN.': 'Abbiamo riconosciuto questo IBAN.',
    'We could not recognize this IBAN with the information available to us. You can submit your request anyway.':
      'Non è stato possibile riconoscere questo IBAN con le informazioni a nostra disposizione. Potete comunque inviare la vostra richiesta.',
    'This does not look like a valid IBAN.': 'Questo non sembra un IBAN valido.',
    'Please log in so that we can also check your personal IBAN.':
      'Vi preghiamo di accedere affinché possiamo verificare anche il vostro IBAN personale.',
    'We could not check this IBAN at the moment. You can submit your request anyway.':
      'Al momento non è stato possibile verificare questo IBAN. Potete comunque inviare la vostra richiesta.',
  },
};

describe('receiver IBAN support translations', () => {
  it.each(Object.keys(languages) as Array<'de' | 'fr' | 'it'>)(
    'defines a non-empty, non-English translation for each receiver IBAN key in %s',
    (lang) => {
      const support = languages[lang]['screens/support'];

      for (const key of RECEIVER_IBAN_KEYS) {
        // Keys contain periods and colons — always index the object directly, never split on '.'.
        const value = support[key];
        expect(value).toBe(EXPECTED[lang][key]);
      }
    },
  );
});
