import { ReactNode, useState } from 'react';
import { IconVariant } from './DfxIcon';
import StyledTab from './StyledTab';

interface StyledTabContainerProps {
  tabs: Array<StyledTabProps>;
  activeTab?: number;
}

export interface StyledTabProps {
  title: string;
  deactivated?: boolean;
  content: ReactNode | undefined;
  icon?: IconVariant;
  flagWord1?: string;
  flagWord2?: string;
  onActivate?: () => void;
}

export default function StyledTabContainer({ tabs, activeTab = 0 }: StyledTabContainerProps) {
  const [active, setActive] = useState(activeTab);

  return (
    <>
      <div className="flex flex-wrap text-dfxBlue-800 mt-6">
        <div className="w-full">
          <ul className="flex mb-0 rounded-t-lg list-none bg-white/50 flex-wrap p-0 flex-row" role="tablist">
            {tabs.map((tab: StyledTabProps, index: number) => {
              return (
                <StyledTab
                  setActive={() => {
                    setActive(index);
                    tab.onActivate?.();
                  }}
                  active={index === active}
                  deactivated={tab.deactivated}
                  key={index}
                  icon={tab.icon}
                  flagWord1={tab.flagWord1}
                  flagWord2={tab.flagWord2}
                >
                  {tab.title}
                </StyledTab>
              );
            })}
          </ul>
          <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 rounded-b-lg">
            <div className="p-8 flex-auto">
              <div className="tab-content tab-space">{tabs[active].content}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
