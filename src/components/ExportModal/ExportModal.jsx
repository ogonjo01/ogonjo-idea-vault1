// src/components/ExportModal/ExportModal.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './ExportModal.css';

const CURRENT_YEAR = new Date().getFullYear();
const BRAND        = 'OGONJO';
const PUBLISHER    = 'ONJO Literary House';

/* ─── Themes ─────────────────────────────────────────────────────────────── */
export const THEMES = [
  { id: 'white',  label: 'Classic white',  bg: '#ffffff', text: '#111827', accent: '#2563eb', border: '#e5e7eb', headingLine: '#d1d5db' },
  { id: 'cream',  label: 'Creamy paper',   bg: '#fdf8f0', text: '#3b2a1a', accent: '#92400e', border: '#e7dcc8', headingLine: '#d6c9b0' },
  { id: 'brown',  label: 'Warm brown',     bg: '#2e1f14', text: '#f5ede0', accent: '#f59e0b', border: '#6b4c39', headingLine: '#6b4c39' },
  { id: 'navy',   label: 'Navy blue',      bg: '#0f1f3d', text: '#e8eef8', accent: '#60a5fa', border: '#1e3a5f', headingLine: '#1e3a5f' },
  { id: 'forest', label: 'Forest green',   bg: '#1a2f1e', text: '#e8f5e9', accent: '#4ade80', border: '#2d4a32', headingLine: '#2d4a32' },
];

const ThemeCard = ({ theme, selected, onSelect }) => (
  <button
    className={`export-theme-card ${selected ? 'selected' : ''}`}
    onClick={() => onSelect(theme.id)}
    style={{ background: theme.bg, borderColor: selected ? theme.accent : theme.border }}
    title={theme.label}
    type="button"
  >
    <div className="theme-preview-lines" style={{ borderColor: theme.border }}>
      <div className="tpl-title" style={{ background: theme.accent, opacity: 0.9 }} />
      <div className="tpl-line"  style={{ background: theme.text,   opacity: 0.3 }} />
      <div className="tpl-line short" style={{ background: theme.text, opacity: 0.2 }} />
    </div>
    <span className="theme-label" style={{ color: theme.text }}>{theme.label}</span>
    {selected && <div className="theme-check" style={{ background: theme.accent }}>✓</div>}
  </button>
);

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const stripHtml = (html = '') => String(html || '').replace(/<[^>]*>/g, '').trim();

