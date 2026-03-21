// src/components/PatternAnalysis/PatternAnalysis.jsx
// Pattern Intelligence Engine — sits inside the Dashboard tab
// Drop-in: import PatternAnalysis from '../PatternAnalysis/PatternAnalysis';
// Usage: <PatternAnalysis theme={T} />

import React, { useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PERIOD_PRESETS = [
  { id: '1h',    label: '1 Hour',   ms: 3600000,    desc: 'the last hour' },
  { id: 'today', label: 'Today',    ms: 86400000,   desc: 'today' },
  { id: '7d',    label: '7 Days',   ms: 604800000,  desc: 'the last 7 days' },
  { id: '30d',   label: '30 Days',  ms: 2592000000, desc: 'the last 30 days' },
  { id: '1y',    label: '1 Year',   ms: 31536000000,desc: 'the last year' },
  { id: 'custom',label: 'Custom',   ms: null,       desc: 'custom range' },
];

const ACCENT_MAP = {
  cyan:   '#06b6d4', purple: '#8b5cf6', orange: '#f97316',
  green:  '#10b981', pink:   '#ec4899', amber:  '#f59e0b',
};
const STRENGTH_COLOR = { strong:'#34d399', moderate:'#f59e0b', emerging:'#94a3b8' };
const URGENCY_COLOR  = { high:'#ef4444', medium:'#f97316', low:'#64748b' };
const IMPACT_COLOR   = { high:'#34d399', medium:'#f59e0b' };

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{ fontSize:9, fontWeight:800, color, background:color+'18', border:`1px solid ${color}44`, padding:'1px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>
    {label}
  </span>
);

const SectionLabel = ({ children, T }) => (
  <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:T.textMuted, marginBottom:10 }}>
    {children}
  </div>
);

const Card = ({ children, T, accent, style={} }) => (
  <div style={{
    background: accent ? `linear-gradient(135deg,${accent}12,${accent}04)` : T.surface,
    border: `1px solid ${accent ? accent+'33' : T.border}`,
    borderRadius:12, padding:'14px 16px',
    ...style,
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// RESULT SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

// Big narrative banner
const NarrativeBanner = ({ narrative, periodLabel, totalViews, T }) => (
  <div style={{ background:`linear-gradient(135deg,${T.accent}18,${T.aiAccent}08)`, border:`1px solid ${T.accent}44`, borderRadius:14, padding:'20px 24px', marginBottom:14 }}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:T.accent, marginBottom:8 }}>
          🧠 The Big Picture — {periodLabel}
        </div>
        <p style={{ fontSize:14, fontWeight:500, color:T.text, lineHeight:1.7, margin:0 }}>
          {narrative}
        </p>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:32, fontWeight:900, color:T.accent, letterSpacing:-1, lineHeight:1 }}>
          {totalViews?.toLocaleString()}
        </div>
        <div style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>views analysed</div>
      </div>
    </div>
  </div>
);

// Topic clusters
const ClustersSection = ({ clusters, T }) => (
  <div style={{ marginBottom:14 }}>
    <SectionLabel T={T}>📦 Topic Clusters</SectionLabel>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
      {(clusters||[]).map((c,i) => {
        const accent = ACCENT_MAP[c.color] || T.accent;
        return(
          <Card key={i} T={T} accent={accent}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:20 }}>{c.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.text, lineHeight:1.3 }}>{c.theme}</div>
                <Badge label={c.strength} color={STRENGTH_COLOR[c.strength]||'#94a3b8'}/>
              </div>
            </div>
            <p style={{ fontSize:11, color:T.textSub, lineHeight:1.5, margin:'0 0 10px' }}>{c.signal}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {(c.titles||[]).slice(0,3).map((t,j) => (
                <span key={j} style={{ fontSize:9, color:accent, background:accent+'14', border:`1px solid ${accent}33`, padding:'1px 7px', borderRadius:20, whiteSpace:'nowrap', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis' }}>
                  {t}
                </span>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  </div>
);

// Reader archetypes
const ArchetypesSection = ({ archetypes, T }) => (
  <div style={{ marginBottom:14 }}>
    <SectionLabel T={T}>👥 Reader Archetypes</SectionLabel>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10 }}>
      {(archetypes||[]).map((a,i) => {
        const COLORS = ['#06b6d4','#8b5cf6','#f97316','#10b981'];
        const ac = COLORS[i%COLORS.length];
        return(
          <Card key={i} T={T} accent={ac}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg,${ac}44,${ac}22)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                {a.emoji}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{a.name}</div>
                <div style={{ fontSize:10, color:ac, fontWeight:700 }}>{a.percentOfAudience}% of audience</div>
              </div>
            </div>
            <p style={{ fontSize:11, color:T.textSub, lineHeight:1.5, margin:'0 0 8px' }}>{a.description}</p>
            <div style={{ fontSize:11, color:T.text, background:ac+'12', border:`1px solid ${ac}33`, borderRadius:8, padding:'7px 10px' }}>
              <span style={{ fontSize:9, fontWeight:800, color:ac, textTransform:'uppercase', letterSpacing:0.5 }}>Wants: </span>
              {a.whatTheyWant}
            </div>
          </Card>
        );
      })}
    </div>
  </div>
);

// Content gaps
const GapsSection = ({ gaps, T }) => (
  <div style={{ marginBottom:14 }}>
    <SectionLabel T={T}>🕳 Content Gaps</SectionLabel>
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {(gaps||[]).map((g,i) => (
        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px' }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{g.emoji}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{g.topic}</span>
              <Badge label={g.urgency} color={URGENCY_COLOR[g.urgency]}/>
            </div>
            <p style={{ fontSize:11, color:T.textSub, lineHeight:1.5, margin:'0 0 4px' }}>{g.whyItsMissing}</p>
            <p style={{ fontSize:11, color:T.accent, margin:0, fontWeight:600 }}>→ {g.opportunity}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Time patterns
const TimePatternsSection = ({ timePatterns, T }) => (
  <div style={{ marginBottom:14 }}>
    <SectionLabel T={T}>⏱ Time Patterns</SectionLabel>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
      {(timePatterns||[]).map((tp,i) => (
        <Card key={i} T={T} accent={T.accent}>
          <div style={{ display:'flex', align:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:18 }}>{tp.emoji}</span>
            <div style={{ fontSize:11, fontWeight:700, color:T.accent }}>{tp.timeContext}</div>
          </div>
          <p style={{ fontSize:11, color:T.text, fontWeight:600, lineHeight:1.5, margin:'0 0 6px' }}>{tp.insight}</p>
          <p style={{ fontSize:11, color:T.textSub, lineHeight:1.5, margin:0 }}>{tp.implication}</p>
        </Card>
      ))}
    </div>
  </div>
);

// Momentum
const MomentumSection = ({ momentum, T }) => (
  <div style={{ marginBottom:14 }}>
    <SectionLabel T={T}>📈 Momentum Signals</SectionLabel>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
      {/* Rising */}
      <Card T={T} accent="#34d399">
        <div style={{ fontSize:10, fontWeight:800, color:'#34d399', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>▲ Rising</div>
        {(momentum?.rising||[]).map((r,i) => (
          <div key={i} style={{ display:'flex', gap:6, marginBottom:8, padding:'6px 8px', background:'rgba(52,211,153,0.06)', borderRadius:8 }}>
            <span style={{ fontSize:14 }}>{r.emoji}</span>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#34d399' }}>{r.topic}</div>
              <div style={{ fontSize:10, color:'#6ee7b7', lineHeight:1.4 }}>{r.signal}</div>
            </div>
          </div>
        ))}
      </Card>
      {/* Declining */}
      <Card T={T} accent="#f87171">
        <div style={{ fontSize:10, fontWeight:800, color:'#f87171', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>▼ Cooling</div>
        {(momentum?.declining||[]).map((r,i) => (
          <div key={i} style={{ display:'flex', gap:6, marginBottom:8, padding:'6px 8px', background:'rgba(248,113,113,0.06)', borderRadius:8 }}>
            <span style={{ fontSize:14 }}>{r.emoji}</span>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#f87171' }}>{r.topic}</div>
              <div style={{ fontSize:10, color:'#fca5a5', lineHeight:1.4 }}>{r.signal}</div>
            </div>
          </div>
        ))}
      </Card>
      {/* Stable */}
      <Card T={T} accent={T.textMuted}>
        <div style={{ fontSize:10, fontWeight:800, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>● Stable</div>
        {(momentum?.stable||[]).map((r,i) => (
          <div key={i} style={{ marginBottom:8, padding:'6px 8px', background:T.headerRow, borderRadius:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.text }}>{r.topic}</div>
            <div style={{ fontSize:10, color:T.textMuted, lineHeight:1.4 }}>{r.signal}</div>
          </div>
        ))}
      </Card>
    </div>
  </div>
);

// 5 content outlines
const OutlinesSection = ({ outlines, T }) => (
  <div style={{ marginBottom:14 }}>
    <SectionLabel T={T}>✍️ 5 Content Outlines</SectionLabel>
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {(outlines||[]).map((o,i) => (
        <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ display:'flex', align:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:800, color:T.textMuted }}>#{i+1}</span>
                <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{o.title}</span>
              </div>
              <p style={{ fontSize:11, color:T.textSub, lineHeight:1.5, margin:0 }}>{o.angle}</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
              <Badge label={`${o.estimatedImpact} impact`} color={IMPACT_COLOR[o.estimatedImpact]||'#94a3b8'}/>
              <span style={{ fontSize:9, color:T.textMuted }}>for {o.targetArchetype}</span>
            </div>
          </div>
          {/* Why now */}
          <div style={{ fontSize:11, color:T.accent, fontWeight:600, marginBottom:10, padding:'6px 10px', background:T.accent+'12', borderRadius:7, border:`1px solid ${T.accent}33` }}>
            💡 {o.whyNow}
          </div>
          {/* Structure */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(o.structure||[]).map((s,j) => (
              <div key={j} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:9, fontWeight:800, color:T.textMuted, flexShrink:0 }}>{'0'+(j+1)}</span>
                <span style={{ fontSize:11, color:T.text }}>{s}</span>
                {j < (o.structure||[]).length-1 && <span style={{ color:T.border, fontSize:10 }}>›</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Schedule
const ScheduleSection = ({ schedule, T }) => (
  <div>
    <SectionLabel T={T}>📅 Publishing Schedule</SectionLabel>
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {(schedule||[]).map((s,i) => (
        <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 14px', minWidth:160, flex:'1 1 160px' }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.accent, textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>{s.slot}</div>
          <div style={{ fontSize:11, fontWeight:700, color:T.text, marginBottom:4, lineHeight:1.3 }}>{s.title}</div>
          <div style={{ fontSize:10, color:T.textMuted, lineHeight:1.4 }}>{s.reason}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const PatternAnalysis = ({ theme: T }) => {
  const [selectedPreset, setSelectedPreset] = useState('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [result,  setResult]        = useState(null);
  const [error,   setError]         = useState(null);
  const [cached,  setCached]        = useState(null); // last result for label
  const resultRef = useRef(null);

  // ── Fetch data from Supabase then call the analysis API ──────────────────
  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Determine time range
      let since, until;
      if (selectedPreset === 'custom') {
        if (!customFrom) throw new Error('Please select a start date.');
        since = new Date(customFrom).toISOString();
        until = customTo ? new Date(customTo + 'T23:59:59').toISOString() : new Date().toISOString();
      } else {
        const preset = PERIOD_PRESETS.find(p => p.id === selectedPreset);
        since = new Date(Date.now() - preset.ms).toISOString();
        until = new Date().toISOString();
      }

      // 2. Fetch viewed content in range — join to get title + category
      const { data: viewRows } = await supabase
        .from('views')
        .select('post_id, created_at, book_summaries(title, category)')
        .gte('created_at', since)
        .lte('created_at', until)
        .not('post_id', 'is', null)
        .order('created_at', { ascending: true })
        .limit(500);

      if (!viewRows?.length) throw new Error('No views found for this period. Try a wider time range.');

      // 3. Aggregate: group by post_id, count views, collect hours
      const postMap = {};
      viewRows.forEach(r => {
        const pid = r.post_id;
        const h   = new Date(r.created_at).getHours();
        if (!postMap[pid]) {
          postMap[pid] = {
            title:    r.book_summaries?.title    || 'Untitled',
            category: r.book_summaries?.category || 'General',
            views: 0,
            hours: [],
          };
        }
        postMap[pid].views++;
        if (!postMap[pid].hours.includes(h)) postMap[pid].hours.push(h);
      });

      const viewedContent = Object.values(postMap)
        .sort((a, b) => b.views - a.views)
        .slice(0, 80);

      const totalViews = viewRows.length;

      // 4. Fetch all titles in library (for gap detection)
      const { data: allContent } = await supabase
        .from('book_summaries')
        .select('title, category, views_count')
        .order('views_count', { ascending: false })
        .limit(200);

      const allTitles     = (allContent || []).map(c => c.title);
      const catMap        = {};
      (allContent || []).forEach(c => { const cat = c.category||'General'; catMap[cat]=(catMap[cat]||0)+1; });
      const topCategories = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count}));

      // 5. Build period label
      const preset = PERIOD_PRESETS.find(p => p.id === selectedPreset);
      let periodLabel;
      if (selectedPreset === 'custom') {
        const f = customFrom ? new Date(customFrom).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
        const t = customTo   ? new Date(customTo).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Now';
        periodLabel = `${f} – ${t}`;
      } else {
        periodLabel = preset.desc.charAt(0).toUpperCase() + preset.desc.slice(1);
      }

      // 6. Call via existing ai-advisor function (mode: 'pattern')
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pattern', viewedContent, allTitles, periodLabel, totalViews, topCategories }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed.');

      setResult(data);
      setCached({ label: periodLabel, views: totalViews, at: new Date() });

      // Scroll to results
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [selectedPreset, customFrom, customTo]);

  // ── Input styles ──────────────────────────────────────────────────────────
  const inputStyle = {
    background: T.inputBg, border: `1px solid ${T.inputBorder}`,
    borderRadius: 8, color: T.text, fontSize: 12, padding: '7px 12px',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ marginBottom: 16 }}>

      {/* ── Control panel ─────────────────────────────────────────────────── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>🧠 Pattern Intelligence</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              Detect topic clusters, reader archetypes, content gaps, time patterns & momentum
            </div>
          </div>
          {cached && (
            <div style={{ textAlign: 'right', fontSize: 10, color: T.textMuted }}>
              Last run: {cached.label} · {cached.views.toLocaleString()} views<br/>
              {cached.at.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
            </div>
          )}
        </div>

        {/* Period presets */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {PERIOD_PRESETS.map(p => (
            <button key={p.id} onClick={() => setSelectedPreset(p.id)} style={{
              background: selectedPreset === p.id ? T.accent+'33' : T.surface,
              border: `1px solid ${selectedPreset === p.id ? T.accent+'88' : T.border}`,
              color: selectedPreset === p.id ? T.accent : T.textMuted,
              padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Custom date range */}
        {selectedPreset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 12px', background: T.headerRow, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>From</span>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ ...inputStyle, flex: 1 }}/>
            <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>To</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ ...inputStyle, flex: 1 }}/>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, padding: '9px 14px', color: '#f87171', fontSize: 12, marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Run button */}
        <button onClick={runAnalysis} disabled={loading} style={{
          width: '100%', padding: '10px',
          background: loading ? T.surface : `linear-gradient(135deg,${T.accent},${T.aiAccent})`,
          border: `1px solid ${loading ? T.border : T.accent}`,
          borderRadius: 9, cursor: loading ? 'default' : 'pointer',
          color: loading ? T.textMuted : '#fff',
          fontSize: 13, fontWeight: 800, transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display:'inline-block' }}>◌</span>
              Analysing patterns… this takes ~20s
            </>
          ) : (
            '▶ Run Pattern Analysis'
          )}
        </button>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {result && (
        <div ref={resultRef}>
          <NarrativeBanner narrative={result.narrative} periodLabel={result.periodLabel} totalViews={result.totalViews} T={T}/>
          <ClustersSection    clusters={result.clusters}         T={T}/>
          <ArchetypesSection  archetypes={result.archetypes}     T={T}/>
          <GapsSection        gaps={result.gaps}                 T={T}/>
          <TimePatternsSection timePatterns={result.timePatterns} T={T}/>
          <MomentumSection    momentum={result.momentum}         T={T}/>
          <OutlinesSection    outlines={result.outlines}         T={T}/>
          <ScheduleSection    schedule={result.schedule}         T={T}/>
        </div>
      )}
    </div>
  );
};

export default PatternAnalysis;