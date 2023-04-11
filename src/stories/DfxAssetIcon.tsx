import { createContext, ReactElement, useContext } from 'react';

interface DfxAssetIconProps {
  size?: AssetIconSizes;
  asset: AssetIconVariant;
  disabled?: boolean;
}

export enum AssetIconVariant {
  USDT = 'USDT',
  BNB = 'BNB',
  DFI = 'DFI',
  USDC = 'USDC',
  BUSD = 'BUSD',
  ETH = 'ETH',
  DAI = 'DAI',
  BTC = 'BTC',
  WBTC = 'WBTC',
  BTCB = 'BTCB',
}

export enum AssetIconSizes {
  SM = 'SMALL',
  MD = 'MEDIUM',
  LG = 'LARGE',
}

export const SizeContext = createContext(AssetIconSizes.MD);

const SIZE_MAPS: Record<AssetIconSizes, string> = {
  [AssetIconSizes.SM]: '16px',
  [AssetIconSizes.MD]: '24px',
  [AssetIconSizes.LG]: '32px',
};

const VARIANT_MAPS: Record<AssetIconVariant, (props: BaseAssetIconProps) => ReactElement> = {
  [AssetIconVariant.USDT]: ({ forceColor }) => <DfxAssetIconUSDT forceColor={forceColor} />,
  [AssetIconVariant.BNB]: ({ forceColor }) => <DfxAssetIconBNB forceColor={forceColor} />,
  [AssetIconVariant.DFI]: ({ forceColor }) => <DfxAssetIconDFI forceColor={forceColor} />,
  [AssetIconVariant.USDC]: ({ forceColor }) => <DfxAssetIconUSDC forceColor={forceColor} />,
  [AssetIconVariant.BUSD]: ({ forceColor }) => <DfxAssetIconBUSD forceColor={forceColor} />,
  [AssetIconVariant.ETH]: ({ forceColor }) => <DfxAssetIconETH forceColor={forceColor} />,
  [AssetIconVariant.DAI]: ({ forceColor }) => <DfxAssetIconDAI forceColor={forceColor} />,
  [AssetIconVariant.BTC]: ({ forceColor }) => <DfxAssetIconBTC forceColor={forceColor} />,
  [AssetIconVariant.WBTC]: ({ forceColor }) => <DfxAssetIconBTC forceColor={forceColor} />,
  [AssetIconVariant.BTCB]: ({ forceColor }) => <DfxAssetIconBTC forceColor={forceColor} />,
};

export default function DfxAssetIcon({ size = AssetIconSizes.MD, asset, disabled }: DfxAssetIconProps) {
  const icon = VARIANT_MAPS[asset];
  return (
    <SizeContext.Provider value={size}>
      {icon ? icon({ forceColor: disabled ? '#B8C4D8' : undefined }) : DfxAssetIconPlaceholder()}
    </SizeContext.Provider>
  );
}

interface BaseAssetIconProps {
  forceColor?: string;
}

function DfxAssetIconUSDT({ forceColor }: BaseAssetIconProps) {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill={forceColor ?? '#50AF95'} />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.9856 17.6759C17.8747 17.6843 17.3017 17.7185 16.0236 17.7185C15.007 17.7185 14.2852 17.688 14.032 17.6759C10.1033 17.5029 7.17092 16.8182 7.17092 15.9984C7.17092 15.1785 10.1033 14.4947 14.032 14.3189V16.994C14.2889 17.0125 15.0245 17.056 16.0411 17.056C17.261 17.056 17.8719 17.0051 17.9819 16.9949V14.3208C21.9022 14.4957 24.8282 15.1804 24.8282 15.9984C24.8282 16.8163 21.9032 17.5011 17.9819 17.675L17.9856 17.6759ZM17.9856 14.0441V11.6503H23.4567V8H8.56088V11.6503H14.0311V14.0432C9.58486 14.2477 6.2412 15.1295 6.2412 16.1862C6.2412 17.2429 9.58486 18.1238 14.0311 18.3292V26H17.9847V18.3264C22.4207 18.1219 25.7588 17.241 25.7588 16.1853C25.7588 15.1295 22.4235 14.2486 17.9847 14.0432L17.9856 14.0441Z"
        fill="white"
      />
    </svg>
  );
}

