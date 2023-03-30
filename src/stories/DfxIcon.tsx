import { IconContext, IconType } from 'react-icons';
import {
  MdContentCopy,
  MdArrowBackIos,
  MdArrowForwardIos,
  MdUnfoldLess,
  MdUnfoldMore,
  MdExpandLess,
  MdExpandMore,
  MdChevronLeft,
  MdChevronRight,
  MdInfoOutline,
  MdInfo,
  MdClose,
  MdOutlineCancel,
  MdEast,
  MdWest,
  MdSettings,
  MdEdit,
  MdHelpOutline,
  MdCheck,
} from 'react-icons/md';
import { ReactElement, useContext } from 'react';

interface DfxIconProps {
  icon: IconVariant;
  color?: IconColors;
  size?: IconSizes;
}

export enum IconVariant {
  ARROW_RIGHT = 'ARROW_RIGHT',
  ARROW_LEFT = 'ARROW_LEFT',
  BACK = 'BACK',
  CANCEL = 'CANCEL',
  CHECK = 'CHECK',
  CHEV_RIGHT = 'CHEV_RIGHT',
  CHEV_LEFT = 'CHEV_LEFT',
  CLOSE = 'CLOSE',
  COPY = 'COPY',
  EDIT = 'EDIT',
  EXPAND_LESS = 'EXPAND_LESS',
  EXPAND_MORE = 'EXPAND_MORE',
  FORWARD = 'FORWARD',
  HELP = 'HELP',
  INFO = 'INFO',
  INFO_OUTLINE = 'INFO_OUTLINE',
  SETTINGS = 'SETTINGS',
  UNFOLD_LESS = 'UNFOLD_LESS',
  UNFOLD_MORE = 'UNFOLD_MORE',
  WALLET = 'WALLET',
  BANK = 'BANK',
  SEPA_INSTANT = 'SEPA_INSTANT',
  PROCESS_DONE = 'PROCESS_DONE',
}

export const VARIANT_MAPS: Record<IconVariant, ReactElement<IconType>> = {
  [IconVariant.COPY]: <MdContentCopy />,
  [IconVariant.BACK]: <MdArrowBackIos />,
  [IconVariant.FORWARD]: <MdArrowForwardIos />,
  [IconVariant.UNFOLD_LESS]: <MdUnfoldLess />,
  [IconVariant.UNFOLD_MORE]: <MdUnfoldMore />,
  [IconVariant.EXPAND_LESS]: <MdExpandLess />,
  [IconVariant.EXPAND_MORE]: <MdExpandMore />,
  [IconVariant.CHECK]: <MdCheck />,
  [IconVariant.CHEV_LEFT]: <MdChevronLeft />,
  [IconVariant.CHEV_RIGHT]: <MdChevronRight />,
  [IconVariant.INFO_OUTLINE]: <MdInfoOutline />,
  [IconVariant.INFO]: <MdInfo />,
  [IconVariant.ARROW_LEFT]: <MdWest />,
  [IconVariant.ARROW_RIGHT]: <MdEast />,
  [IconVariant.CLOSE]: <MdClose />,
  [IconVariant.CANCEL]: <MdOutlineCancel />,
  [IconVariant.SETTINGS]: <MdSettings />,
  [IconVariant.WALLET]: <DfxWalletIcon />,
  [IconVariant.BANK]: <DfxBankIcon />,
  [IconVariant.SEPA_INSTANT]: <DfxSepaInstantAvailable />,
  [IconVariant.PROCESS_DONE]: <DfxProcessDoneIcon />,
  [IconVariant.EDIT]: <MdEdit />,
  [IconVariant.HELP]: <MdHelpOutline />,
};

export enum IconSizes {
  XS = 'EXTRA SMALL',
  SM = 'SMALL',
  MD = 'MEDIUM',
  LG = 'LARGE',
  XL = 'EXTRA LARGE',
}

export enum IconColors {
  RED = 'RED',
  BLUE = 'BLUE',
  LIGHT_BLUE = 'LIGHT_BLUE',
  GRAY = 'GRAY',
  BLACK = 'BLACK',
  WHITE = 'WHITE',
}

const COLOR_MAPS: Record<IconColors, string> = {
  [IconColors.RED]: '#F5516C',
  [IconColors.BLUE]: '#072440',
  [IconColors.LIGHT_BLUE]: '#5A81BB',
  [IconColors.GRAY]: '#D6DBE2',
  [IconColors.WHITE]: '#ffffff',
  [IconColors.BLACK]: '#000000',
};

