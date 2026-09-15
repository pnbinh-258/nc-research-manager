import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api.js';

function fmtVN(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return (d && m && y) ? `${d}/${m}/${y}` : iso;
}

const SITES_META = [
  { site_id: 'ND115', site_name: 'Nhân Dân 115',      city: 'TP.HCM'    },
  { site_id: 'TNH',   site_name: 'Thống Nhất',         city: 'TP.HCM'    },
  { site_id: 'QY175', site_name: 'Quân Y 175',         city: 'TP.HCM'    },
  { site_id: 'DNA',   site_name: 'Đà Nẵng',            city: 'Đà Nẵng'   },
  { site_id: 'VTI',   site_name: 'Việt Tiệp',          city: 'Hải Phòng' },
  { site_id: 'YHN',   site_name: 'Y Hà Nội',           city: 'Hà Nội'    },
  { site_id: 'QY103', site_name: 'Quân Y 103',         city: 'Hà Nội'    },
  { site_id: 'CTH',   site_name: 'ĐKTW Cần Thơ',       city: 'Cần Thơ'   },
  { site_id: 'UHU',   site_name: 'Trung Ương Huế',     city: 'Huế'       },
  { site_id: 'CDO',   site_name: 'Châu Đốc',           city: 'An Giang'  },
];

