import { ComponentMeta, ComponentStory } from '@storybook/react';
import { IconVariant } from './DfxIcon';
import StyledDataTable, { AlignContent } from './StyledDataTable';
import StyledDataTableRow from './StyledDataTableRow';
import StyledIconButton from './StyledIconButton';

export default {
  title: 'Composites/StyledDataTable',
  component: StyledDataTable,
} as ComponentMeta<typeof StyledDataTable>;

export const UserData: ComponentStory<typeof StyledDataTable> = (args) => {
  let whiteBG = 'p-10 max-w-xl';
  args.darkTheme ? (whiteBG += ' bg-none') : (whiteBG += ' bg-white');
  return (
    <div className={whiteBG}>
      <StyledDataTable {...args}>
        <StyledDataTableRow label="E-mail address">LU11 6060 0020 0000 5040</StyledDataTableRow>
        <StyledDataTableRow label="KYC status">OLKILUL1</StyledDataTableRow>
        <StyledDataTableRow label="Transaction limit">OC11-A025-BCF7</StyledDataTableRow>
      </StyledDataTable>
    </div>
  );
};
UserData.args = {
  darkTheme: true,
  heading: 'User Data',
  showBorder: false,
};

export const PaymentData: ComponentStory<typeof StyledDataTable> = (args) => {
  let whiteBG = 'p-10 max-w-xl';
  args.darkTheme ? (whiteBG += ' bg-none') : (whiteBG += ' bg-white');
  return (
    <div className={whiteBG}>
      <StyledDataTable {...args}>
        <StyledDataTableRow label="IBAN">
          LU11 6060 0020 0000 5040
          <StyledIconButton
            icon={IconVariant.COPY}
            onClick={() => {
              console.log('copied.');
            }}
          />
        </StyledDataTableRow>
        <StyledDataTableRow label="BIC">
          OLKILUL1
          <StyledIconButton
            icon={IconVariant.COPY}
            onClick={() => {
              console.log('copied.');
            }}
          />
        </StyledDataTableRow>
        <StyledDataTableRow
          label="Purpose of Payment"
          infoText={
            'The purpose of payment remains identical for the selected asset and can be used for recurring payments and standing orders.'
          }
        >
          OC11-A025-BCF7
          <StyledIconButton
            icon={IconVariant.COPY}
            onClick={() => {
              console.log('copied.');
            }}
          />
        </StyledDataTableRow>
      </StyledDataTable>
    </div>
  );
};
PaymentData.args = {
  darkTheme: false,
  showBorder: true,
  alignContent: AlignContent.RIGHT,
};

export const SingleRowOnlyText: ComponentStory<typeof StyledDataTable> = (args) => {
  let whiteBG = 'p-10 max-w-xl';
  args.darkTheme ? (whiteBG += ' bg-none') : (whiteBG += ' bg-white');
  return (
    <div className={whiteBG}>
      <StyledDataTable {...args}>
        <StyledDataTableRow>DFX AG, Bahnhofstrasse 7, 6300 Zug, Schweiz</StyledDataTableRow>
      </StyledDataTable>
    </div>
  );
};
SingleRowOnlyText.args = {
  darkTheme: false,
  showBorder: true,
};

export const SingleRowBetween: ComponentStory<typeof StyledDataTable> = (args) => {
  let whiteBG = 'p-10 max-w-xl';
  args.darkTheme ? (whiteBG += ' bg-none') : (whiteBG += ' bg-white');
  return (
    <div className={whiteBG}>
      <StyledDataTable {...args}>
        <StyledDataTableRow discreet>
          <span>DFX Fee</span>
          <span>2.9 %</span>
        </StyledDataTableRow>
      </StyledDataTable>
    </div>
  );
};
SingleRowBetween.args = {
  darkTheme: false,
  showBorder: true,
};