const SIZE_MAPS: Record<IconSizes, string> = {
  [IconSizes.XS]: '16px',
  [IconSizes.SM]: '18px',
  [IconSizes.MD]: '20px',
  [IconSizes.LG]: '24px',
  [IconSizes.XL]: '32px',
};

export default function DfxIcon({ icon, color = IconColors.RED, size = IconSizes.MD }: DfxIconProps) {
  return (
    <IconContext.Provider value={{ color: COLOR_MAPS[color], size: SIZE_MAPS[size] }}>
      {VARIANT_MAPS[icon]}
    </IconContext.Provider>
  );
}

function DfxWalletIcon() {
  const icContext = useContext(IconContext);
  return (
    <svg
      width={icContext.size}
      height={icContext.size}
      viewBox="0 0 21 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.73133 18.5474H18.3231V18.5463C19.4184 18.5463 20.3106 17.6552 20.3106 16.5588V5.7378C20.3106 4.64249 19.4195 3.7503 18.3231 3.7503H17.3785L17.3839 2.54469C17.3861 2.01178 17.1808 1.51054 16.8052 1.13269C16.4295 0.75485 15.9293 0.547363 15.3964 0.547363H3.33492C1.66629 0.547363 0.5 1.32708 0.5 2.44313V2.49664V16.3152C0.5 16.8984 0.806862 17.4652 1.34305 17.8692C1.93056 18.3126 2.75614 18.5474 3.73133 18.5474ZM1.08533 2.44313C1.08533 1.67107 2.01028 1.13269 3.33492 1.13269H9.36568H15.3964C15.7721 1.13269 16.1248 1.28012 16.3902 1.54657C16.6556 1.81303 16.8008 2.16685 16.7986 2.54251L16.7931 3.7503H3.33492C1.98953 3.7503 1.08533 3.2152 1.08533 2.44313ZM15.1717 11.1468C15.1717 10.1529 15.9776 9.34701 16.9715 9.34701H20.3103V8.34701H16.9715C15.4253 8.34701 14.1717 9.60066 14.1717 11.1468C14.1717 12.693 15.4253 13.9467 16.9715 13.9467H20.3103V12.9467H16.9715C15.9776 12.9467 15.1717 12.1407 15.1717 11.1468Z"
        fill={icContext.color}
      />
    </svg>
  );
}

function DfxBankIcon() {
  const icContext = useContext(IconContext);
  return (
    <svg
      width={icContext.size}
      height={icContext.size}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10.6265 7.69076H8.2978V15.2792H10.6265V7.69076Z" fill={icContext.color} />
      <path d="M15.7708 7.69076H13.4421V15.2792H15.7708V7.69076Z" fill={icContext.color} />
      <path d="M5.48224 7.69076H3.1535V15.2792H5.48224V7.69076Z" fill={icContext.color} />
      <path
        d="M0.404925 5.57356L9.4141 0.856445L18.4025 5.57356L18.4043 6.63816H0.404297L0.404925 5.57356Z"
        fill={icContext.color}
      />
      <path d="M18.4043 16.3309H0.404297V18.366H18.4043V16.3309Z" fill={icContext.color} />
    </svg>
  );
}

function DfxSepaInstantAvailable() {
  return (
    <div className="bg-primary-red text-xs text-white flex gap-1 justify-center rounded-sm w-fit pl-1 pr-2 py-0.25 font-semibold italic">
      <svg
        width="27"
        height="10"
        viewBox="0 0 27 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="place-self-center"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13.6502 0.166504H26.5877L23.6145 9.1665H10.677L13.6502 0.166504ZM18.7118 6.93191C17.7944 6.93191 17.1585 6.43613 16.9977 5.71236H19.1029L19.3259 5.01754H16.9794C16.9977 4.90174 17.0233 4.78593 17.0598 4.67013C17.0963 4.55433 17.1439 4.43852 17.1987 4.32272H19.5451L19.7681 3.6279H17.6629C18.2879 2.90413 19.2454 2.40835 20.1592 2.40835C20.7476 2.40835 21.2228 2.61462 21.5298 2.95479L22.3741 2.33959C21.9537 1.84018 21.2776 1.53982 20.4369 1.53982C19.0079 1.53258 17.513 2.40835 16.6724 3.62066H15.3858L15.1629 4.31548H16.2813C16.2301 4.43128 16.1863 4.54709 16.1497 4.66289C16.1132 4.7787 16.0839 4.8945 16.062 5.0103H14.9399L14.717 5.70512H16.0035C16.0693 6.92106 17.0013 7.7932 18.4341 7.7932C19.2783 7.7932 20.1446 7.48922 20.8828 6.99343L20.4296 6.37823C19.907 6.7184 19.3039 6.92468 18.7118 6.92468V6.93191ZM4.35541 2.41281H11.1054V1.29526H4.35541V2.41281ZM0.833334 5.22531H7.58333V4.10776H0.833334V5.22531ZM4.58333 8.03781H9.08333V6.92026H4.58333V8.03781Z"
          fill="white"
        />
      </svg>
      <span> SEPA INSTANT AVAILABLE</span>
    </div>
  );
}

