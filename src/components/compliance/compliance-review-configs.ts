export type ReviewCheckTab =
  | 'legalEntity'
  | 'authority'
  | 'ownerDirectory'
  | 'signatoryPower'
  | 'beneficialOwner'
  | 'operationalActivity'
  | 'freigabe'
  | 'stammdaten'
  | 'ident'
  | 'residencePermit'
  | 'nationalityData'
  | 'bankDataReview'
  | 'amlPending';

export type TabGroup = 'onboarding' | 'management' | 'review' | 'approval';

export type CheckItemType = 'yesno' | 'select' | 'fileLink' | 'conditional' | 'link' | 'info';

export interface CheckItemConfig {
  id: string;
  label: string;
  altLabel?: string;
  altCondition?: (userData: Record<string, unknown>) => boolean;
  type?: CheckItemType;
  options?: string[];
  fileType?: string;
  href?: string;
  condition?: (checks: Record<string, string>) => boolean;
  visibleCondition?: (userData: Record<string, unknown>) => boolean;
}

export interface ReviewTabConfig {
  key: ReviewCheckTab;
  label: string;
  group: TabGroup;
  stepName: string;
  fileTypes: string[];
  checkItems: CheckItemConfig[];
  showResult?: boolean;
  decisionLabel: string;
  rejectionReasons: string[];
  isCustomPanel?: boolean;
  accountTypes?: string[];
}