const SITE_COLOR = {
  ND115:'#1a73e8', TNH:'#0f9688', QY175:'#7b5ea7',
  DNA:'#e67e22',   VTI:'#e74c3c', YHN:'#2ecc71',
  QY103:'#3498db', CTH:'#9b59b6', UHU:'#f39c12', CDO:'#1abc9c',
};

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color || '#1a73e8'}` }}>
      <div className="stat-value" style={{ color: color || '#1a73e8' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function SiteEditModal({ site, onClose, onSaved }) {
  const meta = SITES_META.find(m => m.site_id === site.site_id) || {};
  const [status, setStatus] = useState(site.status || 'Chưa mở');
  const [target, setTarget] = useState(site.target_enrollment || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true); setError('');
    try {
      await apiPost('nlUpdateSite', { site_id: site.site_id, status, target_enrollment: target });
      onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'var(--surface)', borderRadius:10, padding:24, width:320,
        boxShadow:'0 8px 32px rgba(0,0,0,.2)', border:'1px solid var(--border)' }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>
          Chỉnh site — {meta.site_name || site.site_id}
        </div>

        {error && <div style={{ color:'#d32f2f', fontSize:13, marginBottom:10 }}>⚠ {error}</div>}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:5 }}>Trạng thái</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ width:'100%', padding:'7px 10px', borderRadius:6, border:'1.5px solid var(--border)',
              background:'var(--surface)', color:'var(--text)', fontSize:14 }}>
            <option value="Recruiting">Recruiting (đang tuyển)</option>
            <option value="Chưa mở">Chưa mở</option>
            <option value="Completed">Completed</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:5 }}>Mục tiêu thu tuyển (BN)</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)}
            placeholder="VD: 30" min="0"
            style={{ width:'100%', padding:'7px 10px', borderRadius:6, border:'1.5px solid var(--border)',
              background:'var(--surface)', color:'var(--text)', fontSize:14, boxSizing:'border-box' }} />
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose}
            style={{ padding:'7px 16px', borderRadius:6, border:'1px solid var(--border)',
              background:'var(--surface)', cursor:'pointer', fontSize:13 }}>Huỷ</button>
          <button onClick={save} disabled={busy}
            style={{ padding:'7px 16px', borderRadius:6, border:'none',
              background:'#1a73e8', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SiteCard({ site, onClick, onEdit, canEdit }) {
  const meta = SITES_META.find(m => m.site_id === site.site_id) || {};
  const color = SITE_COLOR[site.site_id] || '#888';
  const isRecruiting = site.status === 'Recruiting';

  return (
    <div className="nl-site-card" style={{ borderLeft: `4px solid ${color}`, position:'relative' }}>
      {canEdit && (
        <button onClick={e => { e.stopPropagation(); onEdit(); }}
          title="Chỉnh trạng thái site"
          style={{ position:'absolute', top:8, right:8, background:'none', border:'none',
            cursor:'pointer', fontSize:15, opacity:0.5, padding:2, lineHeight:1 }}>✏️</button>
      )}
      <div className="nl-site-header" onClick={onClick} style={{ cursor:'pointer' }}>
        <div>
          <div className="nl-site-name">{meta.site_name || site.site_id}</div>
          <div className="nl-site-city">{meta.city}</div>
        </div>
        <div className={`nl-site-badge ${isRecruiting ? 'recruiting' : 'not-recruiting'}`}>
          {isRecruiting ? 'Recruiting' : (site.status || 'Chưa mở')}
        </div>
      </div>
      <div className="nl-site-stats" onClick={onClick} style={{ cursor:'pointer' }}>
        <span className="nl-enrolled-num" style={{ color }}>{site.enrolled}</span>
        <span className="nl-enrolled-label"> BN thu tuyển</span>
        {site.overdue_outcome > 0 && (
          <span className="nl-badge-red" title="Quá hạn đánh giá">🔴 {site.overdue_outcome}</span>
        )}
        {site.upcoming_outcome > 0 && (
          <span className="nl-badge-orange" title="Sắp đến hạn">🟠 {site.upcoming_outcome}</span>
        )}
      </div>
      {site.target_enrollment > 0 && (
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
          Mục tiêu: {site.target_enrollment} BN
          {site.enrolled > 0 && (
            <span style={{ marginLeft:6, color: site.enrolled >= site.target_enrollment ? '#188038' : color }}>
              ({Math.round(site.enrolled / site.target_enrollment * 100)}%)
            </span>
          )}
        </div>
      )}
      {site.completed_outcome > 0 && (
        <div className="nl-progress-label" style={{ color:'#188038' }}>
          ✓ {site.completed_outcome} đã có kết cục 3T
        </div>
      )}
    </div>
  );
}

const MONTHS_VI = ['','Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'];

// ── Projection chart ────────────────────────────────────────────────

const TOTAL_TARGET = 418;

const STUDY_MONTH_KEYS = (() => {
  const out = [];
  let y = 2026, m = 8;
  for (let i = 0; i < 24; i++) {
    out.push(`${String(m).padStart(2, '0')}/${y}`);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
})();

function ProjectionSvg({ enrollByMonth, target, currentRateNum }) {
  const W = 700, H = 200, PAD = { t: 24, r: 60, b: 36, l: 44 };
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;

  const keyToIdx = Object.fromEntries(STUDY_MONTH_KEYS.map((k, i) => [k, i]));
  const actualCumul = Array(24).fill(null);
  let cumActual = 0;
  (enrollByMonth || []).forEach(m => {
    const idx = keyToIdx[m.month];
    if (idx !== undefined) { cumActual += m.count; actualCumul[idx] = cumActual; }
  });
  const lastIdx = actualCumul.reduce((mx, v, i) => (v !== null ? i : mx), -1);
  const lastVal = lastIdx >= 0 ? actualCumul[lastIdx] : 0;

  // Ngưỡng tối thiểu cần đạt mỗi tháng để kịp 418 BN
  const minRate = target / 24;
  const planCumul = STUDY_MONTH_KEYS.map((_, i) => Math.round((i + 1) * minRate));

  // Dự báo theo tốc độ thu tuyển hiện tại (chiếu thẳng từ điểm cuối)
  const rate = currentRateNum || 0;
  const forecastCumul = Array(24).fill(null);
  if (lastIdx >= 0) {
    forecastCumul[lastIdx] = lastVal;
    for (let i = lastIdx + 1; i < 24; i++) forecastCumul[i] = Math.round(lastVal + rate * (i - lastIdx));
  }

  const forecastEnd = forecastCumul[23] ?? lastVal;
  const yMax = Math.max(forecastEnd, target) * 1.08;
  const xOf = i => PAD.l + (i + 0.5) * (innerW / 24);
  const yOf = v => PAD.t + innerH - (v / yMax) * innerH;
  const ptStr = arr => arr.map((v, i) => v !== null ? `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}` : null).filter(Boolean).join(' ');

  // Vùng cảnh báo đỏ bên dưới đường ngưỡng tối thiểu
  const dangerPoly = [
    `${xOf(0).toFixed(1)},${yOf(planCumul[0]).toFixed(1)}`,
    ...planCumul.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`),
    `${xOf(23).toFixed(1)},${(PAD.t + innerH).toFixed(1)}`,
    `${xOf(0).toFixed(1)},${(PAD.t + innerH).toFixed(1)}`,
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      {/* Vùng đỏ cảnh báo dưới ngưỡng tối thiểu */}
      <polygon points={dangerPoly} fill="rgba(244,67,54,0.07)" />

      {/* Grid + y-axis labels */}
      {[0, 100, 200, 300, target].map(t => {
        const y = yOf(t); const isT = t === target;
        return (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y}
              stroke={isT ? '#AA00FF' : 'var(--border)'}
              strokeWidth={isT ? 1.5 : 1}
              strokeDasharray={isT ? '4,5' : t === 0 ? '' : '3,3'}
              opacity={isT ? 0.7 : undefined} />
            <text x={PAD.l - 4} y={y + 4} fontSize="10" textAnchor="end"
              fill={isT ? '#AA00FF' : 'var(--muted)'} fontWeight={isT ? '700' : '400'}>{t}</text>
            {isT && <text x={W - PAD.r + 4} y={y + 4} fontSize="10" fill="#AA00FF" fontWeight="700">← {target}</text>}
          </g>
        );
      })}

      {/* Đường ngưỡng tối thiểu — cam đậm, đứt nét */}
      <polyline points={planCumul.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')}
        fill="none" stroke="#FF6D00" strokeWidth="2" strokeDasharray="6,4" opacity="0.9" />
      <text x={W - PAD.r + 4} y={yOf(planCumul[23]) + 4} fontSize="10" fill="#FF6D00" fontWeight="700">{planCumul[23]}</text>

      {/* Đường dự báo tốc độ hiện tại — xanh lá đứt nét */}
      {ptStr(forecastCumul) && (
        <g>
          <polyline points={ptStr(forecastCumul)} fill="none"
            stroke="#00C853" strokeWidth="1.8" strokeDasharray="8,4"
            strokeLinejoin="round" opacity="0.9" />
          {forecastCumul[23] !== null && (
            <text x={W - PAD.r + 4} y={yOf(forecastCumul[23]) + 4} fontSize="10" fill="#00C853" fontWeight="700">
              {forecastCumul[23]}
            </text>
          )}
        </g>
      )}

      {/* Actual line */}
      {(() => {
        const p = ptStr(actualCumul);
        return p ? (
          <g>
            <polyline points={p} fill="none" stroke="#00C4A7" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round" />
            {actualCumul.map((v, i) => v !== null ? (
              <circle key={i} cx={xOf(i)} cy={yOf(v)} r="4" fill="#00C4A7" stroke="white" strokeWidth="1.5" />
            ) : null)}
          </g>
        ) : null;
      })()}

      {/* Now marker */}
      {(() => {
        const elapsed = Math.max(0, Date.now() - new Date('2026-08-17').getTime());
        const eMonths = elapsed / (30.4375 * 86400000);
        if (eMonths <= 0) return null;
        const nowX = PAD.l + Math.min(eMonths, 23.9) * (innerW / 24);
        return (
          <g>
            <line x1={nowX} x2={nowX} y1={PAD.t} y2={PAD.t + innerH}
              stroke="#00C4A7" strokeWidth="1" strokeDasharray="3,4" opacity="0.5" />
            <text x={nowX + 3} y={PAD.t + 11} fontSize="9" fill="#00C4A7" opacity="0.85">Hiện tại</text>
          </g>
        );
      })()}

      {/* X labels */}
      {STUDY_MONTH_KEYS.map((k, i) => {
        if (i % 3 !== 0 && i !== 23) return null;
        const [mo] = k.split('/');
        return (
          <text key={i} x={xOf(i)} y={H - 2} fontSize="9" textAnchor="middle" fill="var(--muted)">
            {MONTHS_VI[+mo]}
          </text>
        );
      })}
    </svg>
  );
}