const absolutifyLinks = (html = '') => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ogonjo.com';
  return html.replace(/href="\/([^"]*?)"/g, `href="${origin}/$1"`);
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* FRONT PAGES                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const buildFrontPages = (summary, theme) => `

  <!-- PAGE 1: TITLE PAGE -->
  <div style="
    width:794px; min-height:1056px; display:flex; flex-direction:column;
    justify-content:center; align-items:flex-start;
    padding:80px 64px; page-break-after:always; background:${theme.bg};">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;
      text-transform:uppercase;color:${theme.accent};margin-bottom:32px;">${BRAND}</div>
    <div style="width:55%;height:2px;background:${theme.accent};opacity:0.45;margin-bottom:40px;"></div>
    <h1 style="font-size:38px;font-weight:800;line-height:1.2;color:${theme.text};
      margin:0 0 16px;font-family:Georgia,serif;max-width:520px;">
      ${summary?.title || ''}
    </h1>
    ${summary?.description
      ? `<p style="font-size:14px;color:${theme.text};opacity:0.68;line-height:1.65;
           margin:0 0 32px;max-width:480px;">${stripHtml(summary.description)}</p>`
      : '<div style="margin-bottom:32px;"></div>'}
    <p style="font-size:13px;color:${theme.text};opacity:0.6;margin:0 0 4px;">
      by ${summary?.author || PUBLISHER}</p>
    <div style="width:55%;height:2px;background:${theme.accent};opacity:0.3;margin:32px 0 20px;"></div>
    <div style="font-size:11px;color:${theme.text};opacity:0.45;line-height:1.75;">
      Published by ${PUBLISHER}<br/>© ${CURRENT_YEAR} ${BRAND}. All rights reserved.
    </div>
  </div>

  <!-- PAGE 2: PLATFORM STATEMENT -->
  <div style="
    width:794px; min-height:1056px; display:flex; flex-direction:column;
    justify-content:center; padding:80px 64px;
    page-break-after:always; background:${theme.bg};">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;
      text-transform:uppercase;color:${theme.accent};margin-bottom:20px;">Platform Statement</div>
    <div style="width:40%;height:1.5px;background:${theme.headingLine};margin-bottom:40px;opacity:0.6;"></div>
    <p style="font-size:20px;font-style:italic;font-family:Georgia,serif;
      color:${theme.text};line-height:1.8;max-width:520px;margin:0;">
      Behind every business is a dream. Our mission is to give you the insight
      and support you need to turn that dream into something real.
    </p>
    <div style="width:40%;height:1.5px;background:${theme.headingLine};margin-top:48px;opacity:0.6;"></div>
  </div>

  <!-- PAGE 3: PREFACE -->
  <div style="
    width:794px; min-height:1056px; display:flex; flex-direction:column;
    justify-content:flex-start; padding:80px 64px;
    page-break-after:always; background:${theme.bg};">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;
      text-transform:uppercase;color:${theme.accent};margin-bottom:16px;">Preface</div>
    <div style="width:40%;height:1.5px;background:${theme.headingLine};margin-bottom:40px;opacity:0.6;"></div>
    <p style="font-size:15px;color:${theme.text};line-height:1.85;max-width:540px;
      margin:0 0 20px;font-family:Georgia,serif;text-align:justify;">
      Behind every business is a dream, but building that dream requires clarity,
      discipline, and informed decisions. This work exists to reduce the distance
      between insight and action.
    </p>
    <p style="font-size:15px;color:${theme.text};line-height:1.85;max-width:540px;
      margin:0 0 20px;font-family:Georgia,serif;text-align:justify;">
      The content has been carefully distilled from established business literature
      and practical frameworks, with a focus on relevance, accuracy, and real-world
      applicability. It is designed for entrepreneurs who need dependable knowledge
      they can engage with efficiently — without sacrificing nuance or rigor.
    </p>
    <p style="font-size:15px;color:${theme.text};line-height:1.85;max-width:540px;
      margin:0;font-family:Georgia,serif;text-align:justify;">
      Each section highlights the core problem, the underlying idea, and the actions
      that follow. This publication does not replace deeper study. It supports better
      thinking and faster decision-making when it matters most.
    </p>
  </div>
`;

/* ─────────────────────────────────────────────────────────────────────────── */
/* ARTICLE — always starts on its own new page                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const buildArticleHtml = (html, theme) => `
  <div style="
    width:794px; padding:60px 64px; background:${theme.bg};
    page-break-before:always;">
    <style>
      .art h1,.art h2,.art h3,.art h4 {
        color:${theme.text}; margin:28px 0 8px; padding-bottom:6px;
        border-bottom:1.5px solid ${theme.headingLine};
        font-family:Georgia,serif; line-height:1.3;
      }
      .art h1{font-size:22px;} .art h2{font-size:19px;}
      .art h3{font-size:17px;} .art h4{font-size:15px;}
      .art p  { font-size:15px; color:${theme.text}; line-height:1.85;
                margin:0 0 16px; font-family:Georgia,serif; text-align:justify; }
      .art ul,.art ol { margin:0 0 16px; padding-left:24px; }
      .art li { font-size:15px; color:${theme.text}; line-height:1.75;
                margin:0 0 6px; font-family:Georgia,serif; }
      .art a  { color:${theme.accent}; text-decoration:underline; }
      .art strong{font-weight:700;} .art em{font-style:italic;}
    </style>
    <div class="art">${absolutifyLinks(html || '<p>No content available.</p>')}</div>
  </div>