export const reviewTabs: ReviewTabConfig[] = [
  {
    key: 'legalEntity',
    label: 'Handelsregisterauszug',
    group: 'onboarding',
    accountTypes: ['Organization', 'SoleProprietorship'],
    stepName: 'LegalEntity',
    fileTypes: ['CommercialRegister'],
    decisionLabel: 'Der Handelsregisterauszug wird:',
    rejectionReasons: [
      'Document is too old',
      'Dokument ist zu alt',
      'Es wurde kein Handelsregister hochgeladen',
      'Name nicht korrekt',
    ],
    checkItems: [
      { id: 'nameMatch', label: 'Das Dokument lautet auf den Namen "{organizationName}"' },
      {
        id: 'verifiedNameMatch',
        label:
          'Der verifizierte Name des Kunden "{verifiedName}" stimmt mit dem Unternehmensnamen "{organizationName}" überein',
        visibleCondition: (userData) => {
          const v = userData['verifiedName'];
          return typeof v === 'string' && v.trim().length > 0;
        },
      },
      {
        id: 'legalEntityMatch',
        label: 'Das Unternehmen ist gemäss Onboarding eine "{legalEntity}"',
        altLabel: 'Es handelt sich um eine Einzelfirma',
        altCondition: (userData) => userData['accountType'] === 'SoleProprietorship',
      },
      { id: 'docAge', label: 'Das Dokument ist weniger als 3 Monate alt' },
      { id: 'legalFormConsistent', label: 'Die Rechtsform stimmt mit den Onboarding Infos überein' },
    ],
  },
  {
    key: 'authority',
    label: 'Vollmacht',
    group: 'onboarding',
    accountTypes: ['Organization'],
    stepName: 'Authority',
    fileTypes: ['Authority'],
    decisionLabel: 'Die Vollmacht wird:',
    rejectionReasons: ['Document is too old', 'Dokument ist zu alt', 'Keine Vollmacht hochgeladen'],
    checkItems: [
      {
        id: 'authorityName',
        label: 'Die Vollmacht lautet auf den Namen "{organizationName}"',
      },
      {
        id: 'docAge',
        label: 'Das Dokument ist weniger als 3 Monate alt',
      },
      {
        id: 'authorityRecipient',
        label: 'Die Vollmacht wird an "{firstname} {surname}" ausgestellt',
      },
      {
        id: 'signerCount',
        label: 'Anzahl Personen welche die Vollmacht unterschrieben haben',
        type: 'select',
        options: ['0', '1', '2'],
      },
      {
        id: 'commercialRegister',
        label: 'Handelsregisterauszug',
        type: 'fileLink',
        fileType: 'CommercialRegister',
      },
      {
        id: 'singleSignatory',
        label: 'Die Person welche unterschrieben hat, ist gemäss Handelsregisterauszug Einzelunterschriftsberechtigt',
        type: 'conditional',
        condition: (checks) => checks['signerCount'] === '1',
      },
      {
        id: 'firstSignatory',
        label: 'Die erste Person welche unterschrieben hat, ist gemäss Handelsregisterauszug Unterschriftsberechtigt',
        type: 'conditional',
        condition: (checks) => checks['signerCount'] === '2',
      },
      {
        id: 'secondSignatory',
        label: 'Die zweite Person welche unterschrieben hat, ist gemäss Handelsregisterauszug Unterschriftsberechtigt',
        type: 'conditional',
        condition: (checks) => checks['signerCount'] === '2',
      },
    ],
  },
  {
    key: 'ownerDirectory',
    label: 'Aktienbuch',
    group: 'onboarding',
    accountTypes: ['Organization'],
    stepName: 'OwnerDirectory',
    fileTypes: ['StockRegister'],
    decisionLabel: 'Das Dokument wird:',
    rejectionReasons: [
      'Document is too old',
      'Dokument ist zu alt',
      'Statuten werden benötigt',
      'Falsches Dokument hochgeladen',
      'nicht plausibel',
      '§',
    ],
    checkItems: [
      { id: 'nameMatch', label: 'Das Dokument lautet auf den Namen "{organizationName}"' },
      { id: 'plausible', label: 'Das Dokument ist plausibel' },
    ],
  },
  {
    key: 'signatoryPower',
    label: 'Unterschriftsberechtigung',
    group: 'onboarding',
    accountTypes: ['Organization'],
    stepName: 'SignatoryPower',
    fileTypes: [],
    decisionLabel: 'Die Einzel-unterschriftsberechtigung wird:',
    rejectionReasons: ['Document is too old', 'Dokument ist zu alt', 'Person im HR-Auszug nicht eingetragen'],
    checkItems: [
      {
        id: 'signatoryPerson',
        label: '"{firstname} {surname}" ist Einzelunterschriftsberechtigt gemäss Handelsregisterauszug',
      },
      {
        id: 'commercialRegister',
        label: 'Handelsregisterauszug',
        type: 'fileLink',
        fileType: 'CommercialRegister',
      },
      {
        id: 'signerCount',
        label: 'Anzahl Personen welche unterschrieben haben',
        type: 'select',
        options: ['0', '1', '2'],
      },
      {
        id: 'singleSignatory',
        label: 'Die Person welche unterschrieben hat, ist gemäss Handelsregisterauszug Einzelunterschriftsberechtigt',
        type: 'conditional',
        condition: (checks) => checks['signerCount'] === '1',
      },
      {
        id: 'firstSignatory',
        label: 'Die erste Person welche unterschrieben hat, ist gemäss Handelsregisterauszug Unterschriftsberechtigt',
        type: 'conditional',
        condition: (checks) => checks['signerCount'] === '2',
      },
      {
        id: 'secondSignatory',
        label: 'Die zweite Person welche unterschrieben hat, ist gemäss Handelsregisterauszug Unterschriftsberechtigt',
        type: 'conditional',
        condition: (checks) => checks['signerCount'] === '2',
      },
    ],
  },
  {
    key: 'beneficialOwner',
    label: 'Beneficial Owner',
    group: 'onboarding',
    accountTypes: ['Organization'],
    stepName: 'BeneficialOwner',
    fileTypes: ['CommercialRegister', 'StockRegister'],
    showResult: true,
    decisionLabel: 'Entscheid:',
    rejectionReasons: [],
    checkItems: [],
  },
  {
    key: 'operationalActivity',
    label: 'Operational Activity',
    group: 'onboarding',
    accountTypes: ['Organization'],
    stepName: 'OperationalActivity',
    fileTypes: [],
    showResult: true,
    decisionLabel: 'Entscheid:',
    rejectionReasons: [],
    checkItems: [
      {
        id: 'aktennotiz',
        label: 'Aktennotiz erstellen',
        type: 'link',
        href: '/kyc/log?userDataId={id}&eventDate={today}',
      },
    ],
  },
  // --- Management Tabs ---
  {
    key: 'stammdaten',
    label: 'Stammdaten',
    group: 'management',
    stepName: '',
    fileTypes: [],
    checkItems: [],
    showResult: false,
    decisionLabel: '',
    rejectionReasons: [],
    isCustomPanel: true,
  },
  {
    key: 'ident',
    label: 'Ident',
    group: 'management',
    stepName: 'Ident',
    fileTypes: ['Identification'],
    showResult: false,
    decisionLabel: '',
    rejectionReasons: [],
    checkItems: [],
    isCustomPanel: true,
  },
  {
    key: 'residencePermit',
    label: 'Aufenthaltsbewilligung',
    group: 'management',
    stepName: 'ResidencePermit',
    fileTypes: ['ResidencePermit'],
    showResult: false,
    decisionLabel: 'Die Aufenthaltsbewilligung wird:',
    rejectionReasons: [
      'Document expired',
      'Dokument abgelaufen',
      'Name stimmt nicht überein',
      'Kein gültiges Dokument',
    ],
    checkItems: [
      { id: 'infoUserDataId', label: 'UserDataId: {id}', type: 'info' },
      { id: 'infoName', label: 'Name: {firstname} {surname}', type: 'info' },
      { id: 'infoVerifiedName', label: 'VerifiedName: {verifiedName}', type: 'info' },
      { id: 'infoMail', label: 'Mail: {mail}', type: 'info' },
      { id: 'infoLanguage', label: 'Sprache: {language}', type: 'info' },
      { id: 'nameMatch', label: 'Das Dokument lautet auf den Namen "{firstname} {surname}"' },
      { id: 'permitValid', label: 'Die Aufenthaltsbewilligung ist gültig (nicht abgelaufen)' },
      {
        id: 'permitType',
        label: 'Art der Bewilligung',
        type: 'select',
        options: ['B', 'C', 'L', 'F', 'N', 'S', 'Andere'],
      },
    ],
  },
  {
    key: 'nationalityData',
    label: 'Nationalität',
    group: 'management',
    stepName: 'NationalityData',
    fileTypes: [],
    showResult: true,
    decisionLabel: 'Entscheid:',
    rejectionReasons: [],
    checkItems: [
      { id: 'infoUserDataId', label: 'UserDataId: {id}', type: 'info' },
      { id: 'infoName', label: 'Name: {firstname} {surname}', type: 'info' },
      { id: 'infoAddress', label: 'Adresse: {street} {houseNumber}, {zip} {location}', type: 'info' },
      { id: 'infoMail', label: 'Mail: {mail}', type: 'info' },
      { id: 'infoLanguage', label: 'Sprache: {language}', type: 'info' },
      { id: 'infoStatus', label: 'Status: {status}', type: 'info' },
      { id: 'nationalityPlausible', label: 'Die angegebene Nationalität ist plausibel' },
    ],
  },

  // --- Review Tabs ---
  {
    key: 'bankDataReview',
    label: 'BankData Review',
    group: 'review',
    stepName: '',
    fileTypes: [],
    checkItems: [],
    showResult: false,
    decisionLabel: '',
    rejectionReasons: [],
    isCustomPanel: true,
  },
  {
    key: 'amlPending',
    label: 'AML Pending',
    group: 'review',
    stepName: '',
    fileTypes: [],
    checkItems: [],
    showResult: false,
    decisionLabel: '',
    rejectionReasons: [],
    isCustomPanel: true,
  },

  // --- Approval ---
  {
    key: 'freigabe',
    label: 'Freigabe',
    group: 'approval',
    stepName: 'DfxApproval',
    fileTypes: [],
    checkItems: [],
    showResult: false,
    decisionLabel: 'Finaler Entscheid:',
    rejectionReasons: [],
  },
];
