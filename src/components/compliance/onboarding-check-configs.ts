export type OnboardingCheckTab =
  | 'legalEntity'
  | 'authority'
  | 'ownerDirectory'
  | 'signatoryPower'
  | 'beneficialOwner'
  | 'operationalActivity'
  | 'onboardingFreigabe';

export type CheckItemType = 'yesno' | 'select' | 'fileLink' | 'conditional' | 'link';

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

export interface OnboardingTabConfig {
  key: OnboardingCheckTab;
  label: string;
  stepName: string;
  fileTypes: string[];
  checkItems: CheckItemConfig[];
  showResult?: boolean;
  decisionLabel: string;
  rejectionReasons: string[];
}

export const onboardingTabs: OnboardingTabConfig[] = [
  {
    key: 'legalEntity',
    label: 'Handelsregisterauszug',
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
  {
    key: 'onboardingFreigabe',
    label: 'Onboarding Freigabe',
    stepName: 'DfxApproval',
    fileTypes: [],
    checkItems: [],
    showResult: false,
    decisionLabel: 'Finaler Entscheid:',
    rejectionReasons: [],
  },
];
