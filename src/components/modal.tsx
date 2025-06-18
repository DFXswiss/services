import { PropsWithChildren, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalRootContext } from 'src/contexts/modal.context';

interface ModalProps extends PropsWithChildren {
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className = '' }: ModalProps): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const { modalRootRef } = useModalRootContext();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;
  if (!modalRootRef?.current) {
    console.warn('Modal root element is not available.');
    return null;
  }

  return createPortal(
    <div className={`absolute inset-0 z-50 bg-white p-4 ${className}`}>
      <div className="flex flex-grow justify-center bg-white min-h-full">
        <div className="w-full max-w-screen-md flex flex-col">{children}</div>
      </div>
    </div>,
    modalRootRef.current,
  );
}
