// src/components/StrategyStepsModal.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';

export interface StrategyStep {
  step_number: number;
  description: string; // HTML allowed
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  strategySteps: StrategyStep[];
  strategyTitle: string;
  rewriteStoragePaths?: boolean;
  storageBaseUrl?: string;
}

/* Helpers */
function tryParseJson(raw: any) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function normalizeDoc(doc: Document, storageBaseUrl?: string) {
  if (storageBaseUrl) {
    const imgs = Array.from(doc.querySelectorAll('img[src]'));
    imgs.forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src && !/^https?:\/\//i.test(src) && !src.startsWith('data:')) {
        img.setAttribute('src', storageBaseUrl.replace(/\/$/, '') + '/' + src.replace(/^\/+/, ''));
      }
    });
    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    anchors.forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href && !/^https?:\/\//i.test(href) && !href.startsWith('mailto:') && !href.startsWith('#')) {
        a.setAttribute('href', storageBaseUrl.replace(/\/$/, '') + '/' + href.replace(/^\/+/, ''));
      }
    });
  }

  Array.from(doc.querySelectorAll('a')).forEach((a) => {
    if (!a.getAttribute('target')) a.setAttribute('target', '_blank');
    const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
    ['noopener', 'noreferrer'].forEach((r) => {
      if (!rel.includes(r)) rel.push(r);
    });
    a.setAttribute('rel', rel.join(' '));
  });

  Array.from(doc.querySelectorAll('img')).forEach((img) => {
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.getAttribute('alt')) img.setAttribute('alt', '');
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
  });
}

/* Component */
const StrategyStepsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  strategySteps,
  strategyTitle,
  rewriteStoragePaths = false,
  storageBaseUrl,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstBtnRef = useRef<HTMLButtonElement | null>(null);

  // Prevent background scroll while open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return;
  }, [isOpen]);

  // Accessibility: focus trap + ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const el = dialogRef.current;
        if (!el) return;
        const focusable = Array.from(el.querySelectorAll<HTMLElement>(
          'button,a,textarea,input,select,[tabindex]:not([tabindex="-1"])'
        )).filter(Boolean);
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
    const timer = setTimeout(() => firstBtnRef.current?.focus(), 50);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Sanitize and normalize each step description
  const sanitizedSteps = useMemo(() => {
    return (strategySteps || []).map((s) => {
      const raw = s.description ?? '';
      try {
        const parsed = tryParseJson(raw) ?? raw;
        const htmlString = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        const parser = new DOMParser();
        const doc = parser.parseFromString(String(htmlString), 'text/html');
        normalizeDoc(doc, rewriteStoragePaths && storageBaseUrl ? storageBaseUrl : undefined);
        const serialized = doc.body.innerHTML;
        return {
          step_number: s.step_number,
          html: DOMPurify.sanitize(serialized, {
            ADD_TAGS: ['img', 'figure', 'figcaption'],
            ADD_ATTR: ['target', 'rel', 'src', 'loading', 'alt', 'style', 'width', 'height'],
          }),
        };
      } catch {
        return { step_number: s.step_number, html: DOMPurify.sanitize(String(raw)) };
      }
    });
  }, [strategySteps, rewriteStoragePaths, storageBaseUrl]);

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
        aria-label={`${strategyTitle} — steps`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
              S
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{strategyTitle}</h3>
              <p className="text-xs text-gray-500">Execution steps</p>
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
          {sanitizedSteps.length === 0 ? (
            <div className="p-4 rounded-md bg-amber-50 border border-amber-100 text-amber-800">
              No steps available for this strategy.
            </div>
          ) : (
            sanitizedSteps.map((s) => (
              <article
                key={s.step_number}
                className="mb-6 p-4 rounded-md bg-white border-l-4 border-sky-300"
                aria-labelledby={`step-${s.step_number}`}
              >
                <h4 id={`step-${s.step_number}`} className="text-sm font-semibold text-gray-800 mb-2">
                  Step {s.step_number}
                </h4>
                <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: s.html }} />
              </article>
            ))
          )}
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

export default StrategyStepsModal;