function ProjectionSection({ enrollByMonth, patientsTotal, total_target }) {
  const target = Math.max(total_target || 0, TOTAL_TARGET);
  // Tính từ ngày khởi động thực tế (17/8/2026), không đếm tháng dương lịch
  const STUDY_START_MS = new Date('2026-08-17').getTime();
  const elapsedMs = Math.max(0, Date.now() - STUDY_START_MS);
  const elapsedDays = Math.floor(elapsedMs / 86400000);
  const elapsedMonths = elapsedMs / (30.4375 * 86400000);
  const planAtNow = Math.round(elapsedMonths * (target / 24));
  const vsPlan = patientsTotal - planAtNow;
  const remainingMonths = 24 - elapsedMonths;
  const neededRate = remainingMonths > 0
    ? ((target - patientsTotal) / remainingMonths).toFixed(1) : '—';
  const currentRateNum = elapsedDays > 0 ? patientsTotal / elapsedMonths : 0;
  const currentRate = currentRateNum > 0 ? currentRateNum.toFixed(1) : '—';

  const kpiBox = color => ({
    background: 'var(--bg, #f5f7fa)',
    border: '1px solid var(--border)',
    borderTop: `3px solid ${color}`,
    borderRadius: 7,
    padding: '10px 12px',
  });

  const kpis = [
    { label: 'Đã thu tuyển', val: patientsTotal, unit: 'BN',
      sub: `sau ${elapsedDays} ngày (từ 17/8)`, color: '#1a73e8' },
    { label: 'So kế hoạch',
      val: (vsPlan >= 0 ? '+' : '') + vsPlan, unit: 'BN',
      sub: `${patientsTotal} vs. ${planAtNow} dự kiến`,
      color: vsPlan >= 0 ? '#188038' : '#d32f2f' },
    { label: 'Tốc độ TB thực tế', val: currentRate, unit: '/th',
      sub: `BN/tháng (${elapsedDays} ngày)`, color: '#e67e22' },
    { label: 'Cần đạt để kịp hạn', val: neededRate, unit: '/th',
      sub: `trong ${remainingMonths.toFixed(1)} tháng còn lại`, color: '#7b5ea7' },
  ];

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
        <div style={{ fontWeight:700, fontSize:15 }}>Dự báo tiến độ thu tuyển — 24 tháng</div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>
          Th.8 2026 → Th.7 2028 · Mục tiêu {target} BN
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:16 }}>
        {kpis.map(k => (
          <div key={k.label} style={kpiBox(k.color)}>
            <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'0.08em',
              color:'var(--muted)', marginBottom:3 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:k.color,
              fontVariantNumeric:'tabular-nums', lineHeight:1.1 }}>
              {k.val}<span style={{ fontSize:12, fontWeight:400, marginLeft:2 }}>{k.unit}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <ProjectionSvg enrollByMonth={enrollByMonth} target={target} currentRateNum={currentRateNum} />

      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginTop:10,
        fontSize:11, color:'var(--muted)', alignItems:'center' }}>
        {[
          { stroke:'#00C4A7', w:2.5, dash:'',    label:'Thực tế (lũy kế)' },
          { stroke:'#00C853', w:1.8, dash:'8,4', label:`Dự báo tốc độ hiện tại (~${currentRate}/th)` },
          { stroke:'#FF6D00', w:2,   dash:'6,4', label:`Ngưỡng tối thiểu (~${(target/24).toFixed(1)}/th)` },
        ].map(l => (
          <span key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width="22" height="8" style={{ flexShrink:0 }}>
              <line x1="0" y1="4" x2="22" y2="4" stroke={l.stroke}
                strokeWidth={l.w} strokeDasharray={l.dash || undefined} />
            </svg>
            {l.label}
          </span>
        ))}
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:14, height:10, background:'rgba(244,67,54,0.15)',
            border:'1px solid rgba(244,67,54,0.4)', borderRadius:2, flexShrink:0 }} />
          Vùng nguy hiểm (dưới ngưỡng)
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