`;

/* ─────────────────────────────────────────────────────────────────────────── */
/* BACK PAGES                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
const buildBackPages = (theme) => `

  <!-- BACK 1: DISCLAIMER -->
  <div style="
    width:794px; min-height:640px; display:flex; flex-direction:column;
    justify-content:flex-start; padding:64px 64px 48px;
    page-break-before:always; page-break-after:always; background:${theme.bg};">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;
      text-transform:uppercase;color:${theme.accent};margin-bottom:12px;">Disclaimer</div>
    <div style="width:100%;height:1px;background:${theme.headingLine};margin-bottom:28px;opacity:0.5;"></div>
    <p style="font-size:13px;color:${theme.text};line-height:1.8;max-width:560px;
      opacity:0.85;margin:0;font-family:Georgia,serif;text-align:justify;">
      This publication is intended for educational and informational purposes only
      and does not constitute legal, financial, or professional advice of any kind.
      The publisher accepts no liability for outcomes arising from the application of
      information contained herein. Please consult a qualified professional before
      making decisions based on this material.
    </p>
  </div>

  <!-- BACK 2: LEGAL NOTICE -->
  <div style="
    width:794px; min-height:640px; display:flex; flex-direction:column;
    justify-content:flex-start; padding:64px 64px 48px;
    page-break-after:always; background:${theme.bg};">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;
      text-transform:uppercase;color:${theme.accent};margin-bottom:12px;">Legal Notice</div>
    <div style="width:100%;height:1px;background:${theme.headingLine};margin-bottom:28px;opacity:0.5;"></div>
    <p style="font-size:13px;color:${theme.text};line-height:1.8;max-width:560px;
      opacity:0.85;margin:0;font-family:Georgia,serif;text-align:justify;">
      No part of this publication may be reproduced or distributed without prior
      written permission of the publisher, except as permitted by copyright law.
    </p>
  </div>

  <!-- BACK 3: EDITORIAL DISCLOSURE -->
  <div style="
    width:794px; min-height:640px; display:flex; flex-direction:column;
    justify-content:flex-start; padding:64px 64px 48px;
    page-break-after:always; background:${theme.bg};">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;
      text-transform:uppercase;color:${theme.accent};margin-bottom:12px;">
      Editorial Disclosure &amp; Attribution</div>
    <div style="width:100%;height:1px;background:${theme.headingLine};margin-bottom:28px;opacity:0.5;"></div>
    <p style="font-size:13px;color:${theme.text};line-height:1.8;max-width:560px;
      opacity:0.85;margin:0 0 18px;font-family:Georgia,serif;text-align:justify;">
      This is an original publication by ${PUBLISHER}. The frameworks, structures,
      and educational content contained herein reflect original research and editorial
      curation by the ${PUBLISHER} team.
    </p>
    <p style="font-size:13px;color:${theme.text};line-height:1.8;max-width:560px;
      opacity:0.85;margin:0;font-family:Georgia,serif;text-align:justify;">
      In the development of this workbook, artificial intelligence tools were used to
      assist with research compilation, content drafting, and structural organization.
      All AI-assisted content was subsequently reviewed, refined, and approved by a
      human editor to ensure accuracy, quality, and alignment with ${PUBLISHER}
      editorial standards.
    </p>
  </div>

  <!-- BACK 4: CLOSING PAGE -->
  <div style="
    width:794px; min-height:640px; display:flex; flex-direction:column;
    justify-content:center; align-items:center; padding:64px;
    page-break-before:always; background:${theme.bg}; text-align:center;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;
      text-transform:uppercase;color:${theme.accent};margin-bottom:24px;">${BRAND}</div>
    <div style="width:40%;height:1.5px;background:${theme.accent};opacity:0.35;margin-bottom:36px;"></div>
    <p style="font-size:17px;font-style:italic;font-family:Georgia,serif;
      color:${theme.text};line-height:1.75;max-width:440px;margin:0 0 44px;opacity:0.85;">
      Empowering entrepreneurial minds with essential business knowledge.
    </p>
    <div style="font-size:11px;color:${theme.text};opacity:0.5;line-height:1.85;">
      Published by ${PUBLISHER}<br/>© ${CURRENT_YEAR} ${BRAND}. All rights reserved.
    </div>
    <div style="width:40%;height:1.5px;background:${theme.accent};opacity:0.35;margin-top:36px;"></div>
  </div>
