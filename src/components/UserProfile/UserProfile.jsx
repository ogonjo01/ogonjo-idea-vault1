// src/components/UserProfile/UserProfile.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const THEMES = {
  dark: {
    id:'dark', label:'🌑 Dark',
    bg:'#060c1a', bgGradient:'radial-gradient(ellipse at 20% 0%,rgba(6,182,212,0.07) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(139,92,246,0.07) 0%,transparent 50%)',
    surface:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.08)', borderHover:'rgba(255,255,255,0.18)',
    text:'#f1f5f9', textMuted:'#64748b', textSub:'#94a3b8',
    tabActive:'rgba(255,255,255,0.12)', tabText:'#fff', tabInactive:'#64748b',
    inputBg:'rgba(255,255,255,0.06)', inputBorder:'rgba(255,255,255,0.12)',
    accent:'#06b6d4', accentGrad:'linear-gradient(135deg,#06b6d4,#0891b2)',
    rowHover:'rgba(255,255,255,0.02)', headerRow:'rgba(255,255,255,0.04)',
    overlay:'rgba(0,0,0,0.78)', shadow:'0 32px 80px rgba(0,0,0,0.55)',
    closeColor:'#64748b', themeBtnBg:'rgba(255,255,255,0.06)', themeBtnBorder:'rgba(255,255,255,0.1)',
    aiSurface:'rgba(139,92,246,0.06)', aiBorder:'rgba(139,92,246,0.2)', aiAccent:'#a78bfa',
    tooltipBg:'#0f172a', chatUserBg:'rgba(6,182,212,0.15)', chatAiBg:'rgba(255,255,255,0.04)',
    liveBg:'rgba(255,255,255,0.02)', liveBorder:'rgba(6,182,212,0.2)',
  },
  white: {
    id:'white', label:'☀️ Light',
    bg:'#f8fafc', bgGradient:'radial-gradient(ellipse at 20% 0%,rgba(6,182,212,0.05) 0%,transparent 50%)',
    surface:'rgba(0,0,0,0.03)', border:'rgba(0,0,0,0.08)', borderHover:'rgba(0,0,0,0.2)',
    text:'#0f172a', textMuted:'#94a3b8', textSub:'#64748b',
    tabActive:'rgba(0,0,0,0.08)', tabText:'#0f172a', tabInactive:'#94a3b8',
    inputBg:'#fff', inputBorder:'rgba(0,0,0,0.15)',
    accent:'#0891b2', accentGrad:'linear-gradient(135deg,#06b6d4,#0284c7)',
    rowHover:'rgba(0,0,0,0.02)', headerRow:'rgba(0,0,0,0.04)',
    overlay:'rgba(0,0,0,0.5)', shadow:'0 32px 80px rgba(0,0,0,0.18)',
    closeColor:'#94a3b8', themeBtnBg:'rgba(0,0,0,0.04)', themeBtnBorder:'rgba(0,0,0,0.1)',
    aiSurface:'rgba(99,102,241,0.04)', aiBorder:'rgba(99,102,241,0.18)', aiAccent:'#6366f1',
    tooltipBg:'#1e293b', chatUserBg:'rgba(6,182,212,0.12)', chatAiBg:'rgba(0,0,0,0.04)',
    liveBg:'rgba(0,0,0,0.02)', liveBorder:'rgba(6,182,212,0.15)',
  },
  green: {
    id:'green', label:'🌿 Premium',
    bg:'#071410', bgGradient:'radial-gradient(ellipse at 20% 0%,rgba(16,185,129,0.1) 0%,transparent 55%),radial-gradient(ellipse at 80% 100%,rgba(5,150,105,0.08) 0%,transparent 50%)',
    surface:'rgba(16,185,129,0.04)', border:'rgba(16,185,129,0.12)', borderHover:'rgba(16,185,129,0.3)',
    text:'#ecfdf5', textMuted:'#4b7c6a', textSub:'#6ee7b7',
    tabActive:'rgba(16,185,129,0.15)', tabText:'#ecfdf5', tabInactive:'#4b7c6a',
    inputBg:'rgba(16,185,129,0.06)', inputBorder:'rgba(16,185,129,0.2)',
    accent:'#10b981', accentGrad:'linear-gradient(135deg,#10b981,#059669)',
    rowHover:'rgba(16,185,129,0.03)', headerRow:'rgba(16,185,129,0.07)',
    overlay:'rgba(0,0,0,0.82)', shadow:'0 32px 80px rgba(0,0,0,0.6)',
    closeColor:'#4b7c6a', themeBtnBg:'rgba(16,185,129,0.08)', themeBtnBorder:'rgba(16,185,129,0.18)',
    aiSurface:'rgba(16,185,129,0.06)', aiBorder:'rgba(16,185,129,0.22)', aiAccent:'#34d399',
    tooltipBg:'#022c22', chatUserBg:'rgba(16,185,129,0.15)', chatAiBg:'rgba(16,185,129,0.04)',
    liveBg:'rgba(16,185,129,0.03)', liveBorder:'rgba(16,185,129,0.2)',
  },
};

const ROLES = { USER:'user', TEAM:'team', ADMIN:'admin' };
const ROLE_LABELS  = { user:'User', team:'Team', admin:'Admin' };
const ROLE_COLOURS = { user:'#64748b', team:'#06b6d4', admin:'#8b5cf6' };
const canSeeDashboard = (r) => r===ROLES.ADMIN || r===ROLES.TEAM;
const canManageRoles  = (r) => r===ROLES.ADMIN;

const PERIODS    = ['Today','Week','Month','Year'];
const periodMs   = { Today:864e5, Week:6048e5, Month:2592e6, Year:3154e7 };
const periodTrunc= { Today:'hour', Week:'day', Month:'day', Year:'month' };

const METRICS = [
  { id:'views',    label:'Views',     icon:'👁',  color:'#06b6d4' },
  { id:'likes',    label:'Likes',     icon:'❤️',  color:'#f97316' },
  { id:'ratings',  label:'Ratings',   icon:'⭐',  color:'#10b981' },
  { id:'newUsers', label:'New Users', icon:'👤',  color:'#f59e0b' },
];
const CAT_COLOURS=['#06b6d4','#f97316','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#a855f7','#3b82f6'];

const fmt = (n) => n>=1000?(n/1000).toFixed(1)+'k':String(n??0);
const pct = (a,b) => b?+((a-b)/b*100).toFixed(1):0;
const ago = (iso) => {
  const s=Math.round((Date.now()-new Date(iso))/1000);
  if(s<60) return `${s}s ago`;
  if(s<3600) return `${Math.round(s/60)}m ago`;
  if(s<86400) return `${Math.round(s/3600)}h ago`;
  return `${Math.round(s/86400)}d ago`;
};
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const CopyButton = ({ text, theme:T }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { const el=document.createElement('textarea'); el.value=text; el.style.cssText='position:fixed;opacity:0'; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };
  return(
    <button onClick={handleCopy} title={copied?'Copied!':'Copy'} style={{ background:copied?T.aiAccent+'22':'none', border:`1px solid ${copied?T.aiAccent:T.border}`, borderRadius:6, color:copied?T.aiAccent:T.textMuted, padding:'3px 8px', cursor:'pointer', fontSize:10, fontWeight:600, transition:'all 0.15s', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}
      onMouseEnter={e=>{ if(!copied){e.currentTarget.style.borderColor=T.aiAccent;e.currentTarget.style.color=T.aiAccent;}}}
      onMouseLeave={e=>{ if(!copied){e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textMuted;}}}>
      {copied?'✓ Copied':'⎘ Copy'}
    </button>
  );
};

const ThemeSwitcher = ({ theme, setTheme }) => (
  <div style={{ display:'flex', gap:4 }}>
    {Object.values(THEMES).map(t=>(
      <button key={t.id} onClick={()=>{ try{ localStorage.setItem('ogonjo_theme',t.id); }catch{} setTheme(t); }} style={{ padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600, background:theme.id===t.id?theme.accent+'22':theme.themeBtnBg, border:`1px solid ${theme.id===t.id?theme.accent:theme.themeBtnBorder}`, color:theme.id===t.id?theme.accent:theme.textMuted, transition:'all 0.15s' }}>{t.label}</button>
    ))}
  </div>
);

const DashTooltip = ({ active, payload, label, theme:T }) => {
  if(!active||!payload?.length) return null;
  return(
    <div style={{ background:T.tooltipBg, border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <div style={{ color:T.textMuted, marginBottom:4 }}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{ color:p.color }}>{p.name}: <b>{(p.value??0).toLocaleString()}</b></div>)}
    </div>
  );
};