function DfxAssetIconUSDC({ forceColor }: BaseAssetIconProps) {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_102_23)">
        <path
          d="M16 32C24.8667 32 32 24.8667 32 16C32 7.13328 24.8667 0 16 0C7.13328 0 0 7.13328 0 16C0 24.8667 7.13328 32 16 32Z"
          fill={forceColor ?? '#2775CA'}
        />
        <path
          d="M20.4 18.5333C20.4 16.2 19 15.4 16.2 15.0667C14.2 14.8 13.8 14.2667 13.8 13.3333C13.8 12.3998 14.4667 11.8 15.8 11.8C17 11.8 17.6667 12.2 18 13.2C18.0667 13.4 18.2667 13.5333 18.4667 13.5333H19.5333C19.8 13.5333 20 13.3333 20 13.0667V13C19.7333 11.5333 18.5333 10.4 17 10.2667V8.66672C17 8.4 16.8 8.2 16.4667 8.13328H15.4667C15.2 8.13328 15 8.33328 14.9333 8.66672V10.2C12.9333 10.4667 11.6667 11.8 11.6667 13.4667C11.6667 15.6667 13 16.5333 15.8 16.8667C17.6667 17.2 18.2667 17.6 18.2667 18.6667C18.2667 19.7334 17.3333 20.4667 16.0667 20.4667C14.3333 20.4667 13.7333 19.7333 13.5333 18.7333C13.4667 18.4667 13.2667 18.3333 13.0667 18.3333H11.9333C11.6667 18.3333 11.4667 18.5333 11.4667 18.8V18.8667C11.7333 20.5333 12.8 21.7333 15 22.0667V23.6667C15 23.9333 15.2 24.1333 15.5333 24.2H16.5333C16.8 24.2 17 24 17.0667 23.6667V22.0667C19.0667 21.7333 20.4 20.3333 20.4 18.5333Z"
          fill="white"
        />
        <path
          d="M12.6 25.5333C7.4 23.6667 4.73328 17.8667 6.66672 12.7333C7.66672 9.93328 9.86672 7.8 12.6 6.8C12.8667 6.66672 13 6.46672 13 6.13328V5.2C13 4.93328 12.8667 4.73328 12.6 4.66672C12.5333 4.66672 12.4 4.66672 12.3333 4.73328C6 6.73328 2.53328 13.4667 4.53328 19.8C5.73328 23.5333 8.6 26.4 12.3333 27.6C12.6 27.7333 12.8667 27.6 12.9333 27.3333C13 27.2667 13 27.2 13 27.0667V26.1333C13 25.9333 12.8 25.6667 12.6 25.5333ZM19.6667 4.73328C19.4 4.6 19.1333 4.73328 19.0667 5C19 5.06672 19 5.13328 19 5.26672V6.2C19 6.46672 19.2 6.73328 19.4 6.86672C24.6 8.73328 27.2667 14.5333 25.3333 19.6667C24.3333 22.4667 22.1333 24.6 19.4 25.6C19.1333 25.7333 19 25.9333 19 26.2667V27.2C19 27.4667 19.1333 27.6667 19.4 27.7333C19.4667 27.7333 19.6 27.7333 19.6667 27.6667C26 25.6667 29.4667 18.9333 27.4667 12.6C26.2667 8.8 23.3333 5.93328 19.6667 4.73328Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_102_23">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function DfxAssetIconETH({ forceColor }: BaseAssetIconProps) {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_4_53)">
        <path
          d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
          fill={forceColor ?? '#627EEA'}
        />
        <path d="M16.498 4V12.87L23.995 16.22L16.498 4Z" fill="white" fillOpacity="0.602" />
        <path d="M16.498 4L9 16.22L16.498 12.87V4Z" fill="white" />
        <path d="M16.498 21.968V27.995L24 17.616L16.498 21.968Z" fill="white" fillOpacity="0.602" />
        <path d="M16.498 27.995V21.967L9 17.616L16.498 27.995Z" fill="white" />
        <path d="M16.498 20.573L23.995 16.22L16.498 12.872V20.573Z" fill="white" fillOpacity="0.2" />
        <path d="M9 16.22L16.498 20.573V12.872L9 16.22Z" fill="white" fillOpacity="0.602" />
      </g>
      <defs>
        <clipPath id="clip0_4_53">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function DfxAssetIconDFI({ forceColor }: BaseAssetIconProps) {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_297_30)">
        <path
          d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
          fill={forceColor ?? '#FF00AF'}
        />
        <path
          d="M18.217 23.454V8.546C21.427 9.504 23.772 12.483 23.772 16C23.772 19.517 21.426 22.496 18.217 23.454ZM15.994 6V14.428L14.725 13.158L14.563 9.991L15.887 6.006C15.0581 6.01602 14.2337 6.12957 13.433 6.344L12.793 8.27L10.977 7.36C10.2597 7.77551 9.59661 8.27834 9.003 8.857L12.366 10.542L12.464 12.47L10.537 12.371L8.85 9.01C8.27145 9.60333 7.76862 10.266 7.353 10.983L8.264 12.799L6.337 13.439C6.12326 14.2395 6.01005 15.0635 6 15.892L9.986 14.568L13.154 14.73L14.424 16L13.154 17.27L9.986 17.432L6 16.108C6.009 16.957 6.13 17.777 6.338 18.562L8.265 19.202L7.354 21.018C7.772 21.737 8.274 22.401 8.851 22.991L10.537 19.629L12.464 19.53L12.366 21.458L9.003 23.143C9.59662 23.7219 10.2597 24.2251 10.977 24.641L12.792 23.73L13.432 25.656C14.233 25.8706 15.0578 25.9842 15.887 25.994L14.563 22.009L14.725 18.841L15.995 17.571V26C21.517 26 25.995 21.523 25.995 16C25.995 10.477 21.517 6 15.995 6"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_297_30">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function DfxAssetIconDAI({ forceColor }: BaseAssetIconProps) {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_4_65)">
        <path
          d="M16 0C24.8374 0 32 7.16407 32 16C32 24.8374 24.8374 32 16 32C7.16407 32 0 24.8366 0 16C0 7.16407 7.16407 0 16 0Z"
          fill={forceColor ?? '#F5AC37'}
        />
        <path
          d="M16.5897 17.1297H22.6694C22.799 17.1297 22.8602 17.1297 22.8696 16.9598C22.9193 16.3413 22.9193 15.7192 22.8696 15.1C22.8696 14.9798 22.8098 14.9301 22.6795 14.9301H10.5798C10.43 14.9301 10.3897 14.9797 10.3897 15.1202V16.9C10.3897 17.1297 10.3897 17.1297 10.6295 17.1297H16.5897ZM22.1906 12.85C22.2079 12.8046 22.2079 12.7549 22.1906 12.7103C22.0891 12.4892 21.9689 12.2783 21.8292 12.0803C21.6189 11.7419 21.3713 11.4301 21.089 11.15C20.9558 10.9808 20.8017 10.8289 20.6289 10.7C19.7635 9.96346 18.7346 9.44217 17.6287 9.18009C17.0707 9.05481 16.5004 8.99505 15.9287 9.00009H10.5589C10.4091 9.00009 10.389 9.05985 10.389 9.19017V12.7398C10.389 12.8896 10.389 12.9299 10.5791 12.9299H22.1186C22.1186 12.9299 22.2187 12.9097 22.2389 12.85H22.1899H22.1906ZM22.1906 19.2098C22.0207 19.1911 21.8493 19.1911 21.6794 19.2098H10.5899C10.4401 19.2098 10.3897 19.2098 10.3897 19.41V22.8804C10.3897 23.0402 10.3897 23.0806 10.5899 23.0806H15.7098C15.9546 23.0993 16.1994 23.082 16.4392 23.0309C17.1823 22.9776 17.9131 22.8163 18.61 22.5506C18.8635 22.4628 19.1083 22.3483 19.3394 22.2108H19.4092C20.6095 21.5865 21.5844 20.6059 22.1993 19.402C22.1993 19.402 22.2691 19.2508 22.1906 19.2112V19.2098ZM8.38016 24.8798V24.8201V22.4901V21.7003V19.3502C8.38016 19.2199 8.38016 19.2004 8.22032 19.2004H6.05022C5.92998 19.2004 5.8803 19.2004 5.8803 19.0406V17.1405H8.20016C8.32976 17.1405 8.38016 17.1405 8.38016 16.9706V15.0906C8.38016 14.9704 8.38016 14.9409 8.22032 14.9409H6.05022C5.92998 14.9409 5.8803 14.9409 5.8803 14.781V13.0213C5.8803 12.9112 5.8803 12.8816 6.04014 12.8816H8.19008C8.33984 12.8816 8.38016 12.8816 8.38016 12.6916V7.30159C8.38016 7.14175 8.38016 7.10143 8.58033 7.10143H16.0799C16.6242 7.12303 17.165 7.18279 17.6999 7.28143C18.8023 7.48519 19.8614 7.87904 20.8298 8.44136C21.4721 8.81937 22.0632 9.27585 22.5895 9.80146C22.9855 10.2126 23.3426 10.6575 23.6594 11.1313C23.9741 11.6116 24.2354 12.1249 24.4406 12.6613C24.4658 12.801 24.5998 12.8953 24.7394 12.8716H26.5294C26.7591 12.8716 26.7591 12.8716 26.7691 13.0919V14.7321C26.7691 14.8919 26.7094 14.9322 26.5488 14.9322H25.1686C25.0289 14.9322 24.9886 14.9322 24.9987 15.1122C25.0534 15.7214 25.0534 16.3326 24.9987 16.9418C24.9987 17.1117 24.9986 17.1319 25.1895 17.1319H26.7684C26.8383 17.2219 26.7684 17.3119 26.7684 17.4026C26.7785 17.5185 26.7785 17.6359 26.7684 17.7518V18.9621C26.7684 19.132 26.7187 19.1824 26.5683 19.1824H24.6782C24.5465 19.1572 24.4183 19.2415 24.3881 19.3725C23.9381 20.5425 23.2181 21.5916 22.2878 22.4325C21.948 22.7385 21.5909 23.0265 21.2179 23.2922C20.8176 23.5226 20.428 23.7624 20.0176 23.9525C19.2624 24.2923 18.4703 24.5429 17.6575 24.702C16.8856 24.8402 16.103 24.9029 15.3174 24.8921H8.37728V24.882L8.38016 24.8798Z"
          fill="#FEFEFD"
        />
      </g>
      <defs>
        <clipPath id="clip0_4_65">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function DfxAssetIconBUSD({ forceColor }: BaseAssetIconProps) {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 0C24.8372 0 32 7.16282 32 16C32 24.8372 24.8372 32 16 32C7.16282 32 0 24.8372 0 16C0 7.16282 7.16282 0 16 0Z"
        fill={forceColor ?? '#F0B90B'}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.6845 7.78274L15.9673 5L9.125 11.9077L11.8423 14.625L18.6845 7.78274ZM22.8095 11.9077L20.0923 9.125L9.125 20.1577L11.8423 22.875L22.8095 11.9077ZM7.71726 13.25L10.4345 16.0327L7.71726 18.75L5 16.0327L7.71726 13.25ZM26.9345 16.0327L24.2173 13.25L13.25 24.2827L15.9673 27L26.9345 16.0327Z"
        fill="white"
      />
    </svg>
  );
}