`;

/* ═══════════════════════════════════════════════════════════════════════════ */
/* INLINE AUTH                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
const InlineAuth = ({ onSuccess, onCancel }) => {
  const [authMode, setAuthMode] = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');
  const [done,     setDone]     = useState(false);

  const handle = async () => {
    if (!email.trim() || !password.trim()) { setErr('Please enter email and password.'); return; }
    setLoading(true); setErr('');
    try {
      let result;
      if (authMode === 'login') {
        result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      } else {
        result = await supabase.auth.signUp({ email: email.trim(), password });
      }
      if (result.error) throw result.error;
      if (authMode === 'signup') { setDone(true); }
      else { onSuccess(result.data.user); }
    } catch (e) { setErr(e.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="inline-auth-box">
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>✉️</div>
      <p style={{ fontSize: '0.88rem', color: '#374151', margin: '0 0 14px', textAlign: 'center' }}>
        Check your email to confirm, then sign in.
      </p>
      <button type="button" className="export-secondary-btn"
        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
        onClick={() => { setDone(false); setAuthMode('login'); }}>Sign in instead</button>
    </div>
  );

  return (
    <div className="inline-auth-box">
      <div className="inline-auth-tabs">
        <button type="button" className={authMode === 'login'  ? 'active' : ''}
          onClick={() => { setAuthMode('login');  setErr(''); }}>Sign in</button>
        <button type="button" className={authMode === 'signup' ? 'active' : ''}
          onClick={() => { setAuthMode('signup'); setErr(''); }}>Create account</button>
      </div>
      <input type="email"    placeholder="Email"    value={email}
        onChange={e => setEmail(e.target.value)}
        className="export-email-input" style={{ marginBottom: 8 }} />
      <input type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)}
        className="export-email-input"
        onKeyDown={e => e.key === 'Enter' && handle()} />
      {err && <p className="export-login-error">{err}</p>}
      <button type="button" className="export-primary-btn export-dl-btn"
        onClick={handle} disabled={loading}>
        {loading ? 'Please wait…' : authMode === 'login' ? 'Sign in & download' : 'Create account'}
      </button>
      <button type="button" className="export-back-link" onClick={onCancel}>← Back</button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN MODAL                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
const ExportModal = ({ summary, articleHtml, onClose }) => {
  const [selectedTheme,  setSelectedTheme]  = useState('white');
  const [step,           setStep]           = useState('themes');
  const [format,         setFormat]         = useState('pdf');
  const [email,          setEmail]          = useState('');
  const [emailSent,      setEmailSent]      = useState(false);
  const [error,          setError]          = useState('');
  const [currentUser,    setCurrentUser]    = useState(null);
  const [checkingAuth,   setCheckingAuth]   = useState(true);
  const [downloading,    setDownloading]    = useState(false);
  const [showInlineAuth, setShowInlineAuth] = useState(false);

  const theme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user ?? null);
        if (user) setEmail(user.email || '');
      } catch {}
      finally { setCheckingAuth(false); }
    })();
  }, []);

  const storeExportLead = async (emailAddr) => {
    if (!emailAddr) return;
    try {
      await supabase.from('export_leads').upsert(
        { email: emailAddr.trim().toLowerCase(), article_id: summary?.id ?? null,
          article_title: summary?.title ?? null, downloaded_at: new Date().toISOString() },
        { onConflict: 'email,article_id' }
      );
    } catch (e) { console.warn('export_leads upsert failed', e); }
  };

  const sendEmailCopy = async (emailAddr, fileTitle) => {
    if (!emailAddr) return;
    try {
      await supabase.functions.invoke('send-export-email', {
        body: { to: emailAddr, articleTitle: summary?.title,
                articleId: summary?.id, fileTitle, format },
      });
    } catch (e) { console.warn('send-export-email not yet deployed:', e.message); }
  };

  /* ── PDF generation ─────────────────────────────────────────────────── */
  const generatePdf = async (emailAddr) => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'), import('html2canvas'),
    ]);

    const fullHtml =
      buildFrontPages(summary, theme) +
      buildArticleHtml(articleHtml, theme) +
      buildBackPages(theme);

    const container = document.createElement('div');
    container.style.cssText = `
      position:fixed; left:-9999px; top:0;
      width:794px; background:${theme.bg};
      font-family:Georgia,serif; font-size:15px;
      line-height:1.85; color:${theme.text};
    `;
    container.innerHTML = fullHtml;
    document.body.appendChild(container);
    await new Promise(r => setTimeout(r, 500));

    const canvas = await html2canvas(container, {
      scale: 1.5, useCORS: true, backgroundColor: theme.bg,
      width: 794, windowWidth: 794, allowTaint: true,
    });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf     = new jsPDF({ unit: 'px', format: 'a4', orientation: 'portrait' });
    const pageW   = pdf.internal.pageSize.getWidth();
    const pageH   = pdf.internal.pageSize.getHeight();
    const imgH    = (canvas.height * pageW) / canvas.width;

    let yPos = 0;
    while (yPos < imgH) {
      if (yPos > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -yPos, pageW, imgH);
      yPos += pageH;
    }

    const safeTitle = (summary?.title || 'document')
      .replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 50);
    pdf.save(`${safeTitle}.pdf`);
    return safeTitle;
  };

  /* ── DOCX generation ────────────────────────────────────────────────── */
  const generateDocx = async () => {
    const {
      Document, Paragraph, TextRun, HeadingLevel,
      ExternalHyperlink, AlignmentType, Packer,
      LineRuleType,
    } = await import('docx');

    /* Shared paragraph defaults: 1.5 line spacing, justified, Georgia 12pt */
    const paraStyle = {
      spacing: { line: 360, lineRule: LineRuleType.AUTO }, // 360 = 1.5× (240 = single)
    };

    const P = (text, extra = {}) =>
      new Paragraph({
        children: [new TextRun({ text, font: 'Georgia', size: 24 })], // size in half-pts → 12pt
        alignment: AlignmentType.JUSTIFIED,
        ...paraStyle,
        ...extra,
      });

    const H = (text, level) =>
      new Paragraph({
        children: [new TextRun({ text, font: 'Georgia', size: 28, bold: true })],
        heading: level,
        spacing: { before: 280, after: 120 },
      });

    const Rule = () =>
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(48), color: 'AAAAAA', size: 18 })],
        spacing: { before: 80, after: 80 },
      });

    const children = [];

    /* ── FRONT: Title Page ── */
    children.push(
      new Paragraph({
        children: [new TextRun({ text: BRAND, font: 'Georgia', size: 18, bold: true, color: '374151' })],
        spacing: { before: 0, after: 200 },
      }),
      H(summary?.title || '', HeadingLevel.HEADING_1),
      new Paragraph({
        children: [new TextRun({ text: `by ${summary?.author || PUBLISHER}`, font: 'Georgia', size: 22, italics: true })],
        spacing: { before: 80, after: 80 },
      }),
      ...(summary?.description
        ? [P(stripHtml(summary.description))]
        : []),
      new Paragraph({ children: [], spacing: { before: 400, after: 0 } }), // spacer
      new Paragraph({
        children: [
          new TextRun({ text: `Published by ${PUBLISHER}`, font: 'Georgia', size: 20 }),
          new TextRun({ text: `\n© ${CURRENT_YEAR} ${BRAND}. All rights reserved.`, font: 'Georgia', size: 20 }),
        ],
        spacing: { before: 80, after: 0 },
        pageBreakBefore: true,
      }),
    );

    /* ── FRONT: Platform Statement ── */
    children.push(
      new Paragraph({ children: [], pageBreakBefore: true }),
      H('Platform Statement', HeadingLevel.HEADING_2),
      Rule(),
      new Paragraph({
        children: [new TextRun({
          text: 'Behind every business is a dream. Our mission is to give you the insight and support you need to turn that dream into something real.',
          font: 'Georgia', size: 26, italics: true,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200, line: 420, lineRule: LineRuleType.AUTO },
      }),
    );

    /* ── FRONT: Preface ── */
    children.push(
      new Paragraph({ children: [], pageBreakBefore: true }),
      H('Preface', HeadingLevel.HEADING_2),
      Rule(),
      P('Behind every business is a dream, but building that dream requires clarity, discipline, and informed decisions. This work exists to reduce the distance between insight and action.'),
      P('The content has been carefully distilled from established business literature and practical frameworks, with a focus on relevance, accuracy, and real-world applicability. It is designed for entrepreneurs who need dependable knowledge they can engage with efficiently — without sacrificing nuance or rigor.'),
      P('Each section highlights the core problem, the underlying idea, and the actions that follow. This publication does not replace deeper study. It supports better thinking and faster decision-making when it matters most.'),
    );

    /* ── ARTICLE CONTENT ── */
    const parser = new DOMParser();
    const doc    = parser.parseFromString(absolutifyLinks(articleHtml || ''), 'text/html');
    const hLvl   = {
      h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2,
      h3: HeadingLevel.HEADING_3, h4: HeadingLevel.HEADING_4,
    };

    children.push(new Paragraph({ children: [], pageBreakBefore: true })); // article starts new page

    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return;
      const tag = node.tagName?.toLowerCase();
      if (hLvl[tag]) {
        children.push(H(node.textContent.trim(), hLvl[tag]));
      } else if (tag === 'p') {
        const runs = [];
        node.childNodes.forEach(child => {
          const ct = child.tagName?.toLowerCase();
          if (child.nodeType === Node.TEXT_NODE) {
            if (child.textContent) runs.push(new TextRun({ text: child.textContent, font: 'Georgia', size: 24 }));
          } else if (ct === 'a') {
            const href = child.getAttribute('href') || '';
            const txt  = child.textContent.trim();
            if (href && txt) {
              runs.push(new ExternalHyperlink({ link: href, children: [new TextRun({ text: txt, style: 'Hyperlink', font: 'Georgia', size: 24 })] }));
            }
          } else if (ct === 'strong' || ct === 'b') {
            runs.push(new TextRun({ text: child.textContent, bold: true, font: 'Georgia', size: 24 }));
          } else if (ct === 'em' || ct === 'i') {
            runs.push(new TextRun({ text: child.textContent, italics: true, font: 'Georgia', size: 24 }));
          } else if (child.textContent) {
            runs.push(new TextRun({ text: child.textContent, font: 'Georgia', size: 24 }));
          }
        });
        if (runs.length > 0) {
          children.push(new Paragraph({
            children: runs,
            alignment: AlignmentType.JUSTIFIED,
            ...paraStyle,
          }));
        } else if (node.textContent.trim()) {
          children.push(P(node.textContent.trim()));
        }
      } else if (tag === 'ul' || tag === 'ol') {
        node.querySelectorAll('li').forEach(li => {
          children.push(new Paragraph({
            children: [new TextRun({ text: `• ${li.textContent.trim()}`, font: 'Georgia', size: 24 })],
            indent: { left: 360 },
            ...paraStyle,
          }));
        });
      } else {
        node.childNodes.forEach(walk);
      }
    };
    doc.body.childNodes.forEach(walk);

    /* ── BACK PAGES ── */
    const backSection = [
      ['Disclaimer',
        'This publication is intended for educational and informational purposes only and does not constitute legal, financial, or professional advice of any kind. The publisher accepts no liability for outcomes arising from the application of information contained herein. Please consult a qualified professional before making decisions based on this material.'],
      ['Legal Notice',
        'No part of this publication may be reproduced or distributed without prior written permission of the publisher, except as permitted by copyright law.'],
      ['Editorial Disclosure & Attribution', null], // two paras
      ['', null], // closing page marker
    ];

    children.push(
      new Paragraph({ children: [], pageBreakBefore: true }),
      H('Disclaimer', HeadingLevel.HEADING_2), Rule(),
      P('This publication is intended for educational and informational purposes only and does not constitute legal, financial, or professional advice of any kind. The publisher accepts no liability for outcomes arising from the application of information contained herein. Please consult a qualified professional before making decisions based on this material.'),

      new Paragraph({ children: [], pageBreakBefore: true }),
      H('Legal Notice', HeadingLevel.HEADING_2), Rule(),
      P('No part of this publication may be reproduced or distributed without prior written permission of the publisher, except as permitted by copyright law.'),

      new Paragraph({ children: [], pageBreakBefore: true }),
      H('Editorial Disclosure & Attribution', HeadingLevel.HEADING_2), Rule(),
      P(`This is an original publication by ${PUBLISHER}. The frameworks, structures, and educational content contained herein reflect original research and editorial curation by the ${PUBLISHER} team.`),
      P('In the development of this workbook, artificial intelligence tools were used to assist with research compilation, content drafting, and structural organization. All AI-assisted content was subsequently reviewed, refined, and approved by a human editor to ensure accuracy, quality, and alignment with ONJO Literary House editorial standards.'),

      new Paragraph({ children: [], pageBreakBefore: true }),
      new Paragraph({
        children: [new TextRun({ text: 'Empowering entrepreneurial minds with essential business knowledge.', font: 'Georgia', size: 28, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200, line: 400, lineRule: LineRuleType.AUTO },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Published by ${PUBLISHER}`, font: 'Georgia', size: 22 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `© ${CURRENT_YEAR} ${BRAND}. All rights reserved.`, font: 'Georgia', size: 22 })],
        alignment: AlignmentType.CENTER,
      }),
    );

    const docxDoc = new Document({ sections: [{ children }] });
    const blob    = await Packer.toBlob(docxDoc);
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href     = url;
    a.download = `${(summary?.title || 'document').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 50)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Download handler ────────────────────────────────────────────────── */
  const handleDownload = async () => {
    const emailToUse = currentUser?.email || email.trim();
    if (!emailToUse) { setError('Please enter your email to receive a copy.'); return; }
    if (!currentUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
      setError('Please enter a valid email address.'); return;
    }
    setDownloading(true); setError('');
    try {
      let safeTitle = (summary?.title || 'document').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 50);
      if (format === 'pdf') { safeTitle = await generatePdf(emailToUse); }
      else                  { await generateDocx(); }
      await Promise.all([storeExportLead(emailToUse), sendEmailCopy(emailToUse, safeTitle)]);
      setEmailSent(true);
    } catch (err) {
      console.error('Export error', err);
      setError(`Could not generate ${format.toUpperCase()}. Please try again. (${err.message})`);
    } finally { setDownloading(false); }
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user); setEmail(user.email || ''); setShowInlineAuth(false);
  };

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="export-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="export-modal" role="dialog" aria-modal="true" aria-label="Export document">

        {/* Header */}
        <div className="export-modal-header">
          <div style={{ minWidth: 0 }}>
            <h2>Export document</h2>
            <p className="export-modal-subtitle">{summary?.title}</p>
          </div>
          <button className="export-close" onClick={onClose} aria-label="Close" type="button">✕</button>
        </div>

        {/* ══ THEMES ══ */}
        {step === 'themes' && (
          <>
            <div className="export-section">
              <h3>Choose a theme</h3>
              <div className="export-themes-grid">
                {THEMES.map(t => (
                  <ThemeCard key={t.id} theme={t} selected={selectedTheme === t.id} onSelect={setSelectedTheme} />
                ))}
              </div>
            </div>
            <div className="export-section export-format-row">
              <h3>Format</h3>
              <div className="export-format-btns">
                <button type="button" className={`format-btn ${format === 'pdf'  ? 'active' : ''}`} onClick={() => setFormat('pdf')}>PDF</button>
                <button type="button" className={`format-btn ${format === 'docx' ? 'active' : ''}`} onClick={() => setFormat('docx')}>Word (.docx)</button>
              </div>
            </div>
            <div className="export-footer">
              <button type="button" className="export-primary-btn" onClick={() => setStep('preview')}>Preview →</button>
            </div>
          </>
        )}

        {/* ══ PREVIEW ══ */}
        {step === 'preview' && (
          <>
            {/* Sticky cover strip — always visible */}
            <div className="export-cover-strip" style={{ background: theme.bg, borderColor: theme.border }}>
              <div className="epc-brand"  style={{ color: theme.accent }}>{BRAND}</div>
              <div className="epc-title"  style={{ color: theme.text }}>{summary?.title}</div>
              <div className="epc-author" style={{ color: theme.text }}>by {summary?.author}</div>
              <div className="epc-meta-row" style={{ color: theme.text }}>
                <span>Published by {PUBLISHER}</span>
                <span>© {CURRENT_YEAR} {BRAND}</span>
              </div>
            </div>

            {/* Full scrollable article preview — takes all remaining space */}
            <div
              className="export-article-preview"
              style={{
                background: theme.bg, color: theme.text,
                borderColor: theme.border,
                '--heading-line': theme.headingLine,
                '--accent': theme.accent,
              }}
              dangerouslySetInnerHTML={{
                __html: articleHtml ||
                  '<p style="opacity:0.5;text-align:center;padding:40px 20px;">No article content loaded.</p>',
              }}
            />

            {/* Notice strip */}
            <div className="export-preview-notice" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}>
              Includes: Title Page · Platform Statement · Preface · Disclaimer · Legal Notice · Editorial Disclosure · Closing
            </div>

            <div className="export-footer">
              <button type="button" className="export-secondary-btn" onClick={() => setStep('themes')}>← Back</button>
              <button type="button" className="export-primary-btn" onClick={() => setStep('download')}>Continue →</button>
            </div>
          </>
        )}

        {/* ══ DOWNLOAD ══ */}
        {step === 'download' && (
          <div className="export-download-step">
            {showInlineAuth ? (
              <InlineAuth onSuccess={handleAuthSuccess} onCancel={() => setShowInlineAuth(false)} />
            ) : !emailSent ? (
              <>
                <div className="export-download-icon">📥</div>
                {checkingAuth ? (
                  <p className="export-checking">Checking sign-in status…</p>
                ) : currentUser ? (
                  <>
                    <h3>Ready to download</h3>
                    <p className="export-dl-desc">
                      Your {format.toUpperCase()} will download immediately.
                      A copy will also be sent to <strong>{currentUser.email}</strong>.
                    </p>
                    <div className="export-theme-summary" style={{ background: theme.bg, borderColor: theme.border }}>
                      <span style={{ color: theme.text, fontSize: '0.85rem', fontWeight: 600 }}>
                        Theme: {theme.label} · Format: {format.toUpperCase()}
                      </span>
                    </div>
                    {error && <p className="export-login-error">{error}</p>}
                    <button type="button" className="export-primary-btn export-dl-btn"
                      onClick={handleDownload} disabled={downloading}>
                      {downloading ? 'Generating…' : `Download ${format.toUpperCase()}`}
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Almost there</h3>
                    <p className="export-dl-desc">
                      Enter your email and your {format.toUpperCase()} will download immediately.
                      We'll also send you a copy.
                    </p>
                    <div className="export-email-wrap">
                      <input type="email" placeholder="your@email.com" value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleDownload()}
                        className="export-email-input" autoFocus />
                    </div>
                    {error && <p className="export-login-error">{error}</p>}
                    <button type="button" className="export-primary-btn export-dl-btn"
                      onClick={handleDownload} disabled={downloading || !email.trim()}>
                      {downloading ? 'Generating…' : `Download ${format.toUpperCase()}`}
                    </button>
                    <p className="export-skip-note">
                      Have an account?{' '}
                      <button type="button" className="export-signin-link"
                        onClick={() => setShowInlineAuth(true)}>
                        Sign in to skip this next time
                      </button>
                    </p>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="export-download-icon">✅</div>
                <h3>Download started!</h3>
                <p className="export-dl-desc">
                  Your {format.toUpperCase()} is downloading. A copy has been sent to{' '}
                  <strong>{currentUser?.email || email}</strong>.
                </p>
                <button type="button" className="export-secondary-btn" onClick={onClose}>Done</button>
              </>
            )}
            {!showInlineAuth && (
              <button type="button" className="export-back-link" onClick={() => setStep('preview')}>
                ← Change theme or format
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ExportModal;