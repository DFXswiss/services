import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLayoutContext } from 'src/contexts/layout.context';

interface ModalProps extends PropsWithChildren {
  isOpen: boolean;
  onClose?: () => void;
  variant?: 'fullscreen' | 'dialog';
  className?: string;
  maxWidthClass?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  variant = 'fullscreen',
  className = '',
  maxWidthClass = 'max-w-screen-md',
}: ModalProps): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [topOffset, setTopOffset] = useState(0);
  const { modalRootRef, rootRef } = useLayoutContext();
  const observerRef = useRef<ResizeObserver>();

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

  useEffect(() => {
    if (!isOpen || variant !== 'fullscreen' || !modalRootRef?.current) return;

    const updateOffset = () => {
      if (modalRootRef.current) {
        setTopOffset(modalRootRef.current.getBoundingClientRect().top);
      }
    };

    updateOffset();

    observerRef.current = new ResizeObserver(updateOffset);
    observerRef.current.observe(document.documentElement);

    return () => observerRef.current?.disconnect();
  }, [isOpen, variant, modalRootRef]);

  if (!mounted || !isOpen) return null;
  if (!rootRef?.current) {
    console.warn('Modal root element is not available.');
    return null;
  }

  if (variant === 'dialog') {
    return createPortal(
      <div
        className={`fixed inset-0 z-50 bg-black/40 overflow-y-auto ${className}`}
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div className={`w-full ${maxWidthClass} flex flex-col`}>{children}</div>
        </div>
      </div>,
      rootRef.current,
    );
  }

  return createPortal(
    <div
      className={`fixed left-0 right-0 bottom-0 z-50 bg-white overflow-y-auto ${className}`}
      style={{ top: topOffset }}
    >
      <div className="flex flex-grow justify-center h-full">
        <div className={`w-full ${maxWidthClass} flex flex-grow flex-col p-4`}>{children}</div>
      </div>
    </div>,
    rootRef.current,
  );
}