function DfxAssetIconBTC({ forceColor }: BaseAssetIconProps) {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill={forceColor ?? '#F99602'} />
      <path
        d="M19.5141 9.30328L20.3141 6.30338L18.5141 5.80339L17.8142 8.7033C17.3142 8.6033 16.8142 8.5033 16.3142 8.40331L17.0142 5.40341L15.1143 5.00342L14.4143 8.00332C14.0143 7.90332 13.6143 7.80333 13.2143 7.70333L10.7144 7.10335L10.2144 9.10328C10.2144 9.10328 11.6144 9.40327 11.5144 9.40327C12.2144 9.60327 12.4143 10.1033 12.4143 10.5032L10.3144 18.703C10.2144 18.903 10.0144 19.303 9.41444 19.103L8.11449 18.803L7.21452 20.9029L9.61444 21.5029L10.9144 21.8029L10.1144 24.8028L11.9144 25.3028L12.7143 22.3029C13.2143 22.4029 13.7143 22.6028 14.2143 22.7028L13.5143 25.7027L15.3143 26.2027L16.1142 23.2028C19.2141 23.8028 21.614 23.6028 22.614 20.7029C23.414 18.403 22.614 17.103 20.9141 16.303C22.114 16.0031 23.014 15.2031 23.214 13.6031C23.514 11.3032 21.914 10.1033 19.5141 9.30328ZM19.0141 19.4029C18.4142 21.7029 14.6143 20.4029 13.4143 20.1029L14.4143 16.1031C15.6142 16.403 19.6141 17.003 19.0141 19.4029ZM19.6141 13.5031C19.1141 15.6031 15.9142 14.5031 14.9143 14.3031L15.8142 10.6032C16.8142 10.8032 20.1141 11.3032 19.6141 13.5031Z"
        fill="white"
      />
    </svg>
  );
}

