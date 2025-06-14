import {
  AlignContent,
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
  StyledDataTable,
  StyledDataTableRow,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';

interface Item {
  key: string | number;
  label: string;
  subLabel: string;
  isDisabled?: boolean;
  tag?: string;
  menuItems?: MenuItem[];
  onClick?: () => void;
}

type ActionableListProps = {
  label?: string;
  items?: Item[];
  hideItemsText?: string;
  showItemsText?: string;
  addButtonOnClick?: () => void;
};

export default function ActionableList({
  label,
  items,
  hideItemsText = '',
  showItemsText = '',
  addButtonOnClick,
}: ActionableListProps) {
  const [activeMenuItem, setActiveMenuItem] = useState<Item>();
  const [showDisabledItems, setShowDisabledItems] = useState(false);
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  return (
    <>
      {items?.length ? (
        <StyledVerticalStack full gap={2}>
          <h1 className="relative text-dfxGray-800 font-semibold text-base flex justify-center items-center">
            {label}
            <button
              className="absolute right-[14px] border rounded-[10px] bg-white border-dfxGray-700 hover:bg-dfxRed-100 hover:border-dfxRed-100"
              onClick={addButtonOnClick}
              onMouseEnter={() => setIsHoveringButton(true)}
              onMouseLeave={() => setIsHoveringButton(false)}
              hidden={!addButtonOnClick}
            >
              <DfxIcon
                icon={IconVariant.PLUS}
                color={isHoveringButton ? IconColor.WHITE : IconColor.DARK_GRAY}
                size={IconSize.MD}
              />
            </button>
          </h1>
          <StyledDataTable alignContent={AlignContent.BETWEEN}>
            {items
              .filter((item) => showDisabledItems || !item.isDisabled)
              .map((item) => {
                return (
                  <StyledDataTableRow key={item.key} onClick={item.onClick}>
                    <div className="flex flex-col items-start gap-1">
                      <div className={`flex flex-row gap-2 font-semibold ${item.isDisabled ? 'text-dfxGray-700' : ''}`}>
                        {item.label}
                        {item.tag && (
                          <div className="flex bg-dfxGray-400 font-bold rounded-sm px-1.5 text-2xs items-center justify-center">
                            {item.tag}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-dfxGray-700">{item.subLabel}</div>
                    </div>
                    {item.menuItems && (
                      <div className="relative flex items-center">
                        <button onClick={() => setActiveMenuItem(item)}>
                          <DfxIcon icon={IconVariant.THREE_DOTS_VERT} color={IconColor.BLUE} />
                        </button>
                        {activeMenuItem?.key === item.key && (
                          <OverflowMenu menuItems={item.menuItems} onClose={() => setActiveMenuItem(undefined)} />
                        )}
                      </div>
                    )}
                  </StyledDataTableRow>
                );
              })}

            {items.some((item) => item.isDisabled) && (
              <StyledDataTableRow>
                <div
                  className="flex flex-row w-full justify-between items-start gap-1 text-xs cursor-pointer select-none text-dfxGray-700 hover:text-dfxGray-800"
                  onClick={() => setShowDisabledItems((prev) => !prev)}
                >
                  <div>{showDisabledItems ? hideItemsText : showItemsText}</div>
                  <DfxIcon
                    icon={showDisabledItems ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE}
                    color={IconColor.DARK_GRAY}
                  />
                </div>
              </StyledDataTableRow>
            )}
          </StyledDataTable>
        </StyledVerticalStack>
      ) : (
        <></>
      )}
    </>
  );
}

interface MenuItem {
  label: string;
  onClick: () => void;
  closeOnClick?: boolean;
  hidden?: boolean;
}

interface OverflowMenuProps {
  menuItems: MenuItem[];
  onClose: () => void;
}

function OverflowMenu({ menuItems, onClose }: OverflowMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (document) {
      function closeMenu(event: Event) {
        if (!menuRef.current?.contains(event.target as Node)) {
          onClose();
        }
      }

      document.addEventListener('mousedown', closeMenu);
      return () => document.removeEventListener('mousedown', closeMenu);
    }
  }, []);

  return (
    <div
      ref={menuRef}
      className="absolute right-5 top-3 border border-dfxGray-400 shadow-md z-10 bg-white rounded-md overflow-clip"
    >
      <div className="flex flex-col divide-y-0.5 divide-dfxGray-400 items-start bg-dfxGray-100 w-36">
        {menuItems
          .filter((item) => !item.hidden)
          .map((item) => (
            <button
              key={item.label}
              className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                item.closeOnClick && onClose();
              }}
            >
              {item.label}
            </button>
          ))}
      </div>
    </div>
  );
}