function DfxProcessDoneIcon() {
  const icContext = useContext(IconContext);
  let iconSize: string | undefined;
  icContext.size === '32px' ? (iconSize = '170px') : (iconSize = icContext.size);

  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 170 170" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_885_9990)" filter="url(#filter0_d_885_9990)">
        <path
          opacity="0.18"
          d="M25.9308 118.563C23.2492 114.352 21.02 109.851 19.2969 105.188L29.3985 101.461C30.8523 105.414 32.7369 109.215 35.0092 112.769L25.9308 118.552V118.563Z"
          fill="white"
        />
        <path
          opacity="0.14"
          d="M15.6677 90.703C15.1292 86.826 14.9139 82.8522 15.0323 78.9107C15.0646 77.866 15.1185 76.8322 15.1939 75.7983L25.9308 76.5953C25.8662 77.4676 25.8231 78.3507 25.7908 79.2337C25.6939 82.583 25.8662 85.943 26.3292 89.2276L15.6677 90.7137V90.703Z"
          fill="white"
        />
        <path
          opacity="0.09"
          d="M28.1923 64.1678L17.8646 61.1201C19.2754 56.3385 21.2139 51.7078 23.6154 47.3354L33.0492 52.5262C31.0139 56.2201 29.3877 60.1401 28.1923 64.1785V64.1678Z"
          fill="white"
        />
        <path
          opacity="0.06"
          d="M40.2862 42.1553L32.1554 35.0907C35.4185 31.3322 39.1015 27.9184 43.0862 24.9353L49.5369 33.5615C46.1662 36.0922 43.0539 38.9784 40.2862 42.1661V42.1553Z"
          fill="white"
        />
        <path
          opacity="0.04"
          d="M60.3923 27.1109L55.9123 17.3217C60.4461 15.2432 65.2061 13.6601 70.0738 12.6047L72.3569 23.1263C68.2431 24.0201 64.2154 25.3663 60.3815 27.1217L60.3923 27.1109Z"
          fill="white"
        />
        <path
          opacity="0.2"
          d="M101.143 12.8738C98.3216 12.2062 95.4354 11.7108 92.5385 11.4092C90.04 11.14 87.4877 11 84.9785 11V21.7692C87.1 21.7692 89.2754 21.8877 91.3862 22.1138C93.8308 22.3723 96.2862 22.7923 98.6662 23.3523C125.891 29.7815 145.038 54.7662 144.198 82.7662C143.218 115.408 115.865 141.178 83.2231 140.198C70.0954 139.811 57.797 135.234 47.6416 126.963C45.9939 125.617 44.3893 124.163 42.8923 122.655L35.2354 130.226C37.0016 132.014 38.897 133.726 40.8462 135.32C52.8539 145.098 67.4031 150.505 82.9108 150.968C121.497 152.12 153.815 121.675 154.968 83.0892C155.958 49.9954 133.322 20.4662 101.143 12.8738Z"
          fill="white"
        />
        <path
          d="M75.1139 111.972L48.7723 85.9108L57.1077 77.4893L75.2539 95.4524L115.886 56.5647L124.071 65.1262L75.1139 111.972Z"
          fill="white"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_885_9990"
          x="0"
          y="0"
          width="170"
          height="170"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="7.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_885_9990" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_885_9990" result="shape" />
        </filter>
        <clipPath id="clip0_885_9990">
          <rect width="140" height="140" fill="white" transform="translate(15 11)" />
        </clipPath>
      </defs>
    </svg>
  );
}