function DfxAssetIconBNB({ forceColor }: BaseAssetIconProps) {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 0C24.8372 0 32 7.16282 32 16C32 24.8372 24.8372 32 16 32C7.16282 32 0 24.8372 0 16C0 7.16282 7.16282 0 16 0Z"
        fill={forceColor ?? '#F0B90B'}
      />
      <path
        d="M8.79359 16L8.80513 20.2308L12.4 22.3461V24.8231L6.70128 21.4808V14.7628L8.79359 16ZM8.79359 11.7692V14.2346L6.7 12.9961V10.5308L8.79359 9.2923L10.8974 10.5308L8.79359 11.7692ZM13.9013 10.5308L15.9949 9.2923L18.0987 10.5308L15.9949 11.7692L13.9013 10.5308Z"
        fill="white"
      />
      <path
        d="M10.3064 19.3538V16.8769L12.4 18.1154V20.5808L10.3064 19.3538ZM13.9013 23.2333L15.9949 24.4718L18.0987 23.2333V25.6987L15.9949 26.9372L13.9013 25.6987V23.2333ZM21.1013 10.5308L23.1949 9.2923L25.2987 10.5308V12.9961L23.1949 14.2346V11.7692L21.1013 10.5308ZM23.1949 20.2308L23.2064 16L25.3 14.7615V21.4795L19.6013 24.8218V22.3449L23.1949 20.2308Z"
        fill="white"
      />
      <path d="M21.6936 19.3538L19.6 20.5808V18.1154L21.6936 16.8769V19.3538Z" fill="white" />
      <path
        d="M21.6936 12.6461L21.7051 15.1231L18.1 17.2384V21.4795L16.0064 22.7064L13.9128 21.4795V17.2384L10.3077 15.1231V12.6461L12.4103 11.4077L15.9936 13.5333L19.5987 11.4077L21.7026 12.6461H21.6936ZM10.3064 8.41665L15.9949 5.06281L21.6936 8.41665L19.6 9.65511L15.9949 7.52947L12.4 9.65511L10.3064 8.41665Z"
        fill="white"
      />
    </svg>
  );
}

