import React, { useEffect, useState } from 'react';
import { apiGet, exportCSV } from '../api.js';
import { Badge, ErrorBox, Spinner, fmtDate, daysUntil, TYPE_LABELS } from '../ui.jsx';
import { StudyForm } from './Studies.jsx';

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

function fmtActivity(item) {
  let detail = {};
  try { detail = JSON.parse(item.detail); } catch {}
  switch (item.action) {
    case 'addPatient':    return { icon: '👤', cls: 'act-green',  text: `Enroll BN mới — ${detail.patient_code || ''} vào ${item.study_id}` };
    case 'updatePatient': return detail.status === 'Withdrawn'
      ? { icon: '⚠️', cls: 'act-red',   text: `BN rút lui — ${detail.patient_code || ''} (${detail.withdrawal_reason || ''})` }
      : { icon: '✏️', cls: 'act-blue',  text: `Cập nhật BN ${detail.patient_code || ''} → ${detail.status || ''}` };
    case 'addDocument':   return { icon: '📁', cls: 'act-blue',  text: `Upload tài liệu — ${detail.doc_type || ''} ${detail.version || ''} cho ${item.study_id}` };
    case 'updateMilestone': return detail.status === 'Done'
      ? { icon: '✅', cls: 'act-green', text: `Milestone hoàn thành — ${detail.milestone_name || ''}` }
      : { icon: '✏️', cls: 'act-blue',  text: `Cập nhật milestone — ${detail.milestone_name || ''}` };
    case 'addStudy':      return { icon: '🔬', cls: 'act-teal',  text: `Thêm nghiên cứu — ${detail.title || item.study_id}` };
    case 'addMilestone':  return { icon: '📋', cls: 'act-orange',text: `Thêm milestone — ${detail.milestone_name || ''} (${item.study_id})` };
    default:              return { icon: '📝', cls: 'act-muted', text: `${item.action} — ${item.study_id || ''}` };
  }
}

const TYPE_BORDER = { RCT_sponsor: '#1a73e8', RCT_investigator: '#534ab7', Observational: '#0f9688' };
const TYPE_KEYS   = [['all','Tất cả'], ['RCT_sponsor','RCT Sponsor'], ['RCT_investigator','RCT Khoa'], ['Observational','Quan sát']];

// ─── sub-components ───────────────────────────────────────────────────────────

function AlertBanner({ alerts }) {
  const red = alerts.filter(a => a.level === 'red').length;
  const yellow = alerts.filter(a => a.level === 'yellow').length;
  const orange = alerts.filter(a => a.level === 'orange').length;
  if (!alerts.length) return null;
  const parts = [];
  if (red)    parts.push(`${red} IRB/tài liệu hết hạn`);
  if (yellow) parts.push(`${yellow} milestone trễ hạn`);
  if (orange) parts.push(`${orange} NC enrollment thấp`);
  return (
    <div className="alert-banner">
      <div className="alert-banner-left">
        <span style={{ fontSize: 16, marginRight: 8 }}>⚠</span>
        <span><b>{alerts.length} vấn đề cần xử lý:</b> {parts.join(', ')}</span>
      </div>
      <div className="alert-banner-chips">
        {red    > 0 && <span className="alert-chip red">🔴 IRB: {red}</span>}
        {yellow > 0 && <span className="alert-chip yellow">🟡 Milestone trễ</span>}
        {orange > 0 && <span className="alert-chip orange">🟠 Enrollment thấp</span>}
      </div>
    </div>
  );
}

