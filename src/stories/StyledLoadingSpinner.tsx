import { SpinnerCircular } from 'spinners-react';

export interface StyledLoadingSpinnerProps {
  variant?: SpinnerVariant;
  size?: SpinnerSizes;
}

export enum SpinnerVariant {
  DARK_MODE = 'DARK_MODE',
  LIGHT_MODE = 'LIGHT_MODE',
  PALE = 'PALE',
}

export enum SpinnerSizes {
  SM = 'SMALL',
  MD = 'MEDIUM',
  LG = 'LARGE',
}

const SIZE_MAPS: Record<SpinnerSizes, number> = {
  [SpinnerSizes.SM]: 10,
  [SpinnerSizes.MD]: 20,
  [SpinnerSizes.LG]: 30,
};

const THICKNESS_MAPS: Record<SpinnerSizes, number> = {
  [SpinnerSizes.SM]: 350,
  [SpinnerSizes.MD]: 250,
  [SpinnerSizes.LG]: 200,
};

type VariantProps = {
  primaryColor: string;
  secondaryColor: string;
};

const VARIANT_MAPS: Record<SpinnerVariant, VariantProps> = {
  [SpinnerVariant.DARK_MODE]: { primaryColor: '#F5516C', secondaryColor: 'rgba(255,255,255,0.2)' },
  [SpinnerVariant.LIGHT_MODE]: { primaryColor: '#F5516C', secondaryColor: 'rgba(7,36,64,0.2)' },
  [SpinnerVariant.PALE]: { primaryColor: '#ffffff', secondaryColor: 'rgba(255,255,255,0.2)' },
};

export default function StyledLoadingSpinner({
  variant = SpinnerVariant.DARK_MODE,
  size = SpinnerSizes.MD,
}: StyledLoadingSpinnerProps) {
  return (
    <SpinnerCircular
      size={SIZE_MAPS[size]}
      thickness={THICKNESS_MAPS[size]}
      speed={105}
      color={VARIANT_MAPS[variant].primaryColor}
      secondaryColor={VARIANT_MAPS[variant].secondaryColor}
    />
  );
}