function DfxAssetIconPlaceholder() {
  const sizeContext = useContext(SizeContext);
  return (
    <svg
      width={SIZE_MAPS[sizeContext]}
      height={SIZE_MAPS[sizeContext]}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_422_24)">
        <circle cx="16" cy="16" r="16" fill="#B8C4D8" />
        <path
          d="M19.6935 23.0748C23.7288 23.0748 27 19.8036 27 15.7684C27 11.7331 23.7288 8.46188 19.6935 8.46188C15.6583 8.46188 12.3871 11.7331 12.3871 15.7684C12.3871 19.8036 15.6583 23.0748 19.6935 23.0748Z"
          fill="url(#paint0_linear_422_24)"
        />
        <path
          d="M13.0383 24.0767C17.4778 24.0767 21.0767 20.4778 21.0767 16.0383C21.0767 11.5989 17.4778 8 13.0383 8C8.59889 8 5 11.5989 5 16.0383C5 20.4778 8.59889 24.0767 13.0383 24.0767Z"
          fill="url(#paint1_linear_422_24)"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_422_24"
          x1="25.8226"
          y1="12.5767"
          x2="12.8376"
          y2="19.2706"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.104167" stopColor="white" />
          <stop offset="0.520833" stopColor="#C7D0E0" />
          <stop offset="1" stopColor="#B8C4D8" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_422_24"
          x1="17.941"
          y1="10.1956"
          x2="7.60596"
          y2="22.5088"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="0.375" stopColor="#F3F5F8" />
          <stop offset="0.682292" stopColor="#E3E8F0" />
          <stop offset="1" stopColor="#C7D1E0" />
        </linearGradient>
        <clipPath id="clip0_422_24">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
