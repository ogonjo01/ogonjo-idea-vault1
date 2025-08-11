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
  // optional: rewrite relative image / hrefs to storage base url
  rewriteStoragePaths?: boolean;
  storageBaseUrl?: string;
}

/* ---------------- Helpers ---------------- */
function tryParseJson(raw: any) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

/* Normalize relative image/href paths and enforce link targets/rel */
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

/* ---------------- Component ---------------- */
const StrategyStepsModalSimple: React.FC<Props> = ({
  isOpen,
  onClose,
  strategySteps,
  strategyTitle,
  rewriteStoragePaths = false,
  storageBaseUrl,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Prevent background scroll while open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return;
  }, [isOpen]);

  // Focus trap + ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        const el = dialogRef.current;
        if (!el) return;
        const focusable = Array.from(
          el.querySelectorAll<HTMLElement>('button,a,textarea,input,select,[tabindex]:not([tabindex="-1"])')
        ).filter(Boolean);
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

    const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Sanitize each step description and normalize paths
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,6,23,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
        backdropFilter: 'blur(4px)',
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 880,
          maxHeight: '86vh',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(2,6,23,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        aria-label={`${strategyTitle} — steps`}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #eef2f6' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0f172a' }}>
              S
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>{strategyTitle}</h3>
              <div style={{ color: '#6b7280', fontSize: 12 }}>Execution steps</div>
            </div>
          </div>

          <div>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Close"
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e6eef2',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#0f172a',
                boxShadow: '0 4px 14px rgba(2,6,23,0.04)',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {sanitizedSteps.length === 0 ? (
            <div style={{ padding: 18, borderRadius: 8, background: '#fffbeb', border: '1px solid #fcefc7' }}>
              <p style={{ margin: 0 }}>No steps available for this strategy.</p>
            </div>
          ) : (
            sanitizedSteps.map((s) => (
              <article key={s.step_number} style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: '#fbfdff', borderLeft: '4px solid #06b6d4' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 16, color: '#0f172a' }}>Step {s.step_number}</h4>
                <div style={{ color: '#374151', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: s.html }} />
              </article>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 14, borderTop: '1px solid #eef2f6', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: '#059669',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(5,150,105,0.12)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyStepsModalSimple;
