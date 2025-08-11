import React, { useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  summaryTitle: string;
  bookAuthor: string;
  fullHtmlContent: string; // The full continuous HTML content to display
}

const BookSummaryReaderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  summaryTitle,
  bookAuthor,
  fullHtmlContent,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstBtnRef = useRef<HTMLButtonElement | null>(null);

  // Accessibility: focus trap and ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const el = dialogRef.current;
        if (!el) return;
        const focusable = Array.from(el.querySelectorAll<HTMLElement>('button,a,textarea,input,select,[tabindex]:not([tabindex="-1"])')).filter(Boolean);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    setTimeout(() => firstBtnRef.current?.focus(), 50);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-5"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[980px] max-h-[86vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col"
        aria-label={`${summaryTitle} — full summary`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-gray-200" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{summaryTitle}</h3>
              <p className="text-xs text-gray-500">Full summary reader by {bookAuthor}</p>
            </div>
          </div>
          <button
            ref={firstBtnRef}
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-bold shadow-sm"
          >
            ✕ Close
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: fullHtmlContent }}
          />
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-gray-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-teal-600 text-white font-bold shadow-md hover:bg-teal-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookSummaryReaderModal;