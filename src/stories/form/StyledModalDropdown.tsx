import { useState } from 'react';
import { Controller } from 'react-hook-form';
import DfxIcon, { IconSizes, IconVariant } from '../DfxIcon';
import StyledVerticalStack from '../layout-helpers/StyledVerticalStack';
import StyledModal, { StyledModalColors } from '../StyledModal';
import { ControlProps } from './Form';

interface StyledModalDropdownProps<T> extends ControlProps {
  placeholder: string;
  labelFunc: (item: T) => string;
  descriptionFunc?: (item: T) => string | undefined;
  modal: {
    heading: string;
    items: T[];
    itemContent: (item: T) => JSX.Element;
    form?: (onFormSubmit: (item: T) => void) => JSX.Element;
  };
}

export default function StyledModalDropdown<T>({
  control,
  name,
  label,
  rules,
  modal,
  placeholder,
  labelFunc,
  descriptionFunc,
  ...props
}: StyledModalDropdownProps<T>): JSX.Element {
  const [showModal, setShowModal] = useState(false);
  return (
    <Controller
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <>
          <StyledModal
            isVisible={showModal}
            onClose={setShowModal}
            heading={modal.heading}
            color={StyledModalColors.WHITE}
          >
            {modal.items.length > 0 && (
              <StyledVerticalStack gap={4}>
                {modal.items
                  .map((item) => ({ item, content: modal.itemContent(item) }))
                  .map((obj, index: number) => (
                    <button
                      key={index}
                      className="text-start"
                      onClick={() => {
                        onChange(obj.item);
                        setShowModal(false);
                      }}
                    >
                      {obj.content}
                    </button>
                  ))}
              </StyledVerticalStack>
            )}
            {modal.form && (
              <>
                <div className="h-[1px] bg-dfxGray-400 -mx-14 my-6" />
                {modal.form((item) => {
                  onChange(item);
                  setShowModal(false);
                })}
              </>
            )}
          </StyledModal>
          <StyledVerticalStack gap={1} marginY={4}>
            <label className="text-dfxBlue-800 text-base font-semibold pl-4">{label}</label>
            <button
              className="flex justify-between border border-dfxGray-400 text-base font-normal rounded-md px-4 py-2 shadow-sm w-full"
              onClick={() => setShowModal(true)}
              onBlur={onBlur}
              {...props}
            >
              <div className="flex flex-col justify-between text-left gap-1">
                {value ? (
                  <>
                    {descriptionFunc?.(value) && (
                      <span className="text-dfxGray-800 text-xs h-min leading-none">{descriptionFunc(value)}</span>
                    )}
                    <span
                      className={'text-dfxBlue-800 leading-none font-base'.concat(
                        descriptionFunc?.(value) ? '' : ' py-2',
                      )}
                    >
                      {labelFunc(value)}
                    </span>
                  </>
                ) : (
                  <span className="text-dfxGray-600 py-1">{placeholder}</span>
                )}
              </div>
              <div className="place-self-center">
                <DfxIcon icon={IconVariant.UNFOLD_MORE} size={IconSizes.LG} />
              </div>
            </button>
          </StyledVerticalStack>
        </>
      )}
      name={name}
      rules={rules}
    />
  );
}
