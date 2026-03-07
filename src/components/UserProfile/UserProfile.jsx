// src/components/UserProfile/UserProfile.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// THEMES
// ─────────────────────────────────────────────────────────────────────────────
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
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const ROLES = { USER:'user', TEAM:'team', ADMIN:'admin' };
const ROLE_LABELS  = { user:'User', team:'Team', admin:'Admin' };
const ROLE_COLOURS = { user:'#64748b', team:'#06b6d4', admin:'#8b5cf6' };
const canSeeDashboard = (r) => r===ROLES.ADMIN || r===ROLES.TEAM;
const canManageRoles  = (r) => r===ROLES.ADMIN;

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS   = ['Today','Week','Month','Year'];
const periodMs  = { Today:864e5, Week:6048e5, Month:2592e6, Year:3154e7 };
const periodTrunc={ Today:'hour', Week:'day', Month:'day', Year:'month' };

// ─────────────────────────────────────────────────────────────────────────────
// CHART / METRIC CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const METRICS = [
  { id:'views',    label:'Views',     icon:'👁',  color:'#06b6d4' },
  { id:'likes',    label:'Likes',     icon:'❤️',  color:'#f97316' },
  { id:'ratings',  label:'Ratings',   icon:'⭐',  color:'#10b981' },
  { id:'newUsers', label:'New Users', icon:'👤',  color:'#f59e0b' },
];
const CAT_COLOURS=['#06b6d4','#f97316','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => n>=1000?(n/1000).toFixed(1)+'k':String(n??0);
const pct = (a,b) => b?+((a-b)/b*100).toFixed(1):0;
const ago = (iso) => {
  const m=Math.round((Date.now()-new Date(iso))/60000);
  return m<60?`${m}m ago`:m<1440?`${Math.round(m/60)}h ago`:`${Math.round(m/1440)}d ago`;
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const ThemeSwitcher = ({ theme, setTheme }) => (
  <div style={{ display:'flex', gap:4 }}>
    {Object.values(THEMES).map(t=>(
      <button key={t.id} onClick={()=>setTheme(t)} style={{
        padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600,
        background:theme.id===t.id?theme.accent+'22':theme.themeBtnBg,
        border:`1px solid ${theme.id===t.id?theme.accent:theme.themeBtnBorder}`,
        color:theme.id===t.id?theme.accent:theme.textMuted, transition:'all 0.15s',
      }}>{t.label}</button>
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
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
    padding:'14px 16px', position:'relative', overflow:'hidden', flex:'1 1 0', minWidth:80 }}>
    <div style={{ position:'absolute', top:0, right:0, width:50, height:50,
      background:`radial-gradient(circle at 100% 0%,${accent}30,transparent 70%)` }}/>
    <div style={{ fontSize:16, marginBottom:5 }}>{icon}</div>
    <div style={{ fontSize:20, fontWeight:700, color:T.text, letterSpacing:-0.5 }}>{fmt(value)}</div>
    <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>{label}</div>
    {delta!==undefined&&(
      <div style={{ fontSize:10, marginTop:6, color:delta>=0?'#34d399':'#f87171', fontWeight:600 }}>
        {delta>=0?'▲':'▼'} {Math.abs(delta)}%
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsDashboard = ({ theme:T }) => {
  const [period, setPeriod]       = useState('Week');
  const [activeMetric, setMetric] = useState('views');
  const [stats, setStats]         = useState({ views:0, likes:0, ratings:0, newUsers:0 });
  const [prev, setPrev]           = useState({ views:0, likes:0, ratings:0, newUsers:0 });
  const [chartData, setChart]     = useState([]);
  const [topContent, setTop]      = useState([]);
  const [catData, setCat]         = useState([]);
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now    = Date.now();
      const curMs  = periodMs[period];
      const sinceA = new Date(now - curMs).toISOString();
      const sinceB = new Date(now - curMs*2).toISOString();
      const trunc  = periodTrunc[period];

      // ── Counts current + previous ─────────────────────────────────────────
      const [vA,lA,rA,uA, vB,lB,rB,uB] = await Promise.all([
        supabase.from('views').select('id',{count:'exact',head:true}).gte('created_at',sinceA),
        supabase.from('likes').select('id',{count:'exact',head:true}).gte('created_at',sinceA),
        supabase.from('ratings').select('id',{count:'exact',head:true}).gte('created_at',sinceA),
        supabase.from('profiles').select('id',{count:'exact',head:true}).gte('created_at',sinceA),
        supabase.from('views').select('id',{count:'exact',head:true}).gte('created_at',sinceB).lt('created_at',sinceA),
        supabase.from('likes').select('id',{count:'exact',head:true}).gte('created_at',sinceB).lt('created_at',sinceA),
        supabase.from('ratings').select('id',{count:'exact',head:true}).gte('created_at',sinceB).lt('created_at',sinceA),
        supabase.from('profiles').select('id',{count:'exact',head:true}).gte('created_at',sinceB).lt('created_at',sinceA),
      ]);
      setStats({ views:vA.count??0, likes:lA.count??0, ratings:rA.count??0, newUsers:uA.count??0 });
      setPrev ({ views:vB.count??0, likes:lB.count??0, ratings:rB.count??0, newUsers:uB.count??0 });

      // ── Time-series for active metric ──────────────────────────────────────
      const bucketKey = (iso) => {
        const d=new Date(iso);
        if(trunc==='hour')  return `${String(d.getHours()).padStart(2,'0')}:00`;
        if(trunc==='month') return d.toLocaleDateString('en-US',{month:'short'});
        return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      };

      // Fetch time-series for views + likes + ratings in period
      const [{data:rv},{data:rl},{data:rr}] = await Promise.all([
        supabase.from('views').select('created_at').gte('created_at',sinceA),
        supabase.from('likes').select('created_at').gte('created_at',sinceA),
        supabase.from('ratings').select('created_at').gte('created_at',sinceA),
      ]);
      const bkt = { views:{}, likes:{}, ratings:{} };
      (rv||[]).forEach(r=>{ const k=bucketKey(r.created_at); bkt.views[k]=(bkt.views[k]||0)+1; });
      (rl||[]).forEach(r=>{ const k=bucketKey(r.created_at); bkt.likes[k]=(bkt.likes[k]||0)+1; });
      (rr||[]).forEach(r=>{ const k=bucketKey(r.created_at); bkt.ratings[k]=(bkt.ratings[k]||0)+1; });
      const allKeys=[...new Set([...Object.keys(bkt.views),...Object.keys(bkt.likes),...Object.keys(bkt.ratings)])].sort();
      setChart(allKeys.map(k=>({ date:k, views:bkt.views[k]||0, likes:bkt.likes[k]||0, ratings:bkt.ratings[k]||0 })));

      // ── Top content for THIS period (by views in period) ──────────────────
      // Get content IDs viewed in this period, count them, join with content details
      const { data:periodViews } = await supabase
        .from('views')
        .select('post_id')
        .gte('created_at', sinceA)
        .not('post_id','is',null);

      if(periodViews && periodViews.length > 0) {
        // Count views per post in this period
        const viewCounts = {};
        (periodViews||[]).forEach(r=>{ viewCounts[r.post_id]=(viewCounts[r.post_id]||0)+1; });
        const topIds = Object.entries(viewCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id])=>id);

        const { data:contentDetails } = await supabase
          .from('book_summaries')
          .select('id,title,category,views_count,likes_count,avg_rating')
          .in('id', topIds);

        // Sort by period view count and attach it
        const enriched = (contentDetails||[]).map(c=>({
          ...c,
          period_views: viewCounts[c.id]||0,
        })).sort((a,b)=>b.period_views-a.period_views);

        setTop(enriched);
      } else {
        setTop([]);
      }

      // ── Category breakdown (all-time) ─────────────────────────────────────
      const { data:cats } = await supabase
        .from('book_summaries').select('category,views_count').not('category','is',null);
      const catMap={};
      (cats||[]).forEach(r=>{ const c=r.category||'Other'; catMap[c]=(catMap[c]||0)+(r.views_count||0); });
      const total=Object.values(catMap).reduce((s,v)=>s+v,0)||1;
      setCat(Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,7)
        .map(([name,value],i)=>({ name, value:Math.round(value/total*100), color:CAT_COLOURS[i] })));

      // ── Recent comments in this period ────────────────────────────────────
      const { data:comms } = await supabase
        .from('comments')
        .select('id,content,created_at,profiles(username),book_summaries(title)')
        .gte('created_at', sinceA)
        .order('created_at',{ascending:false})
        .limit(5);
      setComments(comms||[]);

    } catch(err){ console.error('Dashboard error',err); }
    finally{ setLoading(false); }
  },[period]);

  useEffect(()=>{ load(); },[load]);

  const activeMetricObj = METRICS.find(m=>m.id===activeMetric)||METRICS[0];

  if(loading) return(
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:260, color:T.textMuted, fontSize:13 }}>
      Loading analytics…
    </div>
  );

  return(
    <div style={{ overflowY:'auto', flex:1, paddingRight:4, paddingBottom:8 }}>

      {/* Period + refresh */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:11, color:T.textMuted }}>
          {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={load} title="Refresh" style={{ background:'none', border:'none', color:T.textMuted, cursor:'pointer', fontSize:15 }}>↻</button>
          <div style={{ display:'flex', gap:3, background:T.surface, borderRadius:8, padding:3, border:`1px solid ${T.border}` }}>
            {PERIODS.map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} style={{
                background:period===p?T.tabActive:'transparent', border:'none',
                color:period===p?T.tabText:T.tabInactive,
                padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s',
              }}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {METRICS.map(m=>(
          <StatCard key={m.id} label={m.label} icon={m.icon}
            value={stats[m.id]??0} delta={pct(stats[m.id]??0, prev[m.id]??0)}
            accent={m.color} theme={T}/>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub }}>
            {activeMetricObj.label} — {period}
          </span>
          <div style={{ display:'flex', gap:5 }}>
            {METRICS.filter(m=>m.id!=='newUsers').map(m=>(
              <button key={m.id} onClick={()=>setMetric(m.id)} style={{
                background:activeMetric===m.id?m.color+'22':'transparent',
                border:`1px solid ${activeMetric===m.id?m.color:T.border}`,
                color:activeMetric===m.id?m.color:T.textMuted,
                padding:'3px 10px', borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:600,
                textTransform:'capitalize', transition:'all 0.15s',
              }}>{m.icon} {m.label}</button>
            ))}
          </div>
        </div>
        {chartData.length===0
          ?<div style={{ textAlign:'center', color:T.textMuted, fontSize:12, padding:'28px 0' }}>No activity in this period</div>
          :<ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={activeMetricObj.color} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={activeMetricObj.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="date" tick={{ fill:T.textMuted, fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:T.textMuted, fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<DashTooltip theme={T}/>}/>
              <Area type="monotone" dataKey={activeMetric} stroke={activeMetricObj.color}
                strokeWidth={2} fill="url(#dg)" dot={false} activeDot={{ r:4, strokeWidth:0 }}/>
            </AreaChart>
          </ResponsiveContainer>
        }
      </div>

      {/* Top content (period-filtered) + category */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 200px', gap:10, marginBottom:12 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub, marginBottom:10 }}>
            Top Content — {period}
          </div>
          {topContent.length===0
            ?<div style={{ color:T.textMuted, fontSize:12, padding:'16px 0', textAlign:'center' }}>
               No views recorded {period==='Today'?'today':period==='Week'?'this week':period==='Month'?'this month':'this year'} yet
             </div>
            :topContent.map((c,i)=>(
              <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'7px 0', borderBottom:i<topContent.length-1?`1px solid ${T.border}`:'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  <span style={{ fontSize:10, color:T.textMuted, fontWeight:700, width:14, flexShrink:0 }}>#{i+1}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:210 }}>{c.title}</div>
                    <div style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>{c.category||'Uncategorized'}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, flexShrink:0, fontSize:11 }}>
                  <span style={{ color:'#06b6d4', fontWeight:600 }} title="Views this period">{fmt(c.period_views)} {period==='Today'?'today':''}</span>
                  <span style={{ color:'#f97316' }}>{fmt(c.likes_count)}</span>
                  <span style={{ color:'#f59e0b' }}>★{c.avg_rating??'—'}</span>
                </div>
              </div>
            ))
          }
        </div>

        {/* Category pie */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 12px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub, marginBottom:10 }}>Categories</div>
          {catData.length===0?<div style={{ color:T.textMuted, fontSize:12 }}>No data</div>:<>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={26} outerRadius={44} dataKey="value" paddingAngle={3} stroke="none">
                  {catData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip formatter={v=>`${v}%`} contentStyle={{ background:T.tooltipBg, border:`1px solid ${T.border}`, borderRadius:8, fontSize:11 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop:6 }}>
              {catData.map(c=>(
                <div key={c.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                    <span style={{ fontSize:10, color:T.textSub, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:90 }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize:10, fontWeight:600, color:T.text }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>

      {/* Comments (period-filtered) */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub, marginBottom:10 }}>
          Recent Comments — {period}
        </div>
        {comments.length===0
          ?<div style={{ color:T.textMuted, fontSize:12, textAlign:'center', padding:'16px 0' }}>
             No comments {period==='Today'?'today':period==='Week'?'this week':period==='Month'?'this month':'this year'}
           </div>
          :comments.map((c,i)=>{
            const user=c.profiles?.username||'Anonymous';
            const post=c.book_summaries?.title||'Unknown';
            const letter=user[0]?.toUpperCase()||'A';
            return(
              <div key={c.id} style={{ display:'flex', gap:10, padding:'8px 0',
                borderBottom:i<comments.length-1?`1px solid ${T.border}`:'none' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                  background:`hsl(${letter.charCodeAt(0)*37%360},50%,38%)`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>{letter}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:T.text }}>@{user}</span>
                    <span style={{ fontSize:10, color:T.textMuted }}>{ago(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize:11, color:T.textSub, lineHeight:1.4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.content}</div>
                  <span style={{ fontSize:10, color:T.textMuted, background:T.surface, border:`1px solid ${T.border}`, padding:'1px 6px', borderRadius:4, marginTop:3, display:'inline-block' }}>on: {post}</span>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AI ADVISOR — Trending / Recommendations / News / Chat
// ─────────────────────────────────────────────────────────────────────────────
const AIAdvisor = ({ theme:T }) => {
  const [subTab, setSubTab]         = useState('chat');
  const [category, setCategory]     = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [platformData, setPlatform] = useState(null);

  // Chat state
  const [messages, setMessages]     = useState([
    { role:'assistant', content:"Hey — I'm Marcus, your business consultant for Ogonjo.\n\nI'm here to help you grow this platform into a real revenue machine. I can tell you what's trending right now on Google, what content to create this week, how to monetize your traffic better, and any business strategy question you have.\n\nI search the web in real-time, so my answers are based on what's actually happening today — not outdated data.\n\nWhat do you want to work on?" }
  ]);
  const [chatInput, setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef               = useRef(null);

  const SUB_TABS = [
    { id:'chat',           label:'💬 Ask Marcus'       },
    { id:'trending',       label:'🔍 Trending'         },
    { id:'recommendations',label:'💡 Content Ideas'    },
    { id:'news',           label:'📰 Business News'    },
  ];

  // Dynamic suggested prompts — fetched fresh on every load
  const [suggestedPrompts, setSuggestedPrompts] = useState({
    chat: [
      "What business topics are trending on Google right now?",
      "How can I monetize Ogonjo\'s traffic better?",
      "What content should I create this week to grow traffic?",
      "Which African business trends should I be covering?",
      "How do I get my content into Google Discover?",
    ],
    trending: [
      "What niche has the highest search demand right now?",
      "What are entrepreneurs searching for most this week?",
      "Which business concepts are going viral right now?",
    ],
    recommendations: [
      "What content gaps am I missing right now?",
      "What\'s the highest traffic opportunity this month?",
      "What type of content gets the most Google Discover clicks?",
    ],
    news: [
      "What business news should I turn into content today?",
      "What\'s the biggest economic story affecting entrepreneurs?",
      "What market trend should I write about this week?",
    ],
  });
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const IMPACT_C = { high:'#ef4444', hot:'#ef4444', medium:'#f97316', low:'#f59e0b', rising:'#10b981' };
  const VOLUME_C = { high:'#06b6d4', medium:'#f97316', rising:'#10b981' };

  // Load categories + platform snapshot
  useEffect(()=>{
    let mounted=true;
    const load=async()=>{
      try {
        const { data:catData } = await supabase.from('book_summaries').select('category',{distinct:true}).not('category','is',null);
        const unique=[...new Set((catData||[]).map(d=>d.category).filter(Boolean))].sort();
        if(mounted && unique.length>0){ setCategories(unique); setCategory(unique[0]); }

        const [{data:top},{data:cats},{count}] = await Promise.all([
          supabase.from('book_summaries').select('title,category,views_count,avg_rating').order('views_count',{ascending:false}).limit(8),
          supabase.from('book_summaries').select('category').not('category','is',null),
          supabase.from('book_summaries').select('id',{count:'exact',head:true}),
        ]);
        const catMap={};
        (cats||[]).forEach(r=>{ const c=r.category||'Other'; catMap[c]=(catMap[c]||0)+1; });
        const topCats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>({name,count}));
        if(mounted) setPlatform({ topContent:top||[], topCategories:topCats, totalContent:count||0 });

        // Suggestions are refreshed manually to preserve quota
        if(mounted) setSuggestionsLoading(false);

      } catch(err){ console.error('AIAdvisor init',err); }
    };
    load();
    return()=>{ mounted=false; };
  },[]);

  useEffect(()=>{ setResult(null); setError(null); },[subTab,category]);
  useEffect(()=>{ chatBottomRef.current?.scrollIntoView({ behavior:'smooth' }); },[messages]);

  // ── Chat send ──────────────────────────────────────────────────────────────
  const sendChat = async (overrideText) => {
    const text = (overrideText || chatInput).trim();
    if(!text || chatLoading) return;

    const userMsg = { role:'user', content:text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai-advisor', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          mode:'chat',
          message: text,
          history: newMessages.slice(-12),
          platformData,
          categories,
        }),
      });
      const data = await res.json();
      if(!res.ok || data.error) throw new Error(data.error||'Request failed');
      setMessages(prev=>[...prev, { role:'assistant', content:data.reply }]);
    } catch(err){
      setMessages(prev=>[...prev, { role:'assistant', content:`Sorry, I ran into an error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Fetch non-chat tabs ────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch('/api/ai-advisor', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          mode:subTab, category,
          ...(subTab==='recommendations'&&platformData?{platformData}:{}),
        }),
      });
      const data = await res.json();
      if(!res.ok||data.error) throw new Error(data.error||'Request failed');
      setResult(data);
    } catch(err){ setError(err.message||'Could not load data.'); }
    finally{ setLoading(false); }
  };

  // ── Ask Marcus from any tab ────────────────────────────────────────────────
  const askMarcus = (question) => {
    setSubTab('chat');
    setTimeout(() => sendChat(question), 100);
  };

  // ── Badge ──────────────────────────────────────────────────────────────────
  const Badge = ({ label, colour }) => (
    <span style={{ fontSize:10, fontWeight:700, color:colour||T.aiAccent,
      background:(colour||T.aiAccent)+'18', padding:'2px 8px', borderRadius:20,
      textTransform:'uppercase', whiteSpace:'nowrap', flexShrink:0 }}>{label}</span>
  );

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:T.textSub, marginBottom:10 }}>{children}</div>
  );

  // ── Refresh suggestions manually ──────────────────────────────────────────
  const refreshSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/ai-advisor', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ mode:'suggestions', category:'business' }),
      });
      if(res.ok) {
        const data = await res.json();
        if(!data.error && data.chat) setSuggestedPrompts(data);
      }
    } catch(e){ console.log('Suggestions refresh failed'); }
    finally{ setSuggestionsLoading(false); }
  };

  // ── Prompt suggestions strip ───────────────────────────────────────────────
  const PromptStrip = ({ tab }) => {
    const prompts = suggestedPrompts[tab] || [];
    const isChat = tab === 'chat';
    return (
      <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>
            {isChat ? '💡 Suggested questions' : '💬 Ask Marcus'}
          </div>
          <button onClick={refreshSuggestions} disabled={suggestionsLoading} title="Refresh suggestions based on today's trends"
            style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:10, padding:'1px 7px', fontSize:9, color:T.textMuted, cursor:suggestionsLoading?'default':'pointer', transition:'all 0.15s' }}
            onMouseEnter={e=>{ if(!suggestionsLoading){ e.currentTarget.style.borderColor=T.aiAccent; e.currentTarget.style.color=T.aiAccent; }}}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textMuted; }}
          >{suggestionsLoading ? 'updating…' : '↻ refresh'}</button>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {prompts.slice(0, isChat ? 5 : 3).map((p,i)=>(
            <button key={i}
              onClick={() => isChat ? setChatInput(p) : askMarcus(p)}
              style={{
                background:T.surface, border:`1px solid ${T.border}`, borderRadius:20,
                padding:'5px 12px', fontSize:11, color:T.textSub, cursor:'pointer',
                transition:'all 0.15s',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.aiAccent; e.currentTarget.style.color=T.aiAccent; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textSub; }}
            >{p}</button>
          ))}
        </div>
      </div>
    );
  };

  // ── Chat UI ────────────────────────────────────────────────────────────────
  const renderChat = () => (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <PromptStrip tab="chat" />

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:12, paddingBottom:8, minHeight:200, maxHeight:'calc(90vh - 400px)' }}>
        {messages.map((m,i)=>{
          const isUser = m.role==='user';
          return(
            <div key={i} style={{ display:'flex', justifyContent:isUser?'flex-end':'flex-start', gap:10, alignItems:'flex-end' }}>
              {!isUser && (
                <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
                  background:`linear-gradient(135deg,${T.aiAccent},${T.accent})`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', letterSpacing:-0.5 }}>M</div>
              )}
              <div style={{
                maxWidth:'80%', padding:'11px 15px',
                borderRadius:isUser?'16px 16px 4px 16px':'16px 16px 16px 4px',
                background:isUser?T.chatUserBg:T.chatAiBg,
                border:`1px solid ${isUser?T.aiAccent+'55':T.border}`,
                fontSize:12.5, color:T.text, lineHeight:1.65,
                whiteSpace:'pre-wrap', wordBreak:'break-word',
              }}>{m.content}</div>
              {isUser && (
                <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
                  background:`hsl(200,60%,35%)`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>You</div>
              )}
            </div>
          );
        })}
        {chatLoading && (
          <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
              background:`linear-gradient(135deg,${T.aiAccent},${T.accent})`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff' }}>M</div>
            <div style={{ padding:'11px 15px', borderRadius:'16px 16px 16px 4px',
              background:T.chatAiBg, border:`1px solid ${T.border}`, color:T.textMuted, fontSize:12 }}>
              Searching the web…
            </div>
          </div>
        )}
        <div ref={chatBottomRef}/>
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <input
          value={chatInput}
          onChange={e=>setChatInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendChat(); } }}
          placeholder="Ask Marcus anything about your business, content, or growth…"
          style={{ flex:1, padding:'11px 14px', background:T.inputBg, border:`1px solid ${T.inputBorder}`,
            borderRadius:10, color:T.text, fontSize:12.5, outline:'none', boxSizing:'border-box' }}
        />
        <button onClick={()=>sendChat()} disabled={chatLoading||!chatInput.trim()} style={{
          padding:'11px 20px', borderRadius:10, border:'none',
          background:chatLoading||!chatInput.trim()?T.surface:`linear-gradient(135deg,${T.aiAccent},${T.accent})`,
          color:chatLoading||!chatInput.trim()?T.textMuted:'#fff',
          cursor:chatLoading||!chatInput.trim()?'default':'pointer',
          fontSize:13, fontWeight:700, transition:'all 0.15s', flexShrink:0,
        }}>Send</button>
      </div>
    </div>
  );

  // ── Trending ───────────────────────────────────────────────────────────────
  const renderTrending = () => {
    if(!result) return(
      <div>
        <PromptStrip tab="trending" />
        <div style={{ textAlign:'center', padding:'28px 20px', color:T.textMuted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
          <div style={{ fontSize:13, color:T.text, marginBottom:4 }}>See what people are searching for in "{category}"</div>
          <div style={{ fontSize:11 }}>Results pulled live from the web — real search demand right now</div>
        </div>
      </div>
    );
    return(
      <>
        <PromptStrip tab="trending" />
        <div style={{ background:T.aiSurface, border:`1px solid ${T.aiBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:12 }}>
          <div style={{ fontSize:11, color:T.aiAccent, fontWeight:700, marginBottom:4 }}>📊 Search Intelligence — {result.category}</div>
          <p style={{ fontSize:12, color:T.text, lineHeight:1.6, margin:0 }}>{result.insight}</p>
        </div>
        {result.risingTopics?.length>0&&(
          <div style={{ marginBottom:12 }}>
            <SectionTitle>🚀 Rising Topics</SectionTitle>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {result.risingTopics.map((t,i)=>(
                <button key={i} onClick={()=>askMarcus(`Tell me more about the trend: "${t}" and how I should create content about it`)}
                  style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:'4px 12px', fontSize:11, color:T.text, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.aiAccent; e.currentTarget.style.color=T.aiAccent; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.text; }}
                >{t} →</button>
              ))}
            </div>
          </div>
        )}
        <SectionTitle>🔍 What People Are Searching For</SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {(result.trendingSearces||result.trendingSearches||[]).map((item,i)=>(
            <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', transition:'border-color 0.15s', cursor:'pointer' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHover}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
              onClick={()=>askMarcus(`How should I write an article about "${item.contentAngle}" to capture the search query "${item.searchQuery}"?`)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:T.text, lineHeight:1.3 }}>"{item.searchQuery}"</span>
                <Badge label={item.volume} colour={VOLUME_C[item.volume]}/>
              </div>
              <div style={{ fontSize:11, color:T.aiAccent, marginBottom:6, fontWeight:600 }}>✍️ {item.contentAngle}</div>
              <div style={{ fontSize:11, color:T.textSub, lineHeight:1.4, marginBottom:8 }}>{item.reason}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:T.textMuted }}>Discover:</span>
                  <Badge label={item.googleDiscoverPotential} colour={IMPACT_C[item.googleDiscoverPotential]}/>
                </div>
                <span style={{ fontSize:10, color:T.aiAccent }}>Ask Marcus →</span>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  // ── Recommendations ────────────────────────────────────────────────────────
  const renderRecommendations = () => {
    if(!result) return(
      <div>
        <PromptStrip tab="recommendations" />
        <div style={{ textAlign:'center', padding:'28px 20px', color:T.textMuted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>💡</div>
          <div style={{ fontSize:13, color:T.text, marginBottom:4 }}>Get content ideas for "{category}" based on real search demand</div>
          <div style={{ fontSize:11 }}>AI cross-references live Google trends with your platform's content</div>
        </div>
      </div>
    );
    return(
      <>
        <PromptStrip tab="recommendations" />
        <div style={{ background:T.aiSurface, border:`1px solid ${T.aiBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:12 }}>
          <div style={{ fontSize:11, color:T.aiAccent, fontWeight:700, marginBottom:4 }}>🎯 Strategy — {result.category}</div>
          <p style={{ fontSize:12, color:T.text, lineHeight:1.6, margin:0 }}>{result.summary}</p>
        </div>
        <SectionTitle>📝 What to Create Next</SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          {(result.recommendations||[]).map((r,i)=>(
            <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', transition:'border-color 0.15s', cursor:'pointer' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHover}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
              onClick={()=>askMarcus(`Help me write an outline for: "${r.title}" — including the best structure, key points to cover, and how to optimize it for Google traffic.`)}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:T.text, lineHeight:1.3 }}>{r.title}</span>
                <Badge label={r.urgency} colour={IMPACT_C[r.urgency]}/>
              </div>
              <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                <Badge label={r.type} colour={T.aiAccent}/>
                {r.searchDemand&&<Badge label={`demand: ${r.searchDemand}`} colour={VOLUME_C[r.searchDemand]}/>}
              </div>
              <div style={{ fontSize:11, color:T.textSub, lineHeight:1.4, marginBottom:6 }}>{r.reason}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:10, color:T.textMuted, fontStyle:'italic' }}>📈 {r.estimatedImpact}</div>
                <span style={{ fontSize:10, color:T.aiAccent }}>Get outline →</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[['🕳 Content Gaps','contentGaps','#ef4444','○'],['⚡ Quick Wins','quickWins','#34d399','✓']].map(([title,key,col,icon])=>(
            <div key={key} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px' }}>
              <SectionTitle>{title}</SectionTitle>
              {(result[key]||[]).map((g,i)=>(
                <div key={i} style={{ display:'flex', gap:8, marginBottom:7, cursor:'pointer', borderRadius:6, padding:'3px 4px', transition:'background 0.15s' }}
                  onClick={()=>askMarcus(`Tell me more about this opportunity: "${g}"`)}
                  onMouseEnter={e=>e.currentTarget.style.background=T.rowHover}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{ color:col, flexShrink:0 }}>{icon}</span>
                  <span style={{ fontSize:12, color:T.text, lineHeight:1.4 }}>{g}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    );
  };

  // ── News ───────────────────────────────────────────────────────────────────
  const renderNews = () => {
    if(!result) return(
      <div>
        <PromptStrip tab="news" />
        <div style={{ textAlign:'center', padding:'28px 20px', color:T.textMuted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📰</div>
          <div style={{ fontSize:13, color:T.text, marginBottom:4 }}>Get live business news for "{category}"</div>
          <div style={{ fontSize:11 }}>Stay updated on what's happening so you know what to write about</div>
        </div>
      </div>
    );
    const sentC = { bullish:'#10b981', bearish:'#ef4444', neutral:'#94a3b8', mixed:'#f59e0b' }[result.marketSentiment]||'#94a3b8';
    return(
      <>
        <PromptStrip tab="news" />
        <div style={{ background:T.aiSurface, border:`1px solid ${T.aiBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:T.aiAccent, fontWeight:700, marginBottom:4 }}>🌐 Market Pulse — {result.category}</div>
              <p style={{ fontSize:12, color:T.text, lineHeight:1.6, margin:'0 0 6px' }}>{result.editorNote}</p>
              <div style={{ fontSize:11, color:T.textMuted }}>Key theme: <strong style={{ color:T.text }}>{result.keyTheme}</strong></div>
            </div>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:10, color:T.textMuted, marginBottom:4 }}>Sentiment</div>
              <span style={{ fontSize:12, fontWeight:700, color:sentC, background:sentC+'18', padding:'4px 12px', borderRadius:20, textTransform:'uppercase', border:`1px solid ${sentC}44` }}>{result.marketSentiment}</span>
            </div>
          </div>
        </div>
        <SectionTitle>📰 Latest Headlines</SectionTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {(result.headlines||[]).map((h,i)=>(
            <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', transition:'border-color 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHover}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:700, color:T.text, lineHeight:1.3, flex:1 }}>{h.title}</span>
                <Badge label={h.impact} colour={IMPACT_C[h.impact]}/>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:10, color:T.textMuted, background:T.surface, border:`1px solid ${T.border}`, padding:'1px 8px', borderRadius:20 }}>{h.source}</span>
                <span style={{ fontSize:10, color:T.textMuted }}>{h.publishedAt}</span>
              </div>
              <p style={{ fontSize:12, color:T.textSub, lineHeight:1.5, margin:'0 0 8px' }}>{h.summary}</p>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'8px 10px', background:T.aiSurface, border:`1px solid ${T.aiBorder}`, borderRadius:8, cursor:'pointer' }}
                onClick={()=>askMarcus(`Help me write an article based on this news: "${h.title}". Give me a full outline, key angles, and how to optimize it for Google traffic.`)}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.aiAccent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.aiBorder}>
                <div>
                  <span style={{ fontSize:10, color:T.aiAccent, fontWeight:700 }}>✍️ Content idea: </span>
                  <span style={{ fontSize:11, color:T.text }}>{h.contentOpportunity}</span>
                </div>
                <span style={{ fontSize:10, color:T.aiAccent, flexShrink:0, marginLeft:8 }}>Write with Marcus →</span>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  const isChat = subTab==='chat';

  return(
    <div style={{ overflowY: isChat?'hidden':'auto', flex:1, paddingRight:4, paddingBottom:8, display:'flex', flexDirection:'column' }}>
      {/* Sub-tabs + category */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'12px 14px', marginBottom:12, flexShrink:0 }}>
        <div style={{ display:'flex', gap:4, marginBottom:isChat?0:12, background:T.bg, borderRadius:8, padding:3, border:`1px solid ${T.border}` }}>
          {SUB_TABS.map(t=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)} style={{
              flex:1, background:subTab===t.id?T.tabActive:'transparent', border:'none',
              color:subTab===t.id?T.tabText:T.tabInactive,
              padding:'6px 8px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600,
              transition:'all 0.15s', whiteSpace:'nowrap',
            }}>{t.label}</button>
          ))}
        </div>

        {!isChat&&(
          <>
            <div style={{ fontSize:11, color:T.textMuted, margin:'10px 0 6px', textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>Category</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              {categories.map(c=>(
                <button key={c} onClick={()=>setCategory(c)} style={{
                  padding:'4px 12px', borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s',
                  background:category===c?T.aiAccent+'22':T.surface,
                  border:`1px solid ${category===c?T.aiAccent:T.border}`,
                  color:category===c?T.aiAccent:T.textMuted,
                }}>{c}</button>
              ))}
            </div>
            <button onClick={fetchData} disabled={loading} style={{
              width:'100%', padding:'9px',
              background:loading?T.surface:`linear-gradient(135deg,${T.aiAccent},${T.accent})`,
              border:`1px solid ${T.aiBorder}`, borderRadius:8,
              cursor:loading?'default':'pointer',
              color:loading?T.textMuted:'#fff', fontSize:12, fontWeight:700,
              transition:'all 0.2s', opacity:loading?0.7:1,
            }}>
              {loading?`⏳ Searching the web for ${category}…`
                :subTab==='trending'?`🔍 Find Trending Searches in ${category}`
                :subTab==='recommendations'?`💡 Generate Ideas for ${category}`
                :`📰 Load ${category} News`}
            </button>
          </>
        )}
      </div>

      {error&&!isChat&&(
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'10px 14px', color:'#f87171', fontSize:12, marginBottom:12, flexShrink:0 }}>
          ⚠️ {error}
        </div>
      )}

      {isChat ? renderChat()
        : subTab==='trending'        ? renderTrending()
        : subTab==='recommendations' ? renderRecommendations()
        : renderNews()
      }
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

  const loadUsers = useCallback(async()=>{
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id,username,role,created_at').order('created_at',{ascending:false});
      if(error) throw error;
      setUsers(data||[]);
    } catch(err){ console.error('TeamManager error',err); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ loadUsers(); },[loadUsers]);

  const changeRole = async(userId, newRole)=>{
    setSaving(userId);
    try {
      const { error } = await supabase.from('profiles').update({role:newRole}).eq('id',userId);
      if(error) throw error;
      setUsers(prev=>prev.map(u=>u.id===userId?{...u,role:newRole}:u));
    } catch(err){ console.error(err); alert('Could not update role. Check RLS policies.'); }
    finally{ setSaving(null); }
  };

  if(loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:T.textMuted, fontSize:13 }}>Loading team…</div>;

  return(
    <div style={{ overflowY:'auto', flex:1, paddingRight:4, paddingBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.text }}>Team & Role Management</div>
          <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>Change any user's access level directly from here</div>
        </div>
        <button onClick={loadUsers} style={{ background:'none', border:'none', color:T.textMuted, cursor:'pointer', fontSize:15 }}>↻</button>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {[['user','No dashboard'],['team','View dashboard'],['admin','Full access + manage roles']].map(([val,desc])=>(
          <div key={val} style={{ display:'flex', alignItems:'center', gap:6, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 10px' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:ROLE_COLOURS[val] }}/>
            <span style={{ fontSize:11, color:T.text, fontWeight:600 }}>{ROLE_LABELS[val]}</span>
            <span style={{ fontSize:10, color:T.textMuted }}>— {desc}</span>
          </div>
        ))}
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 180px', gap:12, padding:'10px 16px', background:T.headerRow, borderBottom:`1px solid ${T.border}` }}>
          {['User','Role','Change Role'].map(h=>(
            <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:T.textMuted }}>{h}</span>
          ))}
        </div>
        {users.length===0&&<div style={{ padding:'24px', textAlign:'center', color:T.textMuted, fontSize:12 }}>No users found</div>}
        {users.map((u,i)=>{
          const letter=(u.username||'U')[0]?.toUpperCase();
          const isSaving=saving===u.id;
          return(
            <div key={u.id} style={{ display:'grid', gridTemplateColumns:'1fr 110px 180px', gap:12, padding:'12px 16px', alignItems:'center', borderBottom:i<users.length-1?`1px solid ${T.border}`:'none', transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=T.rowHover}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:`hsl(${letter?.charCodeAt(0)*37%360},50%,35%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>{letter}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>@{u.username||'unnamed'}</div>
                  <div style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>Joined {new Date(u.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:ROLE_COLOURS[u.role] }}/>
                <span style={{ fontSize:12, color:ROLE_COLOURS[u.role], fontWeight:600 }}>{ROLE_LABELS[u.role]}</span>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                {Object.values(ROLES).map(r=>(
                  <button key={r} onClick={()=>changeRole(u.id,r)} disabled={u.role===r||isSaving} style={{
                    padding:'4px 10px', borderRadius:6, cursor:u.role===r?'default':'pointer', fontSize:10, fontWeight:600, transition:'all 0.15s',
                    background:u.role===r?ROLE_COLOURS[r]+'22':T.surface,
                    border:`1px solid ${u.role===r?ROLE_COLOURS[r]:T.border}`,
                    color:u.role===r?ROLE_COLOURS[r]:T.textMuted,
                    opacity:isSaving?0.5:1,
                  }}>{isSaving&&u.role!==r?'…':ROLE_LABELS[r]}</button>
                ))}
              </div>
            </div>
          );
        })}
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

  const save = async()=>{
    const newUsername=input.trim();
    if(!newUsername){ alert('Username cannot be empty.'); return; }
    setLoading(true);
    try {
      const {data:authData}=await supabase.auth.getUser();
      const user=authData?.user;
      if(!user){ alert('Not logged in.'); return; }
      const {data,error}=await supabase.from('profiles').upsert({id:user.id,username:newUsername},{onConflict:'id'}).select();
      if(error){ if(error.code==='23505'){alert('Username already taken.');return;} alert('Could not update username.'); return; }
      const row=Array.isArray(data)?data[0]:data;
      setEditing(false);
      if(typeof onSaved==='function') onSaved(row?.username||newUsername);
    } catch(err){ console.error(err); alert('Could not update username.'); }
    finally{ setLoading(false); }
  };

  return !editing?(
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>Username</div>
        <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{profile?.username||'—'}</div>
      </div>
      <button onClick={()=>{ setEditing(true); setInput(profile?.username||''); }} style={{
        background:T.accent+'18', border:`1px solid ${T.accent}44`,
        color:T.accent, padding:'6px 14px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
      }}>Edit Username</button>
    </div>
  ):(
    <div>
      <div style={{ fontSize:11, color:T.textMuted, marginBottom:6 }}>New Username</div>
      <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Enter username"
        style={{ width:'100%', padding:'8px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`,
          borderRadius:8, color:T.text, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:10 }}/>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={save} disabled={loading} style={{ background:T.accentGrad, border:'none', color:'#fff', padding:'7px 18px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>
          {loading?'Saving…':'Save'}
        </button>
        <button onClick={()=>setEditing(false)} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.textSub, padding:'7px 14px', borderRadius:8, cursor:'pointer', fontSize:12 }}>Cancel</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const UserProfile = ({ onClose, onUpdated }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab]   = useState('profile');
  const [theme, setTheme]     = useState(THEMES.dark);

  useEffect(()=>{
    let mounted=true;
    const load=async()=>{
      setLoading(true);
      try {
        const {data:authData}=await supabase.auth.getUser();
        const user=authData?.user;
        if(!user){ if(mounted)setLoading(false); return; }
        const {data,error}=await supabase.from('profiles').select('id,username,avatar_url,role,can_add_summary').eq('id',user.id).maybeSingle();
        if(!mounted) return;
        if(error||!data){
          const {data:upserted}=await supabase.from('profiles').upsert({id:user.id,username:'',role:'user'},{onConflict:'id'}).select();
          const row=Array.isArray(upserted)?upserted[0]:upserted;
          if(mounted) setProfile(row||{id:user.id,username:'',role:'user'});
        } else {
          if(mounted) setProfile(data);
        }
      } catch(err){ console.error('Profile load error',err); }
      finally{ if(mounted) setLoading(false); }
    };
    load();
    return()=>{ mounted=false; };
  },[]);

  const handleSaved=(newUsername)=>{
    setProfile(p=>({...p,username:newUsername}));
    if(typeof onUpdated==='function') onUpdated({username:newUsername});
  };

  const role=profile?.role||'user';
  const avatarLetter=(profile?.username||'U')[0]?.toUpperCase()||'U';
  const showDash=canSeeDashboard(role);
  const showTeam=canManageRoles(role);
  const T=theme;

  if(loading) return(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1400 }}>
      <div style={{ color:'#94a3b8', fontSize:13 }}>Loading…</div>
    </div>
  );

  // ── ELEVATED (admin/team) ─────────────────────────────────────────────────
  if(showDash){
    const tabs=[
      {id:'profile',   label:'👤 Profile'},
      {id:'dashboard', label:'📊 Dashboard'},
      {id:'ai',        label:'✨ AI Advisor'},
      ...(showTeam?[{id:'team',label:'👥 Team'}]:[]),
    ];
    return(
      <div style={{ position:'fixed', inset:0, background:T.overlay, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1400, padding:'3%', boxSizing:'border-box' }}
        role="dialog" aria-modal="true">
        <div style={{
          background:T.bg, backgroundImage:T.bgGradient,
          width:'100%', height:'100%', borderRadius:16,
          border:`1px solid ${T.border}`, boxShadow:T.shadow,
          padding:'20px 24px', position:'relative',
          display:'flex', flexDirection:'column',
          fontFamily:"'DM Sans',sans-serif", overflow:'hidden',
        }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
          <button onClick={onClose} style={{ position:'absolute', right:16, top:12, background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:T.closeColor, zIndex:10, lineHeight:1 }}>&times;</button>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18, paddingRight:36, flexShrink:0 }}>
            <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:`linear-gradient(135deg,${T.accent},${T.aiAccent})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#fff' }}>{avatarLetter}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{profile?.username||'User'}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                <span style={{ background:ROLE_COLOURS[role]+'22', color:ROLE_COLOURS[role], padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase' }}>{ROLE_LABELS[role]}</span>
                <span style={{ fontSize:11, color:T.textMuted }}>Ogonjo Platform</span>
              </div>
            </div>
            <div style={{ flex:1 }}/>
            <ThemeSwitcher theme={theme} setTheme={setTheme}/>
            <div style={{ display:'flex', gap:3, background:T.surface, borderRadius:8, padding:3, border:`1px solid ${T.border}` }}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{
                  background:activeTab===t.id?T.tabActive:'transparent', border:'none',
                  color:activeTab===t.id?T.tabText:T.tabInactive,
                  padding:'5px 14px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, whiteSpace:'nowrap', transition:'all 0.15s',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
            {activeTab==='profile'&&(
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:18 }}>
                <ProfileEdit profile={profile} onSaved={handleSaved} theme={T}/>
              </div>
            )}
            {activeTab==='dashboard' && <AnalyticsDashboard theme={T}/>}
            {activeTab==='ai'        && <AIAdvisor theme={T}/>}
            {activeTab==='team' && showTeam && <TeamManager theme={T}/>}
          </div>
        </div>
      </div>
    );
  }

  // ── NORMAL USER ───────────────────────────────────────────────────────────
  return(
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="User profile">
      <div className="modal-panel">
        <button className="modal-close" onClick={onClose} aria-label="Close profile">&times;</button>
        <div className="profile-modal-body">
          <div className="profile-modal-avatar">
            <span className="letter-avatar-large">{avatarLetter}</span>
          </div>
          <div className="profile-modal-info">
            <h2 className="profile-modal-name">{profile?.username||'User'}</h2>
            <ProfileEdit profile={profile} onSaved={handleSaved} theme={THEMES.white}/>
            <div className="profile-modal-actions" style={{ marginTop:8 }}>
              <button className="btn btn-outline" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;