const StatCard = ({ label, value, delta, accent, icon, theme:T }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden', flex:'1 1 0', minWidth:80 }}>
    <div style={{ position:'absolute', top:0, right:0, width:50, height:50, background:`radial-gradient(circle at 100% 0%,${accent}30,transparent 70%)` }}/>
    <div style={{ fontSize:16, marginBottom:5 }}>{icon}</div>
    <div style={{ fontSize:20, fontWeight:700, color:T.text, letterSpacing:-0.5 }}>{fmt(value)}</div>
    <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>{label}</div>
    {delta!==undefined&&(<div style={{ fontSize:10, marginTop:6, color:delta>=0?'#34d399':'#f87171', fontWeight:600 }}>{delta>=0?'▲':'▼'} {Math.abs(delta)}%</div>)}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LIVE FEED
// ─────────────────────────────────────────────────────────────────────────────
const FLIP_DIRS = [
  { from:'translateX(-120%) rotateY(-90deg)', to:'translateX(0) rotateY(0deg)' },
  { from:'translateX(120%) rotateY(90deg)',   to:'translateX(0) rotateY(0deg)' },
  { from:'translateY(-80%) rotateX(90deg)',   to:'translateY(0) rotateX(0deg)' },
  { from:'translateY(80%) rotateX(-90deg)',   to:'translateY(0) rotateX(0deg)' },
  { from:'rotate(-15deg) scale(0.5) translateX(-60%)', to:'rotate(0deg) scale(1) translateX(0)' },
  { from:'rotate(15deg) scale(0.5) translateX(60%)',   to:'rotate(0deg) scale(1) translateX(0)' },
];

const catColor = (cat) => {
  if(!cat) return CAT_COLOURS[0];
  let h=0; for(let i=0;i<cat.length;i++) h=cat.charCodeAt(i)+((h<<5)-h);
  return CAT_COLOURS[Math.abs(h)%CAT_COLOURS.length];
};


// ─────────────────────────────────────────────────────────────────────────────
// LIVE FEED — masonry fullscreen, random independent timers, varied transitions
// ─────────────────────────────────────────────────────────────────────────────

const CARD_ACCENTS = [
  '#06b6d4','#8b5cf6','#f97316','#10b981','#ec4899',
  '#f59e0b','#3b82f6','#ef4444','#14b8a6','#a855f7',
];

const LIVE_TABS = [
  { id:'hourly',  label:'Hourly',  ms:3600000,     desc:'this hour' },
  { id:'daily',   label:'Daily',   ms:86400000,    desc:'today' },
  { id:'weekly',  label:'Weekly',  ms:604800000,   desc:'this week' },
  { id:'monthly', label:'Monthly', ms:2592000000,  desc:'this month' },
  { id:'yearly',  label:'Yearly',  ms:31536000000, desc:'this year' },
];

// Different CSS transitions per slot index
const SLOT_TRANSITIONS = [
  'transform 0.8s cubic-bezier(0.34,1.56,0.64,1)',   // springy
  'transform 0.6s ease-in-out',                        // smooth
  'transform 0.9s cubic-bezier(0.68,-0.55,0.27,1.55)',// overshoot
  'transform 0.5s ease-out',                           // snappy
  'transform 1.0s cubic-bezier(0.25,0.46,0.45,0.94)', // gentle
  'transform 0.7s cubic-bezier(0.34,1.56,0.64,1)',    // spring2
  'transform 0.55s cubic-bezier(0.47,1.64,0.41,0.8)', // bounce
];

// Masonry grid layout definitions: each slot has col/row span
// Layout: 1 hero (col 1-2, row 1-2) + 6 smaller cards filling a 4-col 3-row grid
const GRID_LAYOUT = [
  { col:'1 / span 2', row:'1 / span 2', big:true  }, // hero — half screen
  { col:'3 / span 1', row:'1 / span 1', big:false },
  { col:'4 / span 1', row:'1 / span 1', big:false },
  { col:'3 / span 2', row:'2 / span 1', big:false },
  { col:'1 / span 1', row:'3 / span 1', big:false },
  { col:'2 / span 2', row:'3 / span 1', big:false },
  { col:'4 / span 1', row:'2 / span 2', big:false },
];

// Single fullscreen card slot — manages its own independent lifecycle
const LiveCard = ({ items, accent, slotIdx, theme:T }) => {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);
  const [entering, setEntering] = useState(false);
  const timerRef = useRef(null);
  const qRef = useRef(items);
  const idxRef = useRef(slotIdx % Math.max(items.length,1));

  useEffect(()=>{ qRef.current = items; },[items]);

  const showNext = useCallback(()=>{
    // 1. Flip out
    setEntering(false);
    setVisible(false);

    setTimeout(()=>{
      // 2. Pick next item
      const q = qRef.current;
      if(!q.length) return;
      idxRef.current = (idxRef.current + 1) % q.length;
      setCurrent(q[idxRef.current]);

      // 3. Flip in
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          setVisible(true);
          setEntering(true);
        });
      });
    }, 350);
  },[]);

  // Initial mount — stagger startup by slot index
  useEffect(()=>{
    if(!items.length) return;
    const startDelay = slotIdx * 600; // 0ms, 600ms, 1200ms… stagger
    const t = setTimeout(()=>{
      const q = qRef.current;
      const startIdx = slotIdx % Math.max(q.length,1);
      idxRef.current = startIdx;
      setCurrent(q[startIdx] || null);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ setVisible(true); setEntering(true); }));

      // Random display time 3000–6000ms
      const displayTime = 3000 + Math.random() * 3000;
      timerRef.current = setInterval(showNext, displayTime);
    }, startDelay);
    return ()=>{ clearTimeout(t); clearInterval(timerRef.current); };
  // eslint-disable-next-line
  },[]);

  // Update queue when items change
  useEffect(()=>{
    qRef.current = items;
  },[items]);

  const isBig = GRID_LAYOUT[slotIdx]?.big;
  const transition = SLOT_TRANSITIONS[slotIdx % SLOT_TRANSITIONS.length];

  const enterTransforms = [
    ['translateX(-110%)', 'translateX(0)'],
    ['translateX(110%)',  'translateX(0)'],
    ['translateY(-90%)',  'translateY(0)'],
    ['translateY(90%)',   'translateY(0)'],
    ['scale(0.4) rotate(-12deg)', 'scale(1) rotate(0deg)'],
    ['scale(0.4) rotate(12deg)',  'scale(1) rotate(0deg)'],
    ['scale(1.3) translateY(-20px)', 'scale(1) translateY(0)'],
  ];
  const [fromTransform, toTransform] = enterTransforms[slotIdx % enterTransforms.length];

  return(
    <div style={{
      gridColumn: GRID_LAYOUT[slotIdx]?.col,
      gridRow:    GRID_LAYOUT[slotIdx]?.row,
      overflow: 'hidden',
      borderRadius: 16,
    }}>
      <div style={{
        width:'100%', height:'100%',
        transform: entering ? toTransform : fromTransform,
        opacity: visible ? 1 : 0,
        transition: entering
          ? `${transition}, opacity 0.4s ease`
          : 'opacity 0.3s ease',
        background: current ? `linear-gradient(135deg, ${accent}22, ${accent}0a)` : 'transparent',
        border: current ? `1px solid ${accent}55` : `1px solid transparent`,
        borderRadius: 16,
        padding: isBig ? '28px 32px' : '18px 20px',
        boxSizing: 'border-box',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        position:'relative', overflow:'hidden',
        minHeight: isBig ? 200 : 100,
      }}>
        {/* Glow decoration */}
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:`radial-gradient(circle, ${accent}28, transparent 70%)`, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-20, left:-20, width:80, height:80, borderRadius:'50%', background:`radial-gradient(circle, ${accent}18, transparent 70%)`, pointerEvents:'none' }}/>

        {current ? (
          <>
            <div>
              <div style={{ fontSize: isBig?10:8, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2, color:accent, marginBottom: isBig?10:6, opacity:0.9 }}>
                {current.category || 'General'}
              </div>
              <div style={{ fontSize: isBig?20:13, fontWeight:800, color:'#fff', lineHeight:1.35, display:'-webkit-box', WebkitLineClamp: isBig?4:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {current.title}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: isBig?16:8 }}>
              {current.isNew && (
                <span style={{ fontSize: isBig?10:8, fontWeight:800, color:'#34d399', background:'rgba(52,211,153,0.15)', padding:'2px 10px', borderRadius:20, border:'1px solid rgba(52,211,153,0.3)', textTransform:'uppercase', letterSpacing:0.5 }}>Just now</span>
              )}
              <span style={{ fontSize: isBig?11:9, color:'rgba(255,255,255,0.4)', marginLeft:'auto' }}>{ago(current.created_at)}</span>
            </div>
          </>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'rgba(255,255,255,0.15)', fontSize:12 }}>—</div>
        )}
      </div>
    </div>
  );
};

