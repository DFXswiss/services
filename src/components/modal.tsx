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
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const appRoot = document.getElementById('app-root');
  if (!appRoot) {
    console.warn('Modal: app-root element not found, falling back to document.body');
    return null;
  }

  return createPortal(
    <div className={`absolute inset-0 z-50 bg-white ${className}`}>
      <div className="flex flex-grow justify-center h-full">
        <div className="w-full max-w-screen-md flex flex-grow flex-col">
          {children}
        </div>
      </div>
    </div>,
    appRoot
  );
}
