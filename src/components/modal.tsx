import { PropsWithChildren, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps extends PropsWithChildren {
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className = '' }: ModalProps): JSX.Element | null {
  const [mounted, setMounted] = useState(false);

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

  const modalRoot =
    document.getElementById('modal-root') ??
    document.querySelector('dfx-services')?.shadowRoot?.getElementById('modal-root');

  if (!modalRoot) {
    console.warn('Modal: modal-root element not found');
    return null;
  }

  return createPortal(
    <div className={`absolute inset-0 z-50 bg-white py-2 ${className}`}>
      <div className="flex flex-grow justify-center bg-white min-h-full">
        <div className="w-full max-w-screen-md flex flex-col">{children}</div>
      </div>
    </div>,
    modalRoot,
  );
}