// ── Main LiveFeed component ─────────────────────────────────────────────────
const LiveFeed = ({ theme:T }) => {
  const [liveTab,     setLiveTab]     = useState('daily');
  const [allViews,    setAllViews]    = useState([]);
  const [periodViews, setPeriodViews] = useState([]);
  const [dedupedQ,    setDedupedQ]    = useState([]);
  const [connected,   setConnected]   = useState(false);
  const [liveNew,     setLiveNew]     = useState(0);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [refreshKey,  setRefreshKey]  = useState(0);

  // Compact flip state
  const [flipItem, setFlipItem] = useState(null);
  const [flipDir,  setFlipDir]  = useState(FLIP_DIRS[0]);
  const [flipIn,   setFlipIn]   = useState(false);
  const cycleRef  = useRef(null);
  const compactQ  = useRef([]);
  const compactI  = useRef(0);

  // Wake lock ref
  const wakeLockRef = useRef(null);

  // ── Wake lock: acquire when fullscreen, release when not ──────────────────
  useEffect(()=>{
    if(fullscreen && 'wakeLock' in navigator){
      navigator.wakeLock.request('screen').then(lock=>{ wakeLockRef.current=lock; }).catch(()=>{});
    } else if(wakeLockRef.current){
      wakeLockRef.current.release().catch(()=>{});
      wakeLockRef.current=null;
    }
    return()=>{ if(wakeLockRef.current){ wakeLockRef.current.release().catch(()=>{}); wakeLockRef.current=null; } };
  },[fullscreen]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async()=>{
    setLoading(true);
    const since=new Date(Date.now()-31536000000).toISOString();
    const { data } = await supabase
      .from('views')
      .select('id,post_id,created_at,book_summaries(title,category)')
      .gte('created_at',since)
      .order('created_at',{ascending:false})
      .limit(500);
    const rows=(data||[]).map(r=>({ id:r.id, post_id:r.post_id, title:r.book_summaries?.title||'Untitled', category:r.book_summaries?.category||'', created_at:r.created_at }));
    setAllViews(rows);
    setLoading(false);
  },[]);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  // ── Filter to liveTab ──────────────────────────────────────────────────────
  useEffect(()=>{
    const cfg=LIVE_TABS.find(t=>t.id===liveTab);
    if(!cfg) return;
    const since=Date.now()-cfg.ms;
    const filtered=allViews.filter(r=>new Date(r.created_at).getTime()>=since);
    const seen=new Set(); const deduped=[];
    for(const r of filtered){ if(!seen.has(r.post_id)){ seen.add(r.post_id); deduped.push(r); } }
    setPeriodViews(filtered);
    setDedupedQ(deduped);
    compactQ.current=deduped;
    compactI.current=0;
    setLiveNew(0);
    if(deduped.length>0) triggerCompactFlip(deduped[0],0);
    else { setFlipItem(null); setFlipIn(false); }
  // eslint-disable-next-line
  },[allViews, liveTab]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    const ch=supabase.channel('live-views-ogonjo')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'views'},async(payload)=>{
        const nv=payload.new; if(!nv?.post_id) return;
        const { data:post }=await supabase.from('book_summaries').select('title,category').eq('id',nv.post_id).maybeSingle();
        const item={ id:nv.id, post_id:nv.post_id, title:post?.title||'Untitled', category:post?.category||'', created_at:nv.created_at||new Date().toISOString(), isNew:true };
        setAllViews(prev=>[item,...prev]);
        setLiveNew(p=>p+1);
        compactQ.current=[item,...compactQ.current.filter(r=>r.post_id!==item.post_id)];
        triggerCompactFlip(item,Math.floor(Math.random()*FLIP_DIRS.length));
      })
      .subscribe(s=>setConnected(s==='SUBSCRIBED'));
    return()=>supabase.removeChannel(ch);
  // eslint-disable-next-line
  },[]);

  // ── Compact auto-cycle (4s, doesn't race with fullscreen) ─────────────────
  const triggerCompactFlip = useCallback((item,dirIdx=0)=>{
    const dir=FLIP_DIRS[dirIdx%FLIP_DIRS.length];
    setFlipDir(dir); setFlipIn(false); setFlipItem(item);
    requestAnimationFrame(()=>requestAnimationFrame(()=>setFlipIn(true)));
  },[]);

  useEffect(()=>{
    cycleRef.current=setInterval(()=>{
      if(!compactQ.current.length) return;
      compactI.current=(compactI.current+1)%compactQ.current.length;
      triggerCompactFlip(compactQ.current[compactI.current],Math.floor(Math.random()*FLIP_DIRS.length));
    },4000);
    return()=>clearInterval(cycleRef.current);
  },[triggerCompactFlip]);

  // ── Distribute items across grid slots (each slot gets a different offset) ─
  const gridItems = GRID_LAYOUT.map((_,i)=>{
    if(!dedupedQ.length) return [];
    return [...dedupedQ.slice(i%dedupedQ.length), ...dedupedQ.slice(0, i%dedupedQ.length)];
  });

  const tabCfg   = LIVE_TABS.find(t=>t.id===liveTab);
  const viewCount= periodViews.length;

  // ── Shared tab bar ─────────────────────────────────────────────────────────
  const TabBar = () => (
    <div style={{ display:'flex', gap:3, background:'rgba(255,255,255,0.06)', borderRadius:8, padding:3 }}>
      {LIVE_TABS.map(t=>(
        <button key={t.id} onClick={()=>setLiveTab(t.id)} style={{
          background: liveTab===t.id ? T.accent+'44' : 'transparent',
          border: `1px solid ${liveTab===t.id ? T.accent+'77' : 'transparent'}`,
          color: liveTab===t.id ? T.accent : T.tabInactive,
          padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700,
          transition:'all 0.15s', whiteSpace:'nowrap',
        }}>{t.label}</button>
      ))}
    </div>
  );

  // ── FULLSCREEN ─────────────────────────────────────────────────────────────
  if(fullscreen) return(
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'#060c1a', display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @keyframes livePulse{0%{transform:scale(1);opacity:0.7}100%{transform:scale(2.8);opacity:0}}
        @keyframes countSlide{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ position:'relative', width:10, height:10 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', position:'absolute' }}/>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', position:'absolute', animation:'livePulse 1.5s ease-out infinite' }}/>
          </div>
          <span style={{ fontSize:13, fontWeight:900, color:'#fff', letterSpacing:1.5, textTransform:'uppercase' }}>Live</span>
          <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
            <span style={{ fontSize:38, fontWeight:900, color:T.accent, letterSpacing:-1.5, lineHeight:1, animation:'countSlide 0.5s ease' }}>
              {viewCount.toLocaleString()}
            </span>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>views {tabCfg?.desc}</span>
          </div>
          {liveNew>0&&(
            <span style={{ fontSize:11, color:'#34d399', fontWeight:800, background:'rgba(52,211,153,0.12)', padding:'3px 12px', borderRadius:20, border:'1px solid rgba(52,211,153,0.25)' }}>+{liveNew} new</span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <TabBar/>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:connected?'#34d399':'#64748b', transition:'background 0.3s' }}/>
            <span style={{ fontSize:10, color:connected?'#34d399':'#64748b' }}>{connected?'Live':'Connecting…'}</span>
          </div>
          {/* Refresh */}
          <button onClick={()=>{ fetchAll(); setRefreshKey(k=>k+1); }} title="Refresh" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'rgba(255,255,255,0.5)', padding:'5px 11px', cursor:'pointer', fontSize:14, transition:'all 0.15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.color=T.accent; e.currentTarget.style.borderColor=T.accent; }}
            onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}>
            ↻
          </button>
          {/* Exit */}
          <button onClick={()=>setFullscreen(false)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'rgba(255,255,255,0.5)', padding:'5px 14px', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.color='#ef4444'; e.currentTarget.style.borderColor='#ef4444'; }}
            onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}>
            ✕ Exit
          </button>
        </div>
      </div>

      {/* Masonry grid — fills full remaining height */}
      <div style={{ flex:1, padding:'16px 20px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gridTemplateRows:'repeat(3,1fr)', gap:12, overflow:'hidden' }}>
        {GRID_LAYOUT.map((_,i)=>(
          <LiveCard
            key={`${refreshKey}-${i}`}
            items={gridItems[i]||[]}
            accent={CARD_ACCENTS[i%CARD_ACCENTS.length]}
            slotIdx={i}
            theme={T}
          />
        ))}
      </div>
    </div>
  );

  // ── COMPACT ────────────────────────────────────────────────────────────────
  return(
    <div style={{ background:T.liveBg, border:`1px solid ${T.liveBorder}`, borderRadius:14, padding:'16px 20px', marginBottom:14 }}>
      <style>{`
        @keyframes livePulse{0%{transform:scale(1);opacity:0.7}100%{transform:scale(2.8);opacity:0}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ position:'relative', width:10, height:10 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', position:'absolute' }}/>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', position:'absolute', animation:'livePulse 1.5s ease-out infinite' }}/>
          </div>
          <span style={{ fontSize:12, fontWeight:800, color:T.text, letterSpacing:1, textTransform:'uppercase' }}>Live</span>
          {!loading&&<span style={{ fontSize:19, fontWeight:900, color:T.accent, letterSpacing:-0.5, lineHeight:1 }}>{viewCount.toLocaleString()}</span>}
          <span style={{ fontSize:11, color:T.textMuted }}>views {tabCfg?.desc}</span>
          {liveNew>0&&<span style={{ fontSize:10, color:'#34d399', fontWeight:700, background:'rgba(52,211,153,0.1)', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(52,211,153,0.2)' }}>+{liveNew}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:connected?'#34d399':'#64748b', transition:'background 0.3s' }}/>
            <span style={{ fontSize:10, color:connected?'#34d399':T.textMuted }}>{connected?'Live':'…'}</span>
          </div>
          <button onClick={()=>setFullscreen(true)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:7, color:T.textMuted, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700, transition:'all 0.15s', display:'flex', alignItems:'center', gap:4 }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textMuted; }}>
            ⛶ Fullscreen
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', gap:3, background:T.surface, borderRadius:8, padding:3, border:`1px solid ${T.border}` }}>
          {LIVE_TABS.map(t=>(
            <button key={t.id} onClick={()=>setLiveTab(t.id)} style={{
              background: liveTab===t.id ? T.accent+'33' : 'transparent',
              border: `1px solid ${liveTab===t.id ? T.accent+'66' : 'transparent'}`,
              color: liveTab===t.id ? T.accent : T.tabInactive,
              padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:700,
              transition:'all 0.15s', whiteSpace:'nowrap',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Compact flip card */}
      {loading
        ?<div style={{ height:110, display:'flex', alignItems:'center', justifyContent:'center', color:T.textMuted, fontSize:12 }}>Loading…</div>
        : dedupedQ.length===0
          ?<div style={{ height:90, display:'flex', alignItems:'center', justifyContent:'center', background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, color:T.textMuted, fontSize:12 }}>No views {tabCfg?.desc}</div>
          :(
            <div style={{ perspective:800, height:110 }}>
              <div style={{
                width:'100%', height:'100%',
                transform: flipIn ? flipDir.to : flipDir.from,
                transition: flipIn ? 'transform 0.65s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s' : 'none',
                opacity: flipIn ? 1 : 0,
                background: flipItem ? `linear-gradient(135deg,${catColor(flipItem.category)}1a,${catColor(flipItem.category)}08)` : T.surface,
                border: `1px solid ${flipItem ? catColor(flipItem.category)+'44' : T.border}`,
                borderRadius:12, padding:'14px 16px', boxSizing:'border-box',
                display:'flex', flexDirection:'column', justifyContent:'space-between',
                position:'relative', overflow:'hidden',
              }}>
                {flipItem&&(
                  <>
                    <div style={{ position:'absolute', top:-15, right:-15, width:70, height:70, borderRadius:'50%', background:`radial-gradient(circle,${catColor(flipItem.category)}22,transparent 70%)`, pointerEvents:'none' }}/>
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:catColor(flipItem.category), marginBottom:5 }}>{flipItem.category||'General'}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{flipItem.title}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      {flipItem.isNew&&<span style={{ fontSize:8, fontWeight:800, color:'#34d399', background:'rgba(52,211,153,0.15)', padding:'1px 7px', borderRadius:20, border:'1px solid rgba(52,211,153,0.3)', textTransform:'uppercase' }}>Just now</span>}
                      <span style={{ fontSize:9, color:T.textMuted, marginLeft:'auto' }}>{ago(flipItem.created_at)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
      }

      {/* Recent list */}
      {!loading && dedupedQ.length>0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:10, maxHeight:120, overflowY:'auto' }}>
          {dedupedQ.slice(0,5).map((v,i)=>(
            <div key={v.id||i} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 8px', borderRadius:7, background:v.isNew?'rgba(52,211,153,0.05)':'transparent', border:`1px solid ${v.isNew?'rgba(52,211,153,0.18)':'transparent'}`, transition:'all 0.3s', animation:v.isNew?'fadeSlideIn 0.4s ease':'none' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:catColor(v.category), flexShrink:0 }}/>
              <span style={{ fontSize:11, color:T.text, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:v.isNew?700:400 }}>{v.title}</span>
              <span style={{ fontSize:9, color:T.textMuted, flexShrink:0 }}>{ago(v.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM BRIEF — collapsible smart card, always at top of dashboard
// Collapsed: instant summary from existing data (no AI)
// Expanded: full Gemini pattern analysis on demand
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT_MAP_PB = {
  cyan:'#06b6d4', purple:'#8b5cf6', orange:'#f97316',
  green:'#10b981', pink:'#ec4899', amber:'#f59e0b',
};

const PlatformBrief = ({ theme:T, topContent, catData, stats, prev, rawViews, period }) => {
  const [open,        setOpen]        = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiResult,    setAiResult]    = useState(null);
  const [aiError,     setAiError]     = useState(null);
  const [cachedAt,    setCachedAt]    = useState(null);
  const resultRef = useRef(null);

  // ── Compute collapsed summary from props (instant, no AI) ────────────────
  const topCat      = catData[0]?.name || '—';
  const topCatPct   = catData[0]?.value || 0;
  const viewDelta   = prev.views > 0 ? +((stats.views - prev.views) / prev.views * 100).toFixed(1) : 0;
  const momentum    = viewDelta >= 10 ? 'surging' : viewDelta >= 0 ? 'growing' : viewDelta >= -15 ? 'steady' : 'declining';
  const momentumColor = { surging:'#34d399', growing:'#06b6d4', steady:'#f59e0b', declining:'#f87171' }[momentum];
  const momentumIcon  = { surging:'🚀', growing:'📈', steady:'〰️', declining:'📉' }[momentum];

  // Audience type heuristic from top categories
  const audienceMap = {
    'Business Concepts':'Strategists', 'Business Ideas':'Entrepreneurs',
    'Book Summary':'Knowledge Seekers', 'Market Analysis':'Investors',
    'Company Profile':'Researchers', 'Course':'Learners',
    'Frameworks':'Operators', 'Marketing':'Growth Hackers',
  };
  const audienceType = audienceMap[topCat] || 'Business Readers';

  // Health score: weighted formula from views, likes, ratings vs prev
  const viewScore    = Math.min(40, stats.views > 0 ? 20 + Math.min(20, stats.views / 10) : 0);
  const deltaScore   = Math.min(20, Math.max(0, 10 + viewDelta / 5));
  const engageScore  = Math.min(20, (stats.likes + stats.ratings) > 0 ? 15 : 5);
  const contentScore = Math.min(20, topContent.length > 0 ? 15 : 0);
  const healthScore  = Math.round(viewScore + deltaScore + engageScore + contentScore);
  const healthColor  = healthScore >= 70 ? '#34d399' : healthScore >= 45 ? '#f59e0b' : '#f87171';
  const healthLabel  = healthScore >= 70 ? 'Healthy' : healthScore >= 45 ? 'Needs Attention' : 'Low Activity';

  // Key insight
  const keyInsight = (() => {
    if (stats.views === 0) return 'No views recorded yet this period. Try sharing your content.';
    if (viewDelta > 20)   return `Views up ${viewDelta}% vs last ${period.toLowerCase()} — strong momentum, double down on ${topCat}.`;
    if (viewDelta < -20)  return `Views dropped ${Math.abs(viewDelta)}% — audience may need fresh ${topCat} content.`;
    if (topContent[0])    return `"${topContent[0].title}" is your top performer — create related content while it's hot.`;
    return `${topCat} content is driving ${topCatPct}% of all platform views.`;
  })();

  // ── Run full AI analysis ─────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true); setAiError(null);
    try {
      // Build viewed content payload from rawViews + topContent
      const viewCounts = {};
      (rawViews||[]).forEach(r => { viewCounts[r.post_id] = (viewCounts[r.post_id]||0)+1; });
      const viewedContent = (topContent||[]).slice(0,60).map(c => ({
        title: c.title, category: c.category||'General',
        views: viewCounts[c.id] || c.period_views || 1,
        hours: [],
      }));

      const allTitles = (topContent||[]).map(c => c.title);
      const topCategories = (catData||[]).slice(0,10).map(c => ({ name:c.name, count:c.value }));
      const periodLabel = period;
      const totalViews  = stats.views;

      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode:'pattern', viewedContent, allTitles, periodLabel, totalViews, topCategories }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed');
      setAiResult(data);
      setCachedAt(new Date());
      setTimeout(()=>resultRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 150);
    } catch(e) {
      setAiError(e.message || 'Something went wrong. Try again.');
    } finally { setAiLoading(false); }
  }, [aiLoading, rawViews, topContent, catData, period, stats]);

  // ── Collapsed badge atom ─────────────────────────────────────────────────
  const Pill = ({ label, value, color, icon }) => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'8px 14px', background:color+'12', border:`1px solid ${color}33`, borderRadius:10, minWidth:80 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontSize:14, fontWeight:900, color, letterSpacing:-0.5, lineHeight:1 }}>{value}</span>
      <span style={{ fontSize:9, color:T.textMuted, textTransform:'uppercase', letterSpacing:0.8, textAlign:'center' }}>{label}</span>
    </div>
  );

  // ── Expanded result atoms ────────────────────────────────────────────────
  const ResultBadge = ({ label, color }) => (
    <span style={{ fontSize:9, fontWeight:800, color, background:color+'18', border:`1px solid ${color}44`, padding:'1px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{label}</span>
  );

  const STRENGTH_C = { strong:'#34d399', moderate:'#f59e0b', emerging:'#94a3b8' };
  const URGENCY_C  = { high:'#ef4444', medium:'#f97316', low:'#64748b' };
  const IMPACT_C   = { high:'#34d399', medium:'#f59e0b' };
  const ARCHETYPE_COLORS = ['#06b6d4','#8b5cf6','#f97316','#10b981'];

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, marginBottom:14, overflow:'hidden', transition:'all 0.3s' }}>

      {/* ── ALWAYS VISIBLE HEADER ── */}
      <div
        onClick={()=>setOpen(v=>!v)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', cursor:'pointer', userSelect:'none',
          background: open ? T.headerRow : 'transparent',
          borderBottom: open ? `1px solid ${T.border}` : 'none',
          transition:'background 0.2s',
        }}
        onMouseEnter={e=>{ if(!open) e.currentTarget.style.background=T.rowHover; }}
        onMouseLeave={e=>{ if(!open) e.currentTarget.style.background='transparent'; }}
      >
        {/* Health score ring */}
        <div style={{ position:'relative', width:48, height:48, flexShrink:0 }}>
          <svg width="48" height="48" style={{ transform:'rotate(-90deg)' }}>
            <circle cx="24" cy="24" r="20" fill="none" stroke={T.border} strokeWidth="4"/>
            <circle cx="24" cy="24" r="20" fill="none" stroke={healthColor} strokeWidth="4"
              strokeDasharray={`${(healthScore/100)*125.6} 125.6`}
              strokeLinecap="round" style={{ transition:'stroke-dasharray 0.6s ease' }}/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
            <span style={{ fontSize:11, fontWeight:900, color:healthColor, lineHeight:1 }}>{healthScore}</span>
          </div>
        </div>

        {/* Summary text */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:12, fontWeight:800, color:T.text }}>Platform Brief</span>
            <span style={{ fontSize:10, fontWeight:700, color:healthColor, background:healthColor+'18', padding:'1px 8px', borderRadius:20, border:`1px solid ${healthColor}33` }}>{healthLabel}</span>
            {cachedAt && <span style={{ fontSize:9, color:T.textMuted }}>· analysed {cachedAt.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>}
          </div>
          <div style={{ fontSize:11, color:T.textSub, lineHeight:1.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {keyInsight}
          </div>
        </div>

        {/* Metric pills */}
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <Pill label={`vs last ${period.toLowerCase()}`} value={`${viewDelta >= 0?'+':''}${viewDelta}%`} color={momentumColor} icon={momentumIcon}/>
          <Pill label="top category" value={topCat.split(' ')[0]} color={T.accent} icon="📂"/>
          <Pill label="audience" value={audienceType.split(' ')[0]} color="#8b5cf6" icon="👥"/>
        </div>

        {/* Chevron */}
        <div style={{ fontSize:14, color:T.textMuted, transform:open?'rotate(180deg)':'rotate(0deg)', transition:'transform 0.25s', flexShrink:0 }}>▼</div>
      </div>

      {/* ── EXPANDED PANEL ── */}
      {open && (
        <div style={{ padding:'18px 20px' }}>

          {/* Generate button */}
          {!aiResult && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:10, lineHeight:1.6 }}>
                Full analysis detects topic clusters, reader archetypes, content gaps, momentum signals and generates 5 content outlines based on your <strong style={{ color:T.text }}>{period.toLowerCase()}</strong> data ({stats.views.toLocaleString()} views).
              </div>
              {aiError && (
                <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:9, padding:'8px 14px', color:'#f87171', fontSize:11, marginBottom:10 }}>
                  ⚠️ {aiError}
                </div>
              )}
              <button onClick={runAnalysis} disabled={aiLoading} style={{
                width:'100%', padding:'11px', borderRadius:10, border:'none', cursor:aiLoading?'default':'pointer',
                background: aiLoading ? T.surface : `linear-gradient(135deg,${T.accent},${T.aiAccent})`,
                color: aiLoading ? T.textMuted : '#fff',
                fontSize:13, fontWeight:800, transition:'all 0.2s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                {aiLoading
                  ? <><span style={{ animation:'pbSpin 1s linear infinite', display:'inline-block' }}>◌</span> Analysing patterns… (~20s)</>
                  : '🧠 Generate Full Analysis'}
              </button>
              <style>{`@keyframes pbSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Results */}
          {aiResult && (
            <div ref={resultRef}>
              {/* Re-run button */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.text }}>🧠 Pattern Analysis — {aiResult.periodLabel}</div>
                <button onClick={()=>{ setAiResult(null); setCachedAt(null); }} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:7, color:T.textMuted, padding:'4px 10px', cursor:'pointer', fontSize:10, fontWeight:700 }}>↺ Re-run</button>
              </div>

              {/* Narrative */}
              <div style={{ background:`linear-gradient(135deg,${T.accent}14,${T.aiAccent}06)`, border:`1px solid ${T.accent}33`, borderRadius:12, padding:'14px 18px', marginBottom:14 }}>
                <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:T.accent, marginBottom:6 }}>The Big Picture</div>
                <p style={{ fontSize:13, color:T.text, lineHeight:1.7, margin:0, fontWeight:500 }}>{aiResult.narrative}</p>
              </div>

              {/* Clusters + Archetypes side by side */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>

                {/* Clusters */}
                <div>
                  <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:T.textMuted, marginBottom:8 }}>📦 Topic Clusters</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {(aiResult.clusters||[]).map((c,i)=>{
                      const ac = ACCENT_MAP_PB[c.color] || T.accent;
                      return(
                        <div key={i} style={{ background:`linear-gradient(135deg,${ac}12,${ac}04)`, border:`1px solid ${ac}33`, borderRadius:10, padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                            <span style={{ fontSize:16 }}>{c.emoji}</span>
                            <span style={{ fontSize:11, fontWeight:700, color:T.text, flex:1 }}>{c.theme}</span>
                            <ResultBadge label={c.strength} color={STRENGTH_C[c.strength]||'#94a3b8'}/>
                          </div>
                          <p style={{ fontSize:10, color:T.textSub, lineHeight:1.5, margin:'0 0 7px' }}>{c.signal}</p>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {(c.titles||[]).slice(0,3).map((t,j)=>(
                              <span key={j} style={{ fontSize:8, color:ac, background:ac+'14', border:`1px solid ${ac}33`, padding:'1px 7px', borderRadius:20, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Archetypes */}
                <div>
                  <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:T.textMuted, marginBottom:8 }}>👥 Reader Archetypes</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {(aiResult.archetypes||[]).map((a,i)=>{
                      const ac = ARCHETYPE_COLORS[i%ARCHETYPE_COLORS.length];
                      return(
                        <div key={i} style={{ background:`linear-gradient(135deg,${ac}12,${ac}04)`, border:`1px solid ${ac}33`, borderRadius:10, padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                            <span style={{ fontSize:18 }}>{a.emoji}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:11, fontWeight:700, color:T.text }}>{a.name}</div>
                              <div style={{ fontSize:9, color:ac, fontWeight:700 }}>{a.percentOfAudience}% of audience</div>
                            </div>
                          </div>
                          <p style={{ fontSize:10, color:T.textSub, lineHeight:1.5, margin:'0 0 6px' }}>{a.description}</p>
                          <div style={{ fontSize:10, color:T.text, background:ac+'12', border:`1px solid ${ac}33`, borderRadius:7, padding:'5px 9px' }}>
                            <span style={{ fontSize:8, fontWeight:800, color:ac, textTransform:'uppercase', letterSpacing:0.5 }}>Wants: </span>{a.whatTheyWant}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Gaps + Momentum side by side */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>

                {/* Gaps */}
                <div>
                  <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:T.textMuted, marginBottom:8 }}>🕳 Content Gaps</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    {(aiResult.gaps||[]).map((g,i)=>(
                      <div key={i} style={{ display:'flex', gap:10, background:T.surface, border:`1px solid ${T.border}`, borderRadius:9, padding:'9px 12px' }}>
                        <span style={{ fontSize:16, flexShrink:0 }}>{g.emoji}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:T.text }}>{g.topic}</span>
                            <ResultBadge label={g.urgency} color={URGENCY_C[g.urgency]}/>
                          </div>
                          <p style={{ fontSize:10, color:T.textSub, lineHeight:1.4, margin:'0 0 3px' }}>{g.whyItsMissing}</p>
                          <p style={{ fontSize:10, color:T.accent, margin:0, fontWeight:600 }}>→ {g.opportunity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Momentum */}
                <div>
                  <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:T.textMuted, marginBottom:8 }}>📈 Momentum</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'#34d399', textTransform:'uppercase', letterSpacing:0.8, marginBottom:2 }}>▲ Rising</div>
                    {(aiResult.momentum?.rising||[]).map((r,i)=>(
                      <div key={i} style={{ display:'flex', gap:7, padding:'6px 9px', background:'rgba(52,211,153,0.06)', borderRadius:8 }}>
                        <span style={{ fontSize:13 }}>{r.emoji}</span>
                        <div><div style={{ fontSize:10, fontWeight:700, color:'#34d399' }}>{r.topic}</div><div style={{ fontSize:9, color:'#6ee7b7', lineHeight:1.3 }}>{r.signal}</div></div>
                      </div>
                    ))}
                    <div style={{ fontSize:9, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:0.8, marginTop:6, marginBottom:2 }}>▼ Cooling</div>
                    {(aiResult.momentum?.declining||[]).map((r,i)=>(
                      <div key={i} style={{ display:'flex', gap:7, padding:'6px 9px', background:'rgba(248,113,113,0.06)', borderRadius:8 }}>
                        <span style={{ fontSize:13 }}>{r.emoji}</span>
                        <div><div style={{ fontSize:10, fontWeight:700, color:'#f87171' }}>{r.topic}</div><div style={{ fontSize:9, color:'#fca5a5', lineHeight:1.3 }}>{r.signal}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5 Content Outlines */}
              <div>
                <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:T.textMuted, marginBottom:8 }}>✍️ 5 Content Outlines</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(aiResult.outlines||[]).map((o,i)=>(
                    <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:11, padding:'14px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                            <span style={{ fontSize:10, fontWeight:800, color:T.textMuted }}>#{i+1}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{o.title}</span>
                          </div>
                          <p style={{ fontSize:10, color:T.textSub, lineHeight:1.5, margin:0 }}>{o.angle}</p>
                        </div>
                        <ResultBadge label={`${o.estimatedImpact} impact`} color={IMPACT_C[o.estimatedImpact]||'#94a3b8'}/>
                      </div>
                      <div style={{ fontSize:10, color:T.accent, fontWeight:600, background:T.accent+'12', border:`1px solid ${T.accent}33`, borderRadius:7, padding:'5px 10px', marginBottom:8 }}>
                        💡 {o.whyNow}
                      </div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {(o.structure||[]).map((s,j)=>(
                          <div key={j} style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span style={{ fontSize:8, fontWeight:800, color:T.textMuted }}>{'0'+(j+1)}</span>
                            <span style={{ fontSize:10, color:T.text }}>{s}</span>
                            {j<(o.structure||[]).length-1 && <span style={{ color:T.border, fontSize:9 }}>›</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const AnalyticsDashboard = ({ theme:T }) => {
  const [period, setPeriod]       = useState('Week');
  const [activeMetric, setMetric] = useState('views');
  const [stats, setStats]         = useState({ views:0, likes:0, ratings:0, newUsers:0 });
  const [prev, setPrev]           = useState({ views:0, likes:0, ratings:0, newUsers:0 });
  const [chartData, setChart]     = useState([]);
  const [topContent, setTop]      = useState([]);
  const [rawViews, setRawViews]   = useState([]);
  const [catData, setCat]         = useState([]);
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAllContent, setShowAllContent] = useState(false);
  const [catSearch, setCatSearch]           = useState('');
  const [selectedHour, setSelectedHour]     = useState(null);
  const [selectedDay,  setSelectedDay]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setShowAllContent(false); setSelectedHour(null); setSelectedDay(null);
    try {
      const now=Date.now(), curMs=periodMs[period];
      const sinceA=new Date(now-curMs).toISOString();
      const sinceB=new Date(now-curMs*2).toISOString();
      const trunc=periodTrunc[period];

      // QUERY 1: current period rows (fetch once, count client-side — replaces 4 count queries)
      const [
        {data:viewRowsA},{data:likeRowsA},{data:ratingRowsA},{data:userRowsA}
      ] = await Promise.all([
        supabase.from('views').select('post_id,created_at').gte('created_at',sinceA),
        supabase.from('likes').select('created_at').gte('created_at',sinceA),
        supabase.from('ratings').select('created_at').gte('created_at',sinceA),
        supabase.from('profiles').select('created_at').gte('created_at',sinceA),
      ]);

      // QUERY 2: previous period counts (still need head:true for prev period delta)
      const [vB,lB,rB,uB] = await Promise.all([
        supabase.from('views').select('id',{count:'exact',head:true}).gte('created_at',sinceB).lt('created_at',sinceA),
        supabase.from('likes').select('id',{count:'exact',head:true}).gte('created_at',sinceB).lt('created_at',sinceA),
        supabase.from('ratings').select('id',{count:'exact',head:true}).gte('created_at',sinceB).lt('created_at',sinceA),
        supabase.from('profiles').select('id',{count:'exact',head:true}).gte('created_at',sinceB).lt('created_at',sinceA),
      ]);

      setStats({ views:viewRowsA?.length??0, likes:likeRowsA?.length??0, ratings:ratingRowsA?.length??0, newUsers:userRowsA?.length??0 });
      setPrev ({ views:vB.count??0, likes:lB.count??0, ratings:rB.count??0, newUsers:uB.count??0 });

      // Chart from same rows — no extra queries
      const bucketKey=(iso)=>{ const d=new Date(iso); if(trunc==='hour') return `${String(d.getHours()).padStart(2,'0')}:00`; if(trunc==='month') return d.toLocaleDateString('en-US',{month:'short'}); return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); };
      const bkt={views:{},likes:{},ratings:{}};
      (viewRowsA||[]).forEach(r=>{ const k=bucketKey(r.created_at); bkt.views[k]=(bkt.views[k]||0)+1; });
      (likeRowsA||[]).forEach(r=>{ const k=bucketKey(r.created_at); bkt.likes[k]=(bkt.likes[k]||0)+1; });
      (ratingRowsA||[]).forEach(r=>{ const k=bucketKey(r.created_at); bkt.ratings[k]=(bkt.ratings[k]||0)+1; });
      const allKeys=[...new Set([...Object.keys(bkt.views),...Object.keys(bkt.likes),...Object.keys(bkt.ratings)])].sort();
      setChart(allKeys.map(k=>({ date:k, views:bkt.views[k]||0, likes:bkt.likes[k]||0, ratings:bkt.ratings[k]||0 })));

      setRawViews(viewRowsA||[]);

      // QUERY 3: top content details (only if there are views)
      if(viewRowsA&&viewRowsA.length>0){
        const viewCounts={};
        viewRowsA.forEach(r=>{ viewCounts[r.post_id]=(viewCounts[r.post_id]||0)+1; });
        const topIds=Object.entries(viewCounts).sort((a,b)=>b[1]-a[1]).slice(0,50).map(([id])=>id);
        const { data:contentDetails } = await supabase.from('book_summaries').select('id,title,category,views_count,likes_count,avg_rating').in('id',topIds);
        setTop((contentDetails||[]).map(c=>({...c,period_views:viewCounts[c.id]||0})).sort((a,b)=>b.period_views-a.period_views));
      } else { setTop([]); }

      // QUERY 4: categories + comments in parallel
      const [{data:cats},{data:comms}] = await Promise.all([
        supabase.from('book_summaries').select('category,views_count').not('category','is',null),
        supabase.from('comments').select('id,content,created_at,profiles(username),book_summaries(title)').gte('created_at',sinceA).order('created_at',{ascending:false}).limit(5),
      ]);
      const catMap={};
      (cats||[]).forEach(r=>{ const c=r.category||'Other'; catMap[c]=(catMap[c]||0)+(r.views_count||0); });
      const total=Object.values(catMap).reduce((s,v)=>s+v,0)||1;
      setCat(Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([name,value],i)=>({ name, value:Math.round(value/total*100), color:CAT_COLOURS[i%CAT_COLOURS.length] })));
      setComments(comms||[]);

    } catch(err){ console.error('Dashboard error',err); }
    finally{ setLoading(false); }
  },[period]);

  useEffect(()=>{ load(); },[load]);

  const activeMetricObj=METRICS.find(m=>m.id===activeMetric)||METRICS[0];
  const filteredCats=catSearch.trim()?catData.filter(c=>c.name.toLowerCase().includes(catSearch.trim().toLowerCase())):catData;

  const getDrillContent=()=>{
    if(period==='Today'&&selectedHour!==null){
      const hourCounts={}; rawViews.forEach(r=>{ if(new Date(r.created_at).getHours()===selectedHour) hourCounts[r.post_id]=(hourCounts[r.post_id]||0)+1; });
      const ids=new Set(Object.keys(hourCounts));
      return topContent.filter(c=>ids.has(c.id)).map(c=>({...c,period_views:hourCounts[c.id]||0})).sort((a,b)=>b.period_views-a.period_views);
    }
    if(period==='Week'&&selectedDay!==null){
      const dayCounts={}; rawViews.forEach(r=>{ if(new Date(r.created_at).getDay()===selectedDay) dayCounts[r.post_id]=(dayCounts[r.post_id]||0)+1; });
      const ids=new Set(Object.keys(dayCounts));
      return topContent.filter(c=>ids.has(c.id)).map(c=>({...c,period_views:dayCounts[c.id]||0})).sort((a,b)=>b.period_views-a.period_views);
    }
    return topContent;
  };

  const drillContent=getDrillContent();
  const visibleContent=showAllContent?drillContent:drillContent.slice(0,8);
  const hoursWithViews=[...new Set(rawViews.map(r=>new Date(r.created_at).getHours()))].sort((a,b)=>a-b);
  const daysWithViews=[...new Set(rawViews.map(r=>new Date(r.created_at).getDay()))].sort((a,b)=>a-b);
  const selectStyle={ padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600, background:T.inputBg, border:`1px solid ${T.inputBorder}`, color:T.text, outline:'none', appearance:'none', WebkitAppearance:'none', paddingRight:24 };

  if(loading) return(<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:260, color:T.textMuted, fontSize:13 }}>Loading analytics…</div>);

  return(
    <div style={{ overflowY:'auto', flex:1, paddingRight:4, paddingBottom:8 }}>
      {/* Period + refresh */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:11, color:T.textMuted }}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={load} title="Refresh" style={{ background:'none', border:'none', color:T.textMuted, cursor:'pointer', fontSize:15 }}>↻</button>
          <div style={{ display:'flex', gap:3, background:T.surface, borderRadius:8, padding:3, border:`1px solid ${T.border}` }}>
            {PERIODS.map(p=>(<button key={p} onClick={()=>setPeriod(p)} style={{ background:period===p?T.tabActive:'transparent', border:'none', color:period===p?T.tabText:T.tabInactive, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s' }}>{p}</button>))}
          </div>
        </div>
      </div>

      {/* PLATFORM BRIEF */}
      <PlatformBrief theme={T} topContent={topContent} catData={catData} stats={stats} prev={prev} rawViews={rawViews} period={period}/>

      {/* LIVE FEED */}
      <LiveFeed theme={T}/>

      {/* Stat cards */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {METRICS.map(m=>(<StatCard key={m.id} label={m.label} icon={m.icon} value={stats[m.id]??0} delta={pct(stats[m.id]??0,prev[m.id]??0)} accent={m.color} theme={T}/>))}
      </div>

      {/* Chart */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub }}>{activeMetricObj.label} — {period}</span>
          <div style={{ display:'flex', gap:5 }}>
            {METRICS.filter(m=>m.id!=='newUsers').map(m=>(<button key={m.id} onClick={()=>setMetric(m.id)} style={{ background:activeMetric===m.id?m.color+'22':'transparent', border:`1px solid ${activeMetric===m.id?m.color:T.border}`, color:activeMetric===m.id?m.color:T.textMuted, padding:'3px 10px', borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:600, textTransform:'capitalize', transition:'all 0.15s' }}>{m.icon} {m.label}</button>))}
          </div>
        </div>
        {chartData.length===0
          ?<div style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'28px 0' }}>No activity in this period</div>
          :<ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={activeMetricObj.color} stopOpacity={0.3}/><stop offset="100%" stopColor={activeMetricObj.color} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="date" tick={{ fill:T.textMuted, fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:T.textMuted, fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<DashTooltip theme={T}/>}/>
              <Area type="monotone" dataKey={activeMetric} stroke={activeMetricObj.color} strokeWidth={2} fill="url(#dg)" dot={false} activeDot={{ r:4, strokeWidth:0 }}/>
            </AreaChart>
          </ResponsiveContainer>
        }
      </div>

      {/* Top content + category */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 220px', gap:10, marginBottom:12 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub }}>Top Content — {period}</span>
            {drillContent.length>8&&(<button onClick={()=>setShowAllContent(v=>!v)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:20, color:T.accent, fontSize:10, fontWeight:700, cursor:'pointer', padding:'2px 10px', transition:'all 0.15s' }}>{showAllContent?'▲ Show less':`View all ${drillContent.length} →`}</button>)}
          </div>
          {period==='Today'&&hoursWithViews.length>0&&(
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'8px 10px', background:T.headerRow, borderRadius:8, border:`1px solid ${T.border}` }}>
              <span style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:0.8, flexShrink:0 }}>🕐 Hour</span>
              <div style={{ position:'relative', flex:1 }}>
                <select value={selectedHour??''} onChange={e=>{ setShowAllContent(false); setSelectedHour(e.target.value===''?null:Number(e.target.value)); }} style={{ ...selectStyle, width:'100%' }}>
                  <option value="">All hours</option>
                  {hoursWithViews.map(h=>(<option key={h} value={h}>{String(h).padStart(2,'0')}:00 — {String(h).padStart(2,'0')}:59</option>))}
                </select>
                <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', fontSize:9, color:T.textMuted }}>▼</span>
              </div>
              {selectedHour!==null&&(<button onClick={()=>{ setSelectedHour(null); setShowAllContent(false); }} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, color:T.textMuted, padding:'3px 8px', cursor:'pointer', fontSize:10, flexShrink:0 }}>✕ Clear</button>)}
            </div>
          )}
          {period==='Week'&&daysWithViews.length>0&&(
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'8px 10px', background:T.headerRow, borderRadius:8, border:`1px solid ${T.border}` }}>
              <span style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:0.8, flexShrink:0 }}>📅 Day</span>
              <div style={{ position:'relative', flex:1 }}>
                <select value={selectedDay??''} onChange={e=>{ setShowAllContent(false); setSelectedDay(e.target.value===''?null:Number(e.target.value)); }} style={{ ...selectStyle, width:'100%' }}>
                  <option value="">All days</option>
                  {daysWithViews.map(d=>(<option key={d} value={d}>{DAY_NAMES[d]}</option>))}
                </select>
                <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', fontSize:9, color:T.textMuted }}>▼</span>
              </div>
              {selectedDay!==null&&(<button onClick={()=>{ setSelectedDay(null); setShowAllContent(false); }} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, color:T.textMuted, padding:'3px 8px', cursor:'pointer', fontSize:10, flexShrink:0 }}>✕ Clear</button>)}
            </div>
          )}
          {drillContent.length===0
            ?<div style={{ color:T.textMuted, fontSize:12, padding:'16px 0', textAlign:'center' }}>{(period==='Today'&&selectedHour!==null)||(period==='Week'&&selectedDay!==null)?`No views recorded for this ${period==='Today'?'hour':'day'}`:`No views recorded ${period==='Today'?'today':period==='Week'?'this week':period==='Month'?'this month':'this year'} yet`}</div>
            :visibleContent.map((c,i)=>(
              <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:i<visibleContent.length-1?`1px solid ${T.border}`:'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  <span style={{ fontSize:10, color:T.textMuted, fontWeight:700, width:20, flexShrink:0 }}>#{i+1}</span>
                  <div style={{ minWidth:0 }}><div style={{ fontSize:11, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:210 }}>{c.title}</div><div style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>{c.category||'Uncategorized'}</div></div>
                </div>
                <div style={{ display:'flex', gap:10, flexShrink:0, fontSize:11 }}>
                  <span style={{ color:'#06b6d4', fontWeight:600 }}>{fmt(c.period_views)}</span>
                  <span style={{ color:'#f97316' }}>{fmt(c.likes_count)}</span>
                  <span style={{ color:'#f59e0b' }}>★{c.avg_rating??'—'}</span>
                </div>
              </div>
            ))
          }
          {drillContent.length>8&&(
            <button onClick={()=>setShowAllContent(v=>!v)} style={{ marginTop:10, width:'100%', padding:'7px', background:'none', border:`1px dashed ${T.border}`, borderRadius:8, color:T.textMuted, fontSize:11, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textMuted; }}>
              {showAllContent?'▲ Show top 8 only':`▼ View all ${drillContent.length} articles`}
            </button>
          )}
        </div>

        {/* Category */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 12px', display:'flex', flexDirection:'column' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub, marginBottom:8 }}>Categories ({catData.length})</div>
          {catData.length>6&&(<input value={catSearch} onChange={e=>setCatSearch(e.target.value)} placeholder="Filter categories…" style={{ width:'100%', padding:'5px 8px', marginBottom:8, background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:6, color:T.text, fontSize:11, outline:'none', boxSizing:'border-box' }}/>)}
          {catData.length===0?<div style={{ color:T.textMuted, fontSize:12 }}>No data</div>:(
            <>
              <ResponsiveContainer width="100%" height={90}>
                <PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={22} outerRadius={40} dataKey="value" paddingAngle={2} stroke="none">{catData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={v=>`${v}%`} contentStyle={{ background:T.tooltipBg, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }}/></PieChart>
              </ResponsiveContainer>
              <div style={{ overflowY:'auto', flex:1, marginTop:6, maxHeight:300 }}>
                {filteredCats.length===0?<div style={{ fontSize:11, color:T.textMuted, textAlign:'center', padding:'10px 0' }}>No match</div>:filteredCats.map(c=>(
                  <div key={c.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:6, height:6, borderRadius:'50%', background:c.color, flexShrink:0 }}/><span style={{ fontSize:10, color:T.textSub, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:110 }} title={c.name}>{c.name}</span></div>
                    <span style={{ fontSize:10, fontWeight:600, color:T.text }}>{c.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comments */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub, marginBottom:10 }}>Recent Comments — {period}</div>
        {comments.length===0?<div style={{ color:T.textMuted, fontSize:12, textAlign:'center', padding:'16px 0' }}>No comments {period==='Today'?'today':period==='Week'?'this week':period==='Month'?'this month':'this year'}</div>:comments.map((c,i)=>{
          const user=c.profiles?.username||'Anonymous', post=c.book_summaries?.title||'Unknown', letter=user[0]?.toUpperCase()||'A';
          return(
            <div key={c.id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:i<comments.length-1?`1px solid ${T.border}`:'none' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:`hsl(${letter.charCodeAt(0)*37%360},50%,38%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>{letter}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}><span style={{ fontSize:11, fontWeight:600, color:T.text }}>@{user}</span><span style={{ fontSize:10, color:T.textMuted }}>{ago(c.created_at)}</span></div>
                <div style={{ fontSize:11, color:T.textSub, lineHeight:1.4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.content}</div>
                <span style={{ fontSize:10, color:T.textMuted, background:T.surface, border:`1px solid ${T.border}`, padding:'1px 6px', borderRadius:4, marginTop:3, display:'inline-block' }}>on: {post}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AI ADVISOR (unchanged from your version)
// ─────────────────────────────────────────────────────────────────────────────
const AIAdvisor = ({ theme:T }) => {
  const [subTab, setSubTab]         = useState('chat');
  const [category, setCategory]     = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [platformData, setPlatform] = useState(null);
  const [trendingInput,  setTrendingInput]  = useState('');
  const [recommendInput, setRecommendInput] = useState('');
  const [newsInput,      setNewsInput]      = useState('');
  const [messages, setMessages] = useState([
    { role:'assistant', content:"Hey — I'm Marcus, your business consultant for Ogonjo.\n\nI'm here to help you grow this platform into a real revenue machine. I can tell you what's trending right now on Google, what content to create this week, how to monetize your traffic better, and any business strategy question you have.\n\nI search the web in real-time, so my answers are based on what's actually happening today — not outdated data.\n\nWhat do you want to work on?" }
  ]);
  const [chatInput, setChatInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef                 = useRef(null);
  const SUB_TABS = [
    { id:'chat', label:'💬 Ask Marcus' },{ id:'trending', label:'🔍 Trending' },
    { id:'recommendations', label:'💡 Content Ideas' },{ id:'news', label:'📰 Business News' },
  ];
  const [suggestedPrompts, setSuggestedPrompts] = useState({
    chat:["What business topics are trending on Google right now?","How can I monetize Ogonjo's traffic better?","What content should I create this week to grow traffic?","Which African business trends should I be covering?","How do I get my content into Google Discover?"],
    trending:["What niche has the highest search demand right now?","What are entrepreneurs searching for most this week?","Which business concepts are going viral right now?"],
    recommendations:["What content gaps am I missing right now?","What's the highest traffic opportunity this month?","What type of content gets the most Google Discover clicks?"],
    news:["What business news should I turn into content today?","What's the biggest economic story affecting entrepreneurs?","What market trend should I write about this week?"],
  });
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const IMPACT_C={ high:'#ef4444', hot:'#ef4444', medium:'#f97316', low:'#f59e0b', rising:'#10b981' };
  const VOLUME_C={ high:'#06b6d4', medium:'#f97316', rising:'#10b981' };

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try {
        const { data:catData } = await supabase.from('book_summaries').select('category',{distinct:true}).not('category','is',null);
        const unique=[...new Set((catData||[]).map(d=>d.category).filter(Boolean))].sort();
        if(mounted&&unique.length>0){ setCategories(unique); setCategory(unique[0]); }
        const [{data:top},{data:cats},{count}] = await Promise.all([
          supabase.from('book_summaries').select('title,category,views_count,avg_rating').order('views_count',{ascending:false}).limit(8),
          supabase.from('book_summaries').select('category').not('category','is',null),
          supabase.from('book_summaries').select('id',{count:'exact',head:true}),
        ]);
        const catMap={}; (cats||[]).forEach(r=>{ const c=r.category||'Other'; catMap[c]=(catMap[c]||0)+1; });
        const topCats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>({name,count}));
        if(mounted){ setPlatform({ topContent:top||[], topCategories:topCats, totalContent:count||0 }); setSuggestionsLoading(false); }
      } catch(err){ console.error('AIAdvisor init',err); }
    })();
    return()=>{ mounted=false; };
  },[]);

  useEffect(()=>{ setResult(null); setError(null); },[subTab,category]);
  useEffect(()=>{ chatBottomRef.current?.scrollIntoView({ behavior:'smooth' }); },[messages]);

  const effectiveTopic=(tab)=>{ if(tab==='trending') return trendingInput.trim()||category; if(tab==='recommendations') return recommendInput.trim()||category; if(tab==='news') return newsInput.trim()||category; return category; };

  const sendChat=async(overrideText)=>{
    const text=(overrideText||chatInput).trim(); if(!text||chatLoading) return;
    const userMsg={ role:'user', content:text }; const newMessages=[...messages,userMsg];
    setMessages(newMessages); setChatInput(''); setChatLoading(true);
    try {
      const res=await fetch('/api/ai-advisor',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ mode:'chat', message:text, history:newMessages.slice(-12), platformData, categories }) });
      const data=await res.json();
      if(!res.ok||data.error) throw new Error(data.error||'Request failed');
      setMessages(prev=>[...prev,{ role:'assistant', content:data.reply }]);
    } catch(err){ setMessages(prev=>[...prev,{ role:'assistant', content:`Sorry, I ran into an error: ${err.message}` }]); }
    finally{ setChatLoading(false); }
  };

  const fetchData=async()=>{
    setLoading(true); setResult(null); setError(null);
    const topic=effectiveTopic(subTab);
    try {
      const res=await fetch('/api/ai-advisor',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ mode:subTab, category:topic, ...(subTab==='recommendations'&&platformData?{platformData}:{}) }) });
      const data=await res.json();
      if(!res.ok||data.error) throw new Error(data.error||'Request failed');
      setResult(data);
    } catch(err){ setError(err.message||'Could not load data.'); }
    finally{ setLoading(false); }
  };

  const askMarcus=(question)=>{ setSubTab('chat'); setTimeout(()=>sendChat(question),100); };
  const Badge=({ label, colour })=>(<span style={{ fontSize:10, fontWeight:700, color:colour||T.aiAccent, background:(colour||T.aiAccent)+'18', padding:'2px 8px', borderRadius:20, textTransform:'uppercase', whiteSpace:'nowrap', flexShrink:0 }}>{label}</span>);
  const SectionTitle=({ children })=>(<div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub, marginBottom:10 }}>{children}</div>);

  const refreshSuggestions=async()=>{
    setSuggestionsLoading(true);
    try { const res=await fetch('/api/ai-advisor',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ mode:'suggestions', category:'business' }) }); if(res.ok){ const data=await res.json(); if(!data.error&&data.chat) setSuggestedPrompts(data); } } catch(e){}
    finally{ setSuggestionsLoading(false); }
  };

  const PromptStrip=({ tab })=>{
    const prompts=suggestedPrompts[tab]||[]; const isChat=tab==='chat';
    return(
      <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>{isChat?'💡 Suggested questions':'💬 Ask Marcus'}</div>
          <button onClick={refreshSuggestions} disabled={suggestionsLoading} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:10, padding:'1px 7px', fontSize:9, color:T.textMuted, cursor:suggestionsLoading?'default':'pointer', transition:'all 0.15s' }} onMouseEnter={e=>{ if(!suggestionsLoading){e.currentTarget.style.borderColor=T.aiAccent;e.currentTarget.style.color=T.aiAccent;}}} onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textMuted; }}>{suggestionsLoading?'updating…':'↻ refresh'}</button>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {prompts.slice(0,isChat?5:3).map((p,i)=>(<button key={i} onClick={()=>isChat?setChatInput(p):askMarcus(p)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, color:T.textSub, cursor:'pointer', transition:'all 0.15s' }} onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.aiAccent;e.currentTarget.style.color=T.aiAccent; }} onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textSub; }}>{p}</button>))}
        </div>
      </div>
    );
  };

  const renderChat=()=>(
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <PromptStrip tab="chat"/>
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:12, paddingBottom:8, minHeight:200 }}>
        {messages.map((m,i)=>{ const isUser=m.role==='user'; return(
          <div key={i} style={{ display:'flex', justifyContent:isUser?'flex-end':'flex-start', gap:10, alignItems:'flex-end' }}>
            {!isUser&&(<div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${T.aiAccent},${T.accent})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff' }}>M</div>)}
            <div style={{ maxWidth:'80%', display:'flex', flexDirection:'column', gap:4, alignItems:isUser?'flex-end':'flex-start' }}>
              <div style={{ padding:'11px 15px', borderRadius:isUser?'16px 16px 4px 16px':'16px 16px 16px 4px', background:isUser?T.chatUserBg:T.chatAiBg, border:`1px solid ${isUser?T.aiAccent+'55':T.border}`, fontSize:12.5, color:T.text, lineHeight:1.65, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{m.content}</div>
              {!isUser&&<CopyButton text={m.content} theme={T}/>}
            </div>
            {isUser&&(<div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:`hsl(200,60%,35%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>You</div>)}
          </div>
        ); })}
        {chatLoading&&(<div style={{ display:'flex', gap:10, alignItems:'flex-end' }}><div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${T.aiAccent},${T.accent})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff' }}>M</div><div style={{ padding:'11px 15px', borderRadius:'16px 16px 16px 4px', background:T.chatAiBg, border:`1px solid ${T.border}`, color:T.textMuted, fontSize:12 }}>Searching the web…</div></div>)}
        <div ref={chatBottomRef}/>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:8, flexShrink:0 }}>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendChat(); } }} placeholder="Ask Marcus anything about your business, content, or growth…" style={{ flex:1, padding:'11px 14px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:10, color:T.text, fontSize:12.5, outline:'none', boxSizing:'border-box' }}/>
        <button onClick={()=>sendChat()} disabled={chatLoading||!chatInput.trim()} style={{ padding:'11px 20px', borderRadius:10, border:'none', background:chatLoading||!chatInput.trim()?T.surface:`linear-gradient(135deg,${T.aiAccent},${T.accent})`, color:chatLoading||!chatInput.trim()?T.textMuted:'#fff', cursor:chatLoading||!chatInput.trim()?'default':'pointer', fontSize:13, fontWeight:700, transition:'all 0.15s', flexShrink:0 }}>Send</button>
      </div>
    </div>
  );

  const renderTrending=()=>{ if(!result) return(<div><PromptStrip tab="trending"/><div style={{ textAlign:'center', padding:'28px 20px', color:T.textMuted }}><div style={{ fontSize:32, marginBottom:10 }}>🔍</div><div style={{ fontSize:13, color:T.text, marginBottom:4 }}>See what people are searching for in "{effectiveTopic('trending')}"</div><div style={{ fontSize:11 }}>Results pulled live from the web — real search demand right now</div></div></div>);
    return(<><PromptStrip tab="trending"/><div style={{ background:T.aiSurface, border:`1px solid ${T.aiBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}><div style={{ flex:1 }}><div style={{ fontSize:11, color:T.aiAccent, fontWeight:700, marginBottom:4 }}>📊 Search Intelligence — {result.category}</div><p style={{ fontSize:12, color:T.text, lineHeight:1.6, margin:0 }}>{result.insight}</p></div><CopyButton text={result.insight} theme={T}/></div></div>{result.risingTopics?.length>0&&(<div style={{ marginBottom:12 }}><SectionTitle>🚀 Rising Topics</SectionTitle><div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>{result.risingTopics.map((t,i)=>(<button key={i} onClick={()=>askMarcus(`Tell me more about the trend: "${t}" and how I should create content about it`)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:'4px 12px', fontSize:11, color:T.text, cursor:'pointer', transition:'all 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.aiAccent;e.currentTarget.style.color=T.aiAccent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text;}}>{t} →</button>))}</div></div>)}<SectionTitle>🔍 What People Are Searching For</SectionTitle><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>{(result.trendingSearces||result.trendingSearches||[]).map((item,i)=>(<div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', transition:'border-color 0.15s', cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHover} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border} onClick={()=>askMarcus(`How should I write an article about "${item.contentAngle}" to capture the search query "${item.searchQuery}"?`)}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}><span style={{ fontSize:12, fontWeight:700, color:T.text, lineHeight:1.3 }}>"{item.searchQuery}"</span><Badge label={item.volume} colour={VOLUME_C[item.volume]}/></div><div style={{ fontSize:11, color:T.aiAccent, marginBottom:6, fontWeight:600 }}>✍️ {item.contentAngle}</div><div style={{ fontSize:11, color:T.textSub, lineHeight:1.4, marginBottom:8 }}>{item.reason}</div><div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}><div style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ fontSize:10, color:T.textMuted }}>Discover:</span><Badge label={item.googleDiscoverPotential} colour={IMPACT_C[item.googleDiscoverPotential]}/></div><span style={{ fontSize:10, color:T.aiAccent }}>Ask Marcus →</span></div></div>))}</div></>);
  };

  const renderRecommendations=()=>{ if(!result) return(<div><PromptStrip tab="recommendations"/><div style={{ textAlign:'center', padding:'28px 20px', color:T.textMuted }}><div style={{ fontSize:32, marginBottom:10 }}>💡</div><div style={{ fontSize:13, color:T.text, marginBottom:4 }}>Get content ideas for "{effectiveTopic('recommendations')}" based on real search demand</div><div style={{ fontSize:11 }}>AI cross-references live Google trends with your platform's content</div></div></div>);
    return(<><PromptStrip tab="recommendations"/><div style={{ background:T.aiSurface, border:`1px solid ${T.aiBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}><div style={{ flex:1 }}><div style={{ fontSize:11, color:T.aiAccent, fontWeight:700, marginBottom:4 }}>🎯 Strategy — {result.category}</div><p style={{ fontSize:12, color:T.text, lineHeight:1.6, margin:0 }}>{result.summary}</p></div><CopyButton text={result.summary} theme={T}/></div></div><SectionTitle>📝 What to Create Next</SectionTitle><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>{(result.recommendations||[]).map((r,i)=>(<div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', transition:'border-color 0.15s', cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHover} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border} onClick={()=>askMarcus(`Help me write an outline for: "${r.title}" — including the best structure, key points to cover, and how to optimize it for Google traffic.`)}><div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:6 }}><span style={{ fontSize:12, fontWeight:700, color:T.text, lineHeight:1.3 }}>{r.title}</span><Badge label={r.urgency} colour={IMPACT_C[r.urgency]}/></div><div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}><Badge label={r.type} colour={T.aiAccent}/>{r.searchDemand&&<Badge label={`demand: ${r.searchDemand}`} colour={VOLUME_C[r.searchDemand]}/>}</div><div style={{ fontSize:11, color:T.textSub, lineHeight:1.4, marginBottom:6 }}>{r.reason}</div><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><div style={{ fontSize:10, color:T.textMuted, fontStyle:'italic' }}>📈 {r.estimatedImpact}</div><span style={{ fontSize:10, color:T.aiAccent }}>Get outline →</span></div></div>))}</div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>{[['🕳 Content Gaps','contentGaps','#ef4444','○'],['⚡ Quick Wins','quickWins','#34d399','✓']].map(([title,key,col,icon])=>(<div key={key} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px' }}><SectionTitle>{title}</SectionTitle>{(result[key]||[]).map((g,i)=>(<div key={i} style={{ display:'flex', gap:8, marginBottom:7, cursor:'pointer', borderRadius:6, padding:'3px 4px', transition:'background 0.15s' }} onClick={()=>askMarcus(`Tell me more about this opportunity: "${g}"`)} onMouseEnter={e=>e.currentTarget.style.background=T.rowHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><span style={{ color:col, flexShrink:0 }}>{icon}</span><span style={{ fontSize:12, color:T.text, lineHeight:1.4 }}>{g}</span></div>))}</div>))}</div></>);
  };

  const renderNews=()=>{ if(!result) return(<div><PromptStrip tab="news"/><div style={{ textAlign:'center', padding:'28px 20px', color:T.textMuted }}><div style={{ fontSize:32, marginBottom:10 }}>📰</div><div style={{ fontSize:13, color:T.text, marginBottom:4 }}>Get live business news for "{effectiveTopic('news')}"</div><div style={{ fontSize:11 }}>Stay updated on what's happening so you know what to write about</div></div></div>);
    const sentC={ bullish:'#10b981', bearish:'#ef4444', neutral:'#94a3b8', mixed:'#f59e0b' }[result.marketSentiment]||'#94a3b8';
    return(<><PromptStrip tab="news"/><div style={{ background:T.aiSurface, border:`1px solid ${T.aiBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}><div style={{ flex:1 }}><div style={{ fontSize:11, color:T.aiAccent, fontWeight:700, marginBottom:4 }}>🌐 Market Pulse — {result.category}</div><p style={{ fontSize:12, color:T.text, lineHeight:1.6, margin:'0 0 6px' }}>{result.editorNote}</p><div style={{ fontSize:11, color:T.textMuted }}>Key theme: <strong style={{ color:T.text }}>{result.keyTheme}</strong></div></div><div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}><div style={{ textAlign:'center' }}><div style={{ fontSize:10, color:T.textMuted, marginBottom:4 }}>Sentiment</div><span style={{ fontSize:12, fontWeight:700, color:sentC, background:sentC+'18', padding:'4px 12px', borderRadius:20, textTransform:'uppercase', border:`1px solid ${sentC}44` }}>{result.marketSentiment}</span></div><CopyButton text={`${result.editorNote}\n\nKey theme: ${result.keyTheme}`} theme={T}/></div></div></div><SectionTitle>📰 Latest Headlines</SectionTitle><div style={{ display:'flex', flexDirection:'column', gap:10 }}>{(result.headlines||[]).map((h,i)=>(<div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', transition:'border-color 0.15s' }} onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHover} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:6 }}><span style={{ fontSize:13, fontWeight:700, color:T.text, lineHeight:1.3, flex:1 }}>{h.title}</span><div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}><Badge label={h.impact} colour={IMPACT_C[h.impact]}/><CopyButton text={`${h.title}\n\n${h.summary}\n\nContent idea: ${h.contentOpportunity}`} theme={T}/></div></div><div style={{ display:'flex', gap:8, marginBottom:8 }}><span style={{ fontSize:10, color:T.textMuted, background:T.surface, border:`1px solid ${T.border}`, padding:'1px 8px', borderRadius:20 }}>{h.source}</span><span style={{ fontSize:10, color:T.textMuted }}>{h.publishedAt}</span></div><p style={{ fontSize:12, color:T.textSub, lineHeight:1.5, margin:'0 0 8px' }}>{h.summary}</p><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:T.aiSurface, border:`1px solid ${T.aiBorder}`, borderRadius:8, cursor:'pointer' }} onClick={()=>askMarcus(`Help me write an article based on this news: "${h.title}". Give me a full outline, key angles, and how to optimize it for Google traffic.`)} onMouseEnter={e=>e.currentTarget.style.borderColor=T.aiAccent} onMouseLeave={e=>e.currentTarget.style.borderColor=T.aiBorder}><div><span style={{ fontSize:10, color:T.aiAccent, fontWeight:700 }}>✍️ Content idea: </span><span style={{ fontSize:11, color:T.text }}>{h.contentOpportunity}</span></div><span style={{ fontSize:10, color:T.aiAccent, flexShrink:0, marginLeft:8 }}>Write with Marcus →</span></div></div>))}</div></>);
  };

  const isChat=subTab==='chat';
  const tabInputMap={ trending:{ value:trendingInput, setter:setTrendingInput, placeholder:'e.g. "African fintech" or "AI tools for business"' }, recommendations:{ value:recommendInput, setter:setRecommendInput, placeholder:'e.g. "personal finance" or "startup growth"' }, news:{ value:newsInput, setter:setNewsInput, placeholder:'e.g. "electric vehicles" or "crypto regulation"' } };
  const currentInput=tabInputMap[subTab];
  const actionLabel=()=>{ const topic=effectiveTopic(subTab); if(loading) return `⏳ Searching for ${topic}…`; if(subTab==='trending') return `🔍 Find Trending Searches in ${topic}`; if(subTab==='recommendations') return `💡 Generate Ideas for ${topic}`; return `📰 Load ${topic} News`; };

  return(
    <div style={{ overflowY:isChat?'hidden':'auto', flex:1, paddingRight:4, paddingBottom:8, display:'flex', flexDirection:'column' }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'12px 14px', marginBottom:12, flexShrink:0 }}>
        <div style={{ display:'flex', gap:4, marginBottom:isChat?0:12, background:T.bg, borderRadius:8, padding:3, border:`1px solid ${T.border}` }}>
          {SUB_TABS.map(t=>(<button key={t.id} onClick={()=>setSubTab(t.id)} style={{ flex:1, background:subTab===t.id?T.tabActive:'transparent', border:'none', color:subTab===t.id?T.tabText:T.tabInactive, padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s', whiteSpace:'nowrap' }}>{t.label}</button>))}
        </div>
        {!isChat&&(<><div style={{ marginTop:10, marginBottom:8 }}><div style={{ fontSize:11, color:T.textMuted, marginBottom:5, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>🔎 Custom topic (optional)</div><div style={{ display:'flex', gap:6 }}><input value={currentInput?.value||''} onChange={e=>currentInput?.setter(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') fetchData(); }} placeholder={currentInput?.placeholder||'Type any topic…'} style={{ flex:1, padding:'8px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:12, outline:'none', boxSizing:'border-box' }}/>{currentInput?.value?.trim()&&(<button onClick={()=>currentInput.setter('')} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:8, color:T.textMuted, padding:'6px 10px', cursor:'pointer', fontSize:12 }}>✕</button>)}</div>{currentInput?.value?.trim()?<div style={{ fontSize:10, color:T.aiAccent, marginTop:4 }}>✦ Will search for: <strong>"{currentInput.value.trim()}"</strong></div>:<div style={{ fontSize:10, color:T.textMuted, marginTop:4 }}>Leave blank to use selected category below</div>}</div><div style={{ fontSize:11, color:T.textMuted, marginBottom:6, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Category</div><div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10, maxHeight:120, overflowY:'auto' }}>{categories.map(c=>(<button key={c} onClick={()=>setCategory(c)} style={{ padding:'4px 12px', borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s', background:category===c?T.aiAccent+'22':T.surface, border:`1px solid ${category===c?T.aiAccent:T.border}`, color:category===c?T.aiAccent:T.textMuted, opacity:currentInput?.value?.trim()?0.45:1 }}>{c}</button>))}</div><button onClick={fetchData} disabled={loading} style={{ width:'100%', padding:'9px', background:loading?T.surface:`linear-gradient(135deg,${T.aiAccent},${T.accent})`, border:`1px solid ${T.aiBorder}`, borderRadius:8, cursor:loading?'default':'pointer', color:loading?T.textMuted:'#fff', fontSize:12, fontWeight:700, transition:'all 0.2s', opacity:loading?0.7:1 }}>{actionLabel()}</button></>)}
      </div>
      {error&&!isChat&&(<div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'10px 14px', color:'#f87171', fontSize:12, marginBottom:12, flexShrink:0 }}>⚠️ {error}</div>)}
      {isChat?renderChat():subTab==='trending'?renderTrending():subTab==='recommendations'?renderRecommendations():renderNews()}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TEAM MANAGER
// ─────────────────────────────────────────────────────────────────────────────
const TeamManager = ({ theme:T }) => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const loadUsers=useCallback(async()=>{ setLoading(true); try { const { data, error }=await supabase.from('profiles').select('id,username,role,created_at').order('created_at',{ascending:false}); if(error) throw error; setUsers(data||[]); } catch(err){ console.error('TeamManager error',err); } finally{ setLoading(false); } },[]);
  useEffect(()=>{ loadUsers(); },[loadUsers]);
  const changeRole=async(userId,newRole)=>{ setSaving(userId); try { const { error }=await supabase.from('profiles').update({role:newRole}).eq('id',userId); if(error) throw error; setUsers(prev=>prev.map(u=>u.id===userId?{...u,role:newRole}:u)); } catch(err){ console.error(err); alert('Could not update role. Check RLS policies.'); } finally{ setSaving(null); } };
  if(loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:T.textMuted, fontSize:13 }}>Loading team…</div>;
  return(
    <div style={{ overflowY:'auto', flex:1, paddingRight:4, paddingBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}><div><div style={{ fontSize:13, fontWeight:700, color:T.text }}>Team & Role Management</div><div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>Change any user's access level directly from here</div></div><button onClick={loadUsers} style={{ background:'none', border:'none', color:T.textMuted, cursor:'pointer', fontSize:15 }}>↻</button></div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>{[['user','No dashboard'],['team','View dashboard'],['admin','Full access + manage roles']].map(([val,desc])=>(<div key={val} style={{ display:'flex', alignItems:'center', gap:6, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 10px' }}><div style={{ width:7, height:7, borderRadius:'50%', background:ROLE_COLOURS[val] }}/><span style={{ fontSize:11, color:T.text, fontWeight:600 }}>{ROLE_LABELS[val]}</span><span style={{ fontSize:10, color:T.textMuted }}>— {desc}</span></div>))}</div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 180px', gap:12, padding:'10px 16px', background:T.headerRow, borderBottom:`1px solid ${T.border}` }}>{['User','Role','Change Role'].map(h=>(<span key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:T.textMuted }}>{h}</span>))}</div>
        {users.length===0&&<div style={{ padding:'24px', textAlign:'center', color:T.textMuted, fontSize:12 }}>No users found</div>}
        {users.map((u,i)=>{ const letter=(u.username||'U')[0]?.toUpperCase(); const isSaving=saving===u.id; return(<div key={u.id} style={{ display:'grid', gridTemplateColumns:'1fr 110px 180px', gap:12, padding:'12px 16px', alignItems:'center', borderBottom:i<users.length-1?`1px solid ${T.border}`:'none', transition:'background 0.15s' }} onMouseEnter={e=>e.currentTarget.style.background=T.rowHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}><div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:`hsl(${letter?.charCodeAt(0)*37%360},50%,35%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>{letter}</div><div style={{ minWidth:0 }}><div style={{ fontSize:12, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>@{u.username||'unnamed'}</div><div style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>Joined {new Date(u.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</div></div></div><div style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:7, height:7, borderRadius:'50%', background:ROLE_COLOURS[u.role] }}/><span style={{ fontSize:12, color:ROLE_COLOURS[u.role], fontWeight:600 }}>{ROLE_LABELS[u.role]}</span></div><div style={{ display:'flex', gap:4 }}>{Object.values(ROLES).map(r=>(<button key={r} onClick={()=>changeRole(u.id,r)} disabled={u.role===r||isSaving} style={{ padding:'4px 10px', borderRadius:6, cursor:u.role===r?'default':'pointer', fontSize:10, fontWeight:600, transition:'all 0.15s', background:u.role===r?ROLE_COLOURS[r]+'22':T.surface, border:`1px solid ${u.role===r?ROLE_COLOURS[r]:T.border}`, color:u.role===r?ROLE_COLOURS[r]:T.textMuted, opacity:isSaving?0.5:1 }}>{isSaving&&u.role!==r?'…':ROLE_LABELS[r]}</button>))}</div></div>); })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE EDIT
// ─────────────────────────────────────────────────────────────────────────────
const ProfileEdit = ({ profile, onSaved, theme:T }) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState(profile?.username||'');
  const [loading, setLoading] = useState(false);
  const save=async()=>{ const newUsername=input.trim(); if(!newUsername){ alert('Username cannot be empty.'); return; } setLoading(true); try { const {data:authData}=await supabase.auth.getUser(); const user=authData?.user; if(!user){ alert('Not logged in.'); return; } const {data,error}=await supabase.from('profiles').upsert({id:user.id,username:newUsername},{onConflict:'id'}).select(); if(error){ if(error.code==='23505'){alert('Username already taken.');return;} alert('Could not update username.'); return; } const row=Array.isArray(data)?data[0]:data; setEditing(false); if(typeof onSaved==='function') onSaved(row?.username||newUsername); } catch(err){ console.error(err); alert('Could not update username.'); } finally{ setLoading(false); } };
  return !editing?(
    <div style={{ display:'flex', alignItems:'center', gap:12 }}><div style={{ flex:1 }}><div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Username</div><div style={{ fontSize:14, fontWeight:600, color:T.text }}>{profile?.username||'—'}</div></div><button onClick={()=>{ setEditing(true); setInput(profile?.username||''); }} style={{ background:T.accent+'18', border:`1px solid ${T.accent}44`, color:T.accent, padding:'6px 14px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 }}>Edit Username</button></div>
  ):(
    <div><div style={{ fontSize:11, color:T.textMuted, marginBottom:6 }}>New Username</div><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Enter username" style={{ width:'100%', padding:'8px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:10 }}/><div style={{ display:'flex', gap:8 }}><button onClick={save} disabled={loading} style={{ background:T.accentGrad, border:'none', color:'#fff', padding:'7px 18px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>{loading?'Saving…':'Save'}</button><button onClick={()=>setEditing(false)} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.textSub, padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:12 }}>Cancel</button></div></div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const UserProfile = ({ onClose, onUpdated }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab]   = useState('profile');
  const [theme, setTheme]     = useState(()=>{ try{ const s=localStorage.getItem('ogonjo_theme'); return s&&THEMES[s]?THEMES[s]:THEMES.green; }catch{ return THEMES.green; } });

  useEffect(()=>{
    let mounted=true;
    const load=async()=>{ setLoading(true); try { const {data:authData}=await supabase.auth.getUser(); const user=authData?.user; if(!user){ if(mounted)setLoading(false); return; } const {data,error}=await supabase.from('profiles').select('id,username,avatar_url,role,can_add_summary').eq('id',user.id).maybeSingle(); if(!mounted) return; if(error||!data){ const {data:upserted}=await supabase.from('profiles').upsert({id:user.id,username:'',role:'user'},{onConflict:'id'}).select(); const row=Array.isArray(upserted)?upserted[0]:upserted; if(mounted) setProfile(row||{id:user.id,username:'',role:'user'}); } else { if(mounted) setProfile(data); } } catch(err){ console.error('Profile load error',err); } finally{ if(mounted) setLoading(false); } };
    load(); return()=>{ mounted=false; };
  },[]);

  const handleSaved=(newUsername)=>{ setProfile(p=>({...p,username:newUsername})); if(typeof onUpdated==='function') onUpdated({username:newUsername}); };
  const role=profile?.role||'user';
  const avatarLetter=(profile?.username||'U')[0]?.toUpperCase()||'U';
  const showDash=canSeeDashboard(role), showTeam=canManageRoles(role), T=theme;

  if(loading) return(<div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1400 }}><div style={{ color:'#94a3b8', fontSize:13 }}>Loading…</div></div>);

  if(showDash){
    const tabs=[{id:'profile',label:'👤 Profile'},{id:'dashboard',label:'📊 Dashboard'},{id:'ai',label:'✨ AI Advisor'},...(showTeam?[{id:'team',label:'👥 Team'}]:[])];
    return(
      <div style={{ position:'fixed', inset:0, background:T.overlay, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1400, padding:'3%', boxSizing:'border-box' }} role="dialog" aria-modal="true">
        <div style={{ background:T.bg, backgroundImage:T.bgGradient, width:'100%', height:'100%', borderRadius:16, border:`1px solid ${T.border}`, boxShadow:T.shadow, padding:'20px 24px', position:'relative', display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
          <button onClick={onClose} style={{ position:'absolute', right:16, top:12, background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:T.closeColor, zIndex:10, lineHeight:1 }}>&times;</button>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18, paddingRight:36, flexShrink:0 }}>
            <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:`linear-gradient(135deg,${T.accent},${T.aiAccent})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#fff' }}>{avatarLetter}</div>
            <div><div style={{ fontSize:14, fontWeight:700, color:T.text }}>{profile?.username||'User'}</div><div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}><span style={{ background:ROLE_COLOURS[role]+'22', color:ROLE_COLOURS[role], padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase' }}>{ROLE_LABELS[role]}</span><span style={{ fontSize:11, color:T.textMuted }}>Ogonjo Platform</span></div></div>
            <div style={{ flex:1 }}/>
            <ThemeSwitcher theme={theme} setTheme={setTheme}/>
            <div style={{ display:'flex', gap:3, background:T.surface, borderRadius:8, padding:3, border:`1px solid ${T.border}` }}>{tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{ background:activeTab===t.id?T.tabActive:'transparent', border:'none', color:activeTab===t.id?T.tabText:T.tabInactive, padding:'5px 14px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', transition:'all 0.15s' }}>{t.label}</button>))}</div>
          </div>
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
            {activeTab==='profile'&&(<div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:18 }}><ProfileEdit profile={profile} onSaved={handleSaved} theme={T}/></div>)}
            {activeTab==='dashboard'&&<AnalyticsDashboard theme={T}/>}
            {activeTab==='ai'&&<AIAdvisor theme={T}/>}
            {activeTab==='team'&&showTeam&&<TeamManager theme={T}/>}
          </div>
        </div>
      </div>
    );
  }

  return(
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="User profile">
      <div className="modal-panel">
        <button className="modal-close" onClick={onClose} aria-label="Close profile">&times;</button>
        <div className="profile-modal-body">
          <div className="profile-modal-avatar"><span className="letter-avatar-large">{avatarLetter}</span></div>
          <div className="profile-modal-info"><h2 className="profile-modal-name">{profile?.username||'User'}</h2><ProfileEdit profile={profile} onSaved={handleSaved} theme={THEMES.white}/><div className="profile-modal-actions" style={{ marginTop:8 }}><button className="btn btn-outline" onClick={onClose}>Close</button></div></div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;