function SvgChart({ enriched, siteIds, mode, totalTarget }) {
  const [hovered, setHovered] = useState(null);
  const W = 700, H = 240, PAD = { t: 36, r: 28, b: 44, l: 44 };
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;
  const n = enriched.length;
  const slot = innerW / n;
  const barW = Math.max(20, Math.floor(slot * 0.6));
  const cx_ = i => PAD.l + (i + 0.5) * slot;
  const bx  = i => cx_(i) - barW / 2;

  // Tính cumulative actual
  let cumAct = 0;
  const withCum = enriched.map(m => { cumAct += m.count; return { ...m, cumAct }; });

  const maxBar = Math.max(...enriched.map(m => m.count), 1);
  const maxCum = Math.max(withCum[withCum.length - 1]?.cumAct || 1, totalTarget || 1, 1);

  const byBar = v => PAD.t + innerH - Math.round((v / maxBar) * innerH);
  const byCum = v => PAD.t + innerH - Math.round((v / maxCum) * innerH);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block', overflow:'visible' }}>
      {/* Gridlines */}
      {yTicks.map(f => {
        const y = PAD.t + innerH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y}
              stroke={f === 0 ? 'var(--text)' : 'var(--border)'}
              strokeWidth={f === 0 ? 1.5 : 1} strokeDasharray={f > 0 ? '4,3' : ''} />
            {f > 0 && <text x={PAD.l - 6} y={y + 4} fontSize="10" fill="var(--muted)" textAnchor="end">{Math.round(maxBar * f)}</text>}
          </g>
        );
      })}

      {/* Bars */}
      {enriched.map((m, i) => {
        const [mo, yr] = m.month.split('/');
        const isHov = hovered === i;
        let yOff = PAD.t + innerH;

        return (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor:'pointer' }}>
            {isHov && <rect x={cx_(i) - slot/2} y={PAD.t} width={slot} height={innerH} fill="#888" opacity="0.06" rx="2"/>}

            {/* Stacked segments by site */}
            {mode === 'stacked'
              ? siteIds.map(sid => {
                  const cnt = m[sid] || 0;
                  if (cnt === 0) return null;
                  const segH = Math.round((cnt / maxBar) * innerH);
                  yOff -= segH;
                  return <rect key={sid} x={bx(i)} y={yOff} width={barW} height={segH}
                    fill={SITE_COLOR[sid] || '#888'} rx="1"
                    opacity={hovered !== null && !isHov ? 0.35 : 0.9} />;
                })
              : (() => {
                  const barH = Math.max(m.count > 0 ? 3 : 0, Math.round((m.count / maxBar) * innerH));
                  return <rect x={bx(i)} y={byBar(m.count)} width={barW} height={barH}
                    fill={isHov ? '#0d5bdb' : '#1a73e8'} rx="3"
                    opacity={hovered !== null && !isHov ? 0.35 : 1} />;
                })()
            }

            {/* Count label */}
            {m.count > 0 && (
              <text x={cx_(i)} y={(mode === 'stacked' ? yOff : byBar(m.count)) - 5}
                fontSize="12" fontWeight="700" textAnchor="middle"
                fill={isHov ? '#1a73e8' : 'var(--text)'}>
                {m.count}
              </text>
            )}

            {/* X labels */}
            <text x={cx_(i)} y={H - 22} fontSize="11" textAnchor="middle" fill="var(--muted)">{MONTHS_VI[+mo] || mo}</text>
            <text x={cx_(i)} y={H - 8}  fontSize="9"  textAnchor="middle" fill="var(--muted)" opacity="0.6">{yr}</text>

            {/* Tooltip */}
            {isHov && (() => {
              const ttW = 140, ttH = mode === 'stacked' ? 14 + siteIds.filter(s => m[s] > 0).length * 14 + 14 : 46;
              const ttX = Math.min(Math.max(cx_(i) - ttW/2, PAD.l), W - PAD.r - ttW);
              const ttY = PAD.t - ttH - 8;
              const activeSites = siteIds.filter(s => m[s] > 0);
              return (
                <g>
                  <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="6"
                    fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5"
                    style={{ filter:'drop-shadow(0 2px 8px rgba(0,0,0,.15))' }} />
                  <text x={ttX + ttW/2} y={ttY + 14} fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--text)">{m.month} · +{m.count} BN</text>
                  {mode === 'stacked' ? activeSites.map((sid, j) => (
                    <g key={sid}>
                      <rect x={ttX + 8} y={ttY + 20 + j*14} width={8} height={8} fill={SITE_COLOR[sid]} rx="1"/>
                      <text x={ttX + 20} y={ttY + 28 + j*14} fontSize="10" fill="var(--text)">{sid}: {m[sid]}</text>
                    </g>
                  )) : (
                    <text x={ttX + ttW/2} y={ttY + 32} fontSize="10" textAnchor="middle" fill="var(--muted)">Lũy kế: {withCum[i].cumAct} BN</text>
                  )}
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* Cumulative actual line + area */}
      {withCum.length > 1 && (() => {
        const pts = withCum.map((m, i) => `${cx_(i)},${byCum(m.cumAct)}`);
        const area = [`${cx_(0)},${PAD.t + innerH}`, ...pts, `${cx_(n-1)},${PAD.t + innerH}`].join(' ');
        return (
          <g>
            <polygon points={area} fill="#f39c12" opacity="0.07"/>
            <polyline points={pts.join(' ')} fill="none" stroke="#f39c12" strokeWidth="2.5" strokeLinejoin="round"/>
            {withCum.map((m, i) => <circle key={i} cx={cx_(i)} cy={byCum(m.cumAct)} r={hovered === i ? 6 : 3.5} fill="#f39c12" stroke="white" strokeWidth="2"/>)}
          </g>
        );
      })()}

      {/* Planned cumulative line (nếu có target) */}
      {totalTarget > 0 && (() => {
        const pts = enriched.map((m, i) => `${cx_(i)},${byCum(m.planned || 0)}`).join(' ');
        return (
          <g>
            <polyline points={pts} fill="none" stroke="#d32f2f" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.7"/>
            {enriched.map((m, i) => (
              <circle key={i} cx={cx_(i)} cy={byCum(m.planned || 0)} r="2.5" fill="#d32f2f" opacity="0.7"/>
            ))}
          </g>
        );
      })()}

      {/* Labels cuối đường */}
      {withCum.length > 0 && (() => {
        const last = withCum[n-1];
        const lx = cx_(n-1), ly = byCum(last.cumAct);
        return (
          <g>
            <rect x={lx + 6} y={ly - 11} width={42} height={20} rx="4" fill="#f39c12"/>
            <text x={lx + 27} y={ly + 4} fontSize="11" fontWeight="800" textAnchor="middle" fill="white">{last.cumAct}</text>
          </g>
        );
      })()}
      {totalTarget > 0 && enriched.length > 0 && (() => {
        const last = enriched[n-1];
        const lx = cx_(n-1), ly = byCum(last.planned || 0);
        return (
          <g>
            <rect x={lx + 6} y={ly - 11} width={42} height={20} rx="4" fill="#d32f2f" opacity="0.85"/>
            <text x={lx + 27} y={ly + 4} fontSize="11" fontWeight="700" textAnchor="middle" fill="white">{last.planned}</text>
          </g>
        );
      })()}
    </svg>
  );
}

function SiteSparklines({ data, siteIds }) {
  const W = 120, H = 50, PAD = { t: 4, r: 4, b: 16, l: 4 };
  const innerW = W - PAD.l - PAD.r, innerH = H - PAD.t - PAD.b;
  const n = data.length;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginTop:8 }}>
      {siteIds.map(sid => {
        const counts = data.map(m => m[sid] || 0);
        const max = Math.max(...counts, 1);
        let cum = 0; const cums = counts.map(c => { cum += c; return cum; });
        const total = cums[cums.length - 1] || 0;
        const color = SITE_COLOR[sid] || '#888';
        const slot = innerW / n;
        return (
          <div key={sid} style={{ background:'var(--surface)', border:'1px solid var(--border)',
            borderLeft:`3px solid ${color}`, borderRadius:6, padding:'8px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
              <span style={{ fontSize:11, fontWeight:700, color }}>{sid}</span>
              <span style={{ fontSize:13, fontWeight:800, color }}>{total}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }}>
              {counts.map((c, i) => {
                const bh = Math.max(c > 0 ? 2 : 0, Math.round((c / max) * innerH));
                return <rect key={i} x={PAD.l + i * slot + 1} y={PAD.t + innerH - bh}
                  width={Math.max(1, slot - 2)} height={bh} fill={color} rx="1" opacity="0.85"/>;
              })}
              <text x={W/2} y={H - 2} fontSize="8" textAnchor="middle" fill="var(--muted)">
                {data.map(m => m.month.split('/')[0]).join('  ')}
              </text>
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function EnrollChart({ data, sites, siteIds, totalTarget }) {
  const [mode, setMode] = useState('combined'); // 'combined' | 'stacked' | 'persite'
  if (!data || data.length === 0) return <div className="empty">Chưa có dữ liệu tuyển bệnh</div>;

  let cum = 0;
  const enriched = data.map(m => { cum += m.count; return { ...m, cum }; });
  const ids = siteIds || [];

  const tabs = [
    { k:'combined', label:'Tổng hợp' },
    { k:'stacked',  label:'Theo site (xếp chồng)' },
    { k:'persite',  label:'Từng site' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setMode(t.k)} style={{
            padding:'4px 12px', borderRadius:16, fontSize:12, fontWeight:600, cursor:'pointer',
            border:'1.5px solid ' + (mode === t.k ? '#1a73e8' : 'var(--border)'),
            background: mode === t.k ? '#1a73e8' : 'var(--surface)',
            color: mode === t.k ? '#fff' : 'var(--text)', transition:'all .15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:8, fontSize:11, color:'var(--muted)' }}>
        {mode === 'stacked'
          ? ids.map(sid => (
              <span key={sid} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:10, height:10, background: SITE_COLOR[sid], borderRadius:2, display:'inline-block' }}/>
                {sid}
              </span>
            ))
          : <>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:12, height:12, background:'#1a73e8', borderRadius:2, display:'inline-block' }}/> BN mới/tháng
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#f39c12" strokeWidth="2.5"/><circle cx="11" cy="5" r="3" fill="#f39c12"/></svg>
                Lũy kế thực tế
              </span>
              {totalTarget > 0 && (
                <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#d32f2f" strokeWidth="1.5" strokeDasharray="6,3"/></svg>
                  Lũy kế kế hoạch
                </span>
              )}
            </>
        }
      </div>

      {mode === 'persite'
        ? <SiteSparklines data={data} siteIds={ids} />
        : <SvgChart enriched={enriched} siteIds={ids} mode={mode} totalTarget={totalTarget} />
      }
    </div>
  );
}

export default function NewlineDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [setupBusy, setSetupBusy] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const isAdmin = user && (user.role === 'admin');

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const d = await apiGet('nlDashboard');
      setData(d);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSetup = async () => {
    if (!window.confirm('Tạo sheet NL_Sites và NL_Patients trong Google Sheets?')) return;
    setSetupBusy(true);
    try {
      await apiPost('nlSetupSheets', {});
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSetupBusy(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <div className="skeleton" style={{ width:160, height:28, borderRadius:6 }} />
        <div className="skeleton" style={{ width:80, height:20, borderRadius:4 }} />
      </div>
      <div className="stats-row" style={{ marginBottom:24 }}>
        {[1,2,3,4,5].map(i => <div key={i} className="stat-card skeleton" style={{ height:72 }} />)}
      </div>
      <div className="nl-site-grid">
        {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="skeleton" style={{ height:90, borderRadius:8 }} />)}
      </div>
      <div style={{ marginTop:12, color:'var(--muted)', fontSize:12, textAlign:'center' }}>
        Đang kết nối Google Sheets… (lần đầu có thể mất 5–10 giây)
      </div>
    </div>
  );

  if (err) return (
    <div style={{ padding: 24 }}>
      <div className="alert-banner" style={{ background: '#fff3cd', borderColor: '#ffc107' }}>
        <b>Lỗi:</b> {err}
        {err.includes('NL_') && user.role === 'admin' && (
          <button className="btn-sm" style={{ marginLeft: 12 }} onClick={handleSetup} disabled={setupBusy}>
            {setupBusy ? 'Đang tạo…' : '⚙️ Tạo sheet NEWLINE'}
          </button>
        )}
      </div>
    </div>
  );

  const { sites = [], patients_total = 0, completed_total = 0, overdue_total = 0,
          upcoming_total = 0, alerts = [], enroll_by_month = [],
          site_ids = [], total_target = 0 } = data || {};

  const redAlerts = alerts.filter(a => a.level === 'red');
  const orangeAlerts = alerts.filter(a => a.level === 'orange');

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            <span style={{ color: '#0f5132', marginRight: 8 }}>🏥</span>NEWLINE
          </h1>
          <div className="muted" style={{ marginTop: 4 }}>Nghiên cứu đa trung tâm · 10 site · Kết cục mRS 3 tháng</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="#/newline/patients">
            <button className="btn-sm primary">📋 Danh sách BN</button>
          </a>
          <button className="btn-sm" onClick={load}>↻ Làm mới</button>
        </div>
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="nl-alert-banner">
          {redAlerts.length > 0 && (
            <div className="nl-alert-section red">
              <b>🔴 Quá hạn đánh giá ({redAlerts.length} BN)</b>
              {redAlerts.map((a, i) => (
                <div key={i} className="nl-alert-item">
                  <a href="#/newline/patients">{a.patient_id}</a> — hạn {fmtVN(a.due_date)}
                </div>
              ))}
            </div>
          )}
          {orangeAlerts.length > 0 && (
            <div className="nl-alert-section orange">
              <b>🟠 Sắp đến hạn ({orangeAlerts.length} BN trong 7 ngày tới)</b>
              {orangeAlerts.map((a, i) => (
                <div key={i} className="nl-alert-item">
                  <a href="#/newline/patients">{a.patient_id}</a> — hạn {fmtVN(a.due_date)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <StatCard label="Tổng BN thu tuyển" value={patients_total} color="#1a73e8" />
        <StatCard label="Đã có kết cục 3T" value={completed_total}
          sub={patients_total > 0 ? Math.round(completed_total / patients_total * 100) + '%' : '—'}
          color="#0f9688" />
        <StatCard label="Quá hạn đánh giá" value={overdue_total} color={overdue_total > 0 ? '#d32f2f' : '#aaa'} />
        <StatCard label="Sắp đến hạn (≤7 ngày)" value={upcoming_total} color={upcoming_total > 0 ? '#e67e22' : '#aaa'} />
        <StatCard label="Site đang Recruiting"
          value={sites.filter(s => s.status === 'Recruiting').length}
          sub={'/ 10 site'} color="#7b5ea7" />
      </div>

      {/* Site grid */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="section-title">Tình hình tuyển bệnh theo site</h2>
        <div className="nl-site-grid">
          {SITES_META.map(meta => {
            const s = sites.find(x => x.site_id === meta.site_id) || { ...meta, enrolled: 0, completed_outcome: 0, overdue_outcome: 0, upcoming_outcome: 0 };
            return (
              <SiteCard key={meta.site_id} site={s}
                canEdit={isAdmin}
                onEdit={() => setEditingSite(s)}
                onClick={() => { window.location.hash = '#/newline/patients?site=' + meta.site_id; }} />
            );
          })}
        </div>

        {editingSite && (
          <SiteEditModal
            site={editingSite}
            onClose={() => setEditingSite(null)}
            onSaved={() => { setEditingSite(null); load(); }}
          />
        )}
      </div>

      {/* Enrollment chart */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>Tốc độ tuyển bệnh — NEWLINE (từ 08/2026)</div>
          {enroll_by_month.length > 0 && (() => {
            const recent = enroll_by_month.slice(-2);
            const avg = patients_total / Math.max(enroll_by_month.length, 1);
            return (
              <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--muted)' }}>
                <span>TB: <b style={{ color:'var(--text)' }}>{avg.toFixed(1)} BN/tháng</b></span>
                {recent.length >= 2 && recent[1].count > recent[0].count && (
                  <span style={{ color:'#188038' }}>↑ Tăng tốc</span>
                )}
                {recent.length >= 2 && recent[1].count < recent[0].count && (
                  <span style={{ color:'#d32f2f' }}>↓ Chậm lại</span>
                )}
              </div>
            );
          })()}
        </div>
        <EnrollChart data={enroll_by_month} sites={sites}
          siteIds={site_ids.length > 0 ? site_ids : sites.map(s => s.site_id)}
          totalTarget={total_target} />
      </div>

      {/* Projection chart */}
      <ProjectionSection
        enrollByMonth={enroll_by_month}
        patientsTotal={patients_total}
        total_target={total_target}
      />
    </div>
  );
}
