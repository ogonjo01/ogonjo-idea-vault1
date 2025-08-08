// src/components/IdeaReaderModalDebug.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';

type StepItem = { step_number?: number; action?: string; description?: string };
type StructuredIdea = StepItem[] | { steps?: StepItem[]; overview?: any } | string | null;

interface Props {
  isVisible: boolean;
  onClose: () => void;
  ideaTitle: string;
  structuredIdea?: StructuredIdea;
  contentHtml?: string | null; // Editor HTML (content_text)
  shortDescription?: string | null; // short_description HTML/text
  thumbnailUrl?: string | null;
  rewriteStoragePaths?: boolean; // if true, convert relative src/href to storageBaseUrl
  storageBaseUrl?: string; // e.g. your Supabase storage base url
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
function getStepsFromStructured(parsed: any) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed as StepItem[];
  if (parsed.steps && Array.isArray(parsed.steps)) return parsed.steps as StepItem[];
  return [];
}
function buildHtmlFromSteps(steps: StepItem[]) {
  if (!steps || steps.length === 0) return '';
  return steps
    .map((s, i) => {
      const stepNum = s.step_number ?? i + 1;
      const actionHtml = s.action ?? s.description ?? '';
      return `
        <article class="idea-step" data-step="${stepNum}" style="margin-bottom:18px;padding:14px;border-radius:12px;background:linear-gradient(180deg,#ffffff,#fbfdff);border-left:4px solid #06b6d4;">
          <h4 style="margin:0 0 8px;font-size:1.05rem;color:#0f172a;">Step ${stepNum}</h4>
          <div class="step-action">${actionHtml}</div>
        </article>
      `;
    })
    .join('\n');
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

export default function IdeaReaderModalDebug({
  isVisible,
  onClose,
  ideaTitle,
  structuredIdea = null,
  contentHtml = null,
  shortDescription = null,
  thumbnailUrl = null,
  rewriteStoragePaths = false,
  storageBaseUrl,
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstBtnRef = useRef<HTMLButtonElement | null>(null);

  // Accessibility: focus trap basics + ESC to close
  useEffect(() => {
    if (!isVisible) return;
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
    return () => window.removeEventListener('keydown', onKey);
  }, [isVisible, onClose]);

  // Prepare structured HTML (if any)
  const structuredHtml = useMemo(() => {
    const parsed = tryParseJson(structuredIdea) ?? structuredIdea;
    const steps = getStepsFromStructured(parsed);
    return buildHtmlFromSteps(steps);
  }, [structuredIdea]);

  // Sanitize shortDescription
  const sanitizedShortDescription = useMemo(() => {
    if (!shortDescription) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(shortDescription), 'text/html');
      normalizeDoc(doc, rewriteStoragePaths && storageBaseUrl ? storageBaseUrl : undefined);
      const serialized = doc.body.innerHTML;
      return DOMPurify.sanitize(serialized, {
        ADD_TAGS: ['img', 'figure', 'figcaption'],
        ADD_ATTR: ['target', 'rel', 'src', 'loading', 'alt', 'style'],
      });
    } catch {
      return DOMPurify.sanitize(String(shortDescription));
    }
  }, [shortDescription, rewriteStoragePaths, storageBaseUrl]);

  // Sanitize contentHtml (editor HTML)
  const sanitizedContentHtml = useMemo(() => {
    if (!contentHtml) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(contentHtml), 'text/html');
      normalizeDoc(doc, rewriteStoragePaths && storageBaseUrl ? storageBaseUrl : undefined);
      const serialized = doc.body.innerHTML;
      return DOMPurify.sanitize(serialized, {
        ADD_TAGS: ['img', 'iframe', 'figure', 'figcaption'],
        ADD_ATTR: ['target', 'rel', 'loading', 'src', 'alt', 'width', 'height', 'style'],
      });
    } catch {
      return DOMPurify.sanitize(String(contentHtml));
    }
  }, [contentHtml, rewriteStoragePaths, storageBaseUrl]);

  // Sanitize structuredHtml (already built)
  const sanitizedStructuredHtml = useMemo(() => {
    if (!structuredHtml) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(structuredHtml, 'text/html');
      normalizeDoc(doc, rewriteStoragePaths && storageBaseUrl ? storageBaseUrl : undefined);
      const serialized = doc.body.innerHTML;
      return DOMPurify.sanitize(serialized, {
        ADD_TAGS: ['img', 'figure', 'figcaption'],
        ADD_ATTR: ['target', 'rel', 'loading', 'src', 'alt', 'style'],
      });
    } catch {
      return DOMPurify.sanitize(structuredHtml);
    }
  }, [structuredHtml, rewriteStoragePaths, storageBaseUrl]);

  if (!isVisible) return null;

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
          maxWidth: 980,
          maxHeight: '86vh',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(2,6,23,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        aria-label={`${ideaTitle} — full idea`}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #eef2f6' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={ideaTitle} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10 }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 10, background: '#f3f4f6' }} />
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>{ideaTitle}</h3>
              <div style={{ color: '#6b7280', fontSize: 12 }}>Full idea reader</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              ref={firstBtnRef}
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
          {/* short description */}
          {sanitizedShortDescription ? (
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #eef2f6' }}>
              <div dangerouslySetInnerHTML={{ __html: sanitizedShortDescription }} />
            </div>
          ) : null}

          {/* content_text from editor (full rich HTML) */}
          {sanitizedContentHtml ? (
            <section style={{ marginBottom: 18 }}>
              <h4 style={{ margin: '0 0 10px', color: '#0f172a' }}>Content</h4>
              <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizedContentHtml }} />
            </section>
          ) : null}

          {/* structured steps */}
          {sanitizedStructuredHtml ? (
            <section>
              <h4 style={{ margin: '0 0 10px', color: '#0f172a' }}>Execution Steps</h4>
              <div dangerouslySetInnerHTML={{ __html: sanitizedStructuredHtml }} />
            </section>
          ) : null}

          {/* fallback when nothing */}
          {!sanitizedShortDescription && !sanitizedContentHtml && !sanitizedStructuredHtml && (
            <div style={{ padding: 18, borderRadius: 8, background: '#fffbeb', border: '1px solid #fcefc7' }}>
              <p style={{ margin: 0 }}>No full content is available for this idea. Consider contacting the author or purchasing the full guide.</p>
            </div>
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
}