function StatsRow({ studies, stats }) {
  const sc  = stats.status_counts || {};
  const sub = Object.entries(sc).map(([k,v]) => `${v} ${k}`).join(' · ') || '—';
  const pct = stats.target_total > 0 ? Math.round(stats.enrolled_total / stats.target_total * 100) : 0;
  return (
    <div className="stats-row">
      {[
        { icon:'🔬', label:'NGHIÊN CỨU',          value: studies.length,         sub },
        { icon:'👥', label:'TỔNG BN ENROLLED',     value: stats.enrolled_total,   sub: stats.enrolled_this_month > 0 ? `↑ +${stats.enrolled_this_month} tháng này` : '—' },
        { icon:'🎯', label:'ENROLLMENT TỔNG',       value: pct + '%',              sub: `${stats.enrolled_total}/${stats.target_total||'?'} BN mục tiêu` },
        { icon:'📅', label:'MILESTONES THÁNG NÀY',  value: stats.milestones_this_month, sub: stats.milestones_overdue > 0 ? `${stats.milestones_overdue} overdue · ${stats.milestones_this_month} upcoming` : `${stats.milestones_this_month} upcoming`, redSub: stats.milestones_overdue > 0 },
        { icon:'📁', label:'TÀI LIỆU CẦN GIA HẠN', value: stats.docs_expiring,    sub: stats.docs_expiring > 0 ? 'Trong 30 ngày tới' : 'Không có', redVal: stats.docs_expiring > 0 },
      ].map((s, i) => (
        <div key={i} className="stat-card">
          <div className="stat-icon">{s.icon}</div>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value" style={s.redVal ? {color:'var(--red)'} : {}}>{s.value}</div>
          <div className="stat-sub" style={s.redSub ? {color:'var(--red)'} : {}}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

function StudyCard({ study, milestones }) {
  const enrolled = study.enrolled_n || 0;
  const target   = Number(study.target_n) || 0;
  const pct      = target > 0 ? Math.min(100, Math.round(enrolled / target * 100)) : 0;
  const irbDays  = daysUntil(study.irb_expiry);
  const irbColor = irbDays !== null && irbDays < 30 ? 'var(--red)' : irbDays !== null && irbDays < 90 ? 'var(--orange)' : 'var(--green)';
  const irbIcon  = irbDays !== null && irbDays < 0 ? '✗ ' : irbDays !== null && irbDays < 30 ? '⚠️ ' : '✓ ';
  const studyMs  = milestones.filter(m => m.study_id === study.study_id);
  const showMs   = studyMs.slice(0, 5);

  return (
    <a href={`#/studies/${study.study_id}`} className="study-card-link">
      <div className="study-card" style={{ borderLeftColor: TYPE_BORDER[study.type] || '#9e9e9e' }}>
        <div className="study-card-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="study-card-title">{study.title}</div>
            <div className="study-card-meta">
              {study.sponsor && <span>Sponsor: <b>{study.sponsor}</b></span>}
              <span>PI: {study.pi_name}</span>
              {study.phase && study.phase !== 'N/A' && <span>Phase: {study.phase}</span>}
              {study.irb_expiry && (
                <span style={{ color: irbColor, fontWeight: 600 }}>
                  IRB: {irbIcon}{irbDays !== null && irbDays >= 0 ? `Đến ${study.irb_expiry?.slice(0,7)}` : 'Đã hết hạn'}
                </span>
              )}
            </div>
          </div>
          <div className="study-card-badges">
            <Badge value={study.type} label={TYPE_LABELS[study.type]} />
            <Badge value={study.status} />
          </div>
        </div>

        <div className="study-card-enroll">
          <div className="enroll-bar-row">
            <div className="progress" style={{ flex: 1 }}><div style={{ width: pct + '%', background: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--orange)' : '#1a73e8' }} /></div>
            <span className="enroll-pct">{pct}%</span>
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>Enrollment: {enrolled}/{target || '?'} BN</div>
        </div>

        {showMs.length > 0 && (
          <div className="ms-chips">
            {showMs.map((m, i) => {
              const cls  = m.status === 'Done' ? 'done' : m.status === 'Overdue' ? 'overdue' : 'pending';
              const icon = m.status === 'Done' ? '✓' : m.status === 'Overdue' ? '✗' : '◷';
              return <span key={i} className={`ms-chip ${cls}`}>{icon} {m.milestone_name}</span>;
            })}
            {study.expected_end && (
              <span className="muted" style={{ fontSize: 11, marginLeft: 'auto', alignSelf: 'center' }}>
                Kết thúc dự kiến: {study.expected_end?.slice(0, 7)}
              </span>
            )}
          </div>
        )}
      </div>
    </a>
  );
}

function DocDeadlinesWidget({ docDeadlines, studies }) {
  const name = sid => (studies.find(s => s.study_id === sid) || {}).title || sid;
  return (
    <div className="widget">
      <div className="widget-title">📋 Cảnh báo hạn tài liệu</div>
      {!docDeadlines.length
        ? <div className="empty" style={{ padding:'10px 0',fontSize:12 }}>Không có tài liệu sắp hết hạn</div>
        : docDeadlines.map((d, i) => {
            const days = daysUntil(d.expiry_date);
            const cls  = days !== null && days <= 0 ? 'urgent' : days < 30 ? 'urgent' : days < 60 ? 'soon' : 'ok';
            return (
              <div key={i} className="deadline-item">
                <div>
                  <div style={{ fontWeight:600, fontSize:12.5 }}>{name(d.study_id)} — {d.doc_type}</div>
                  <div className="muted">Hết hạn: {fmtDate(d.expiry_date)}</div>
                </div>
                <span className={`deadline-days ${cls}`}>{days === null ? '—' : days <= 0 ? 'Đã hết' : `${days} ngày`}</span>
              </div>
            );
          })
      }
    </div>
  );
}

function EnrollChartWidget({ enrollByMonth }) {
  const year  = enrollByMonth[enrollByMonth.length - 1]?.month?.split('/')[1] || new Date().getFullYear();
  const total = enrollByMonth.reduce((s, m) => s + (m.count || 0), 0);
  const max   = Math.max(...enrollByMonth.map(m => m.count), 1);
  return (
    <div className="widget">
      <div className="widget-title">📊 Enrollment theo tháng ({year})</div>
      <div className="css-chart">
        {enrollByMonth.map((m, i) => {
          const h = Math.round((m.count / max) * 72);
          return (
            <div key={i} className="css-bar-col" title={`${m.month}: ${m.count} BN`}>
              <div className="css-bar-count">{m.count > 0 ? m.count : ''}</div>
              <div className="css-bar-fill" style={{ height: Math.max(h, m.count > 0 ? 4 : 0) + 'px' }} />
              <div className="css-bar-label">{m.month.split('/')[0]}</div>
            </div>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize:11.5, marginTop:4 }}>Tổng YTD: {total} BN</div>
    </div>
  );
}

function UpcomingMsWidget({ milestones, studies }) {
  const name = sid => (studies.find(s => s.study_id === sid) || {}).title || sid;
  return (
    <div className="widget">
      <div className="widget-title">🚀 Milestones sắp tới</div>
      {!milestones.length
        ? <div className="empty" style={{ padding:'10px 0',fontSize:12 }}>Không có milestone sắp tới</div>
        : milestones.map((m, i) => {
            const d = m.planned_date ? new Date(m.planned_date) : null;
            const days = daysUntil(m.planned_date);
            const cls = m.status === 'Overdue' ? 'ms-tag overdue' : days !== null && days <= 7 ? 'ms-tag urgent' : 'ms-tag upcoming';
            const lbl = m.status === 'Overdue' ? 'Trễ' : days !== null && days <= 7 ? 'Gấp' : 'Sắp tới';
            return (
              <div key={i} className="ms-upcoming-item">
                {d && (
                  <div className="ms-date-box">
                    <div className="ms-day">{d.getDate()}</div>
                    <div className="ms-mon">T{d.getMonth()+1}</div>
                  </div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.milestone_name}</div>
                  <div className="muted">{name(m.study_id)}</div>
                </div>
                <span className={cls}>{lbl}</span>
              </div>
            );
          })
      }
    </div>
  );
}

function GanttTimeline({ studies }) {
  const year   = new Date().getFullYear();
  const y0     = new Date(year, 0, 1).getTime();
  const yDur   = 365.25 * 86400000;
  const months = Array.from({ length:12 }, (_, i) => `T${i+1}`);
  const colors = { RCT_sponsor:'#1a73e8', RCT_investigator:'#534ab7', Observational:'#0f9688', Planning:'#9e9e9e' };

  const rows = studies.filter(s => s.start_date && s.expected_end).map(s => {
    const s0 = Math.max(new Date(s.start_date).getTime(), y0);
    const s1 = Math.min(new Date(s.expected_end).getTime(), y0 + yDur);
    if (s1 <= s0) return null;
    return { study:s, left:((s0-y0)/yDur*100).toFixed(1), width:((s1-s0)/yDur*100).toFixed(1), color: colors[s.status === 'Planning' ? 'Planning' : s.type] || '#9e9e9e' };
  }).filter(Boolean);

  if (!rows.length) return null;

  return (
    <div className="widget gantt-widget">
      <div className="widget-title">📅 Timeline nghiên cứu ({year})</div>
      <div className="gantt-months">{months.map(m => <div key={m} className="gantt-month-lbl">{m}</div>)}</div>
      {rows.map(({ study, left, width, color }) => (
        <div key={study.study_id} className="gantt-row-wrap">
          <div className="gantt-name" title={study.title}>{study.title.length > 18 ? study.title.slice(0,18)+'…' : study.title}</div>
          <div className="gantt-track">
            <div className="gantt-bar-inner" style={{ left:left+'%', width:width+'%', background:color }}>
              {Number(width) > 14 ? (TYPE_LABELS[study.type] || '') : ''}
            </div>
          </div>
        </div>
      ))}
      <div className="gantt-legend">
        {Object.entries(TYPE_LABELS).map(([k,v]) => (
          <span key={k} className="gantt-legend-item"><span className="gantt-dot" style={{ background:colors[k] }} />{v}</span>
        ))}
        <span className="gantt-legend-item"><span className="gantt-dot" style={{ background:'#9e9e9e' }} />Planning</span>
      </div>
    </div>
  );
}

function ActivityFeed({ activities }) {
  return (
    <div className="widget">
      <div className="widget-title">⚡ Hoạt động gần đây</div>
      {!activities.length
        ? <div className="empty" style={{ padding:'10px 0',fontSize:12 }}>Chưa có hoạt động.</div>
        : activities.map((item, i) => {
            const { icon, cls, text } = fmtActivity(item);
            return (
              <div key={i} className="activity-item">
                <div className={`activity-icon ${cls}`}>{icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, lineHeight:1.4 }}>{text}</div>
                  <div className="muted" style={{ fontSize:11 }}>
                    {timeAgo(item.timestamp)}{item.user_email ? ' · ' + item.user_email.split('@')[0] : ''}
                  </div>
                </div>
              </div>
            );
          })
      }
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function Dashboard({ user }) {
  const [data, setData]           = useState(null);
  const [error, setError]         = useState('');
  const [typeFilter, setFilter]   = useState('all');
  const [addStudy, setAddStudy]   = useState(false);

  const load = () => apiGet('dashboard').then(setData).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  if (error) return <ErrorBox error={error} />;
  if (!data)  return <Spinner />;

  const { studies, alerts, stats, all_milestones, upcoming_milestones, doc_deadlines, recent_activity, enroll_by_month } = data;
  const filtered = typeFilter === 'all' ? studies : studies.filter(s => s.type === typeFilter);

  const exportReport = () => exportCSV(
    'bao-cao-' + new Date().toISOString().slice(0,10) + '.csv',
    ['study_id','title','type','status','pi_name','enrolled_n','target_n','irb_expiry'],
    studies
  );

  return (
    <div>
      {/* Topbar */}
      <div className="dash-topbar">
        <div>
          <h1 style={{ marginBottom:2 }}>Dashboard tổng quan</h1>
          <div className="muted">Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}</div>
        </div>
        <div className="row">
          <button onClick={exportReport}>⬇ Xuất báo cáo</button>
          {user.role === 'admin' && (
            <button className="primary" onClick={() => setAddStudy(true)}>+ Thêm nghiên cứu</button>
          )}
        </div>
      </div>

      <AlertBanner alerts={alerts} />
      <StatsRow studies={studies} stats={stats} />

      {/* Filter + 2-col layout */}
      <div className="type-filter-row">
        <span style={{ fontWeight:600, fontSize:13 }}>Danh sách nghiên cứu</span>
        <div className="type-filter-chips">
          {TYPE_KEYS.map(([k, label]) => (
            <button key={k} className={`type-chip${typeFilter===k?' active':''}`} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="dash-cols">
        <div className="dash-left">
          {filtered.map(s => <StudyCard key={s.study_id} study={s} milestones={all_milestones || []} />)}
          {filtered.length === 0 && <div className="empty">Không có nghiên cứu nào.</div>}
        </div>
        <div className="dash-right">
          <DocDeadlinesWidget docDeadlines={doc_deadlines || []} studies={studies} />
          <EnrollChartWidget enrollByMonth={enroll_by_month || []} />
          <UpcomingMsWidget milestones={upcoming_milestones || []} studies={studies} />
        </div>
      </div>

      <div className="dash-bottom">
        <GanttTimeline studies={studies} />
        <ActivityFeed activities={recent_activity || []} />
      </div>

      {addStudy && (
        <StudyForm initial={null} onClose={() => setAddStudy(false)} onSaved={() => { setAddStudy(false); load(); }} />
      )}
    </div>
  );
}
