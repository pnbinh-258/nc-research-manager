import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api.js';

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

function SiteCard({ site, onClick }) {
  const meta = SITES_META.find(m => m.site_id === site.site_id) || {};
  const color = SITE_COLOR[site.site_id] || '#888';
  const target = Number(site.target_enrollment) || 0;
  const pct = target > 0 ? Math.min(100, Math.round(site.enrolled / target * 100)) : null;
  const isRecruiting = site.status === 'Recruiting';

  return (
    <div className="nl-site-card" style={{ borderLeft: `4px solid ${color}` }} onClick={onClick}>
      <div className="nl-site-header">
        <div>
          <div className="nl-site-name">{meta.site_name || site.site_id}</div>
          <div className="nl-site-city">{meta.city}</div>
        </div>
        <div className={`nl-site-badge ${isRecruiting ? 'recruiting' : 'not-recruiting'}`}>
          {isRecruiting ? 'Recruiting' : 'Chưa mở'}
        </div>
      </div>
      <div className="nl-site-stats">
        <span className="nl-enrolled-num">{site.enrolled}</span>
        <span className="nl-enrolled-label"> BN</span>
        {site.overdue_outcome > 0 && (
          <span className="nl-badge-red" title="Quá hạn đánh giá">🔴 {site.overdue_outcome}</span>
        )}
        {site.upcoming_outcome > 0 && (
          <span className="nl-badge-orange" title="Sắp đến hạn">🟠 {site.upcoming_outcome}</span>
        )}
      </div>
      {pct !== null && (
        <div className="nl-progress-bar">
          <div className="nl-progress-fill" style={{ width: pct + '%', background: color }} />
        </div>
      )}
      {target > 0 && (
        <div className="nl-progress-label">{site.enrolled}/{target} ({pct}%)</div>
      )}
    </div>
  );
}

function EnrollChart({ data }) {
  const max = Math.max(...data.map(m => m.count), 1);
  return (
    <div className="css-chart" style={{ height: 100 }}>
      {data.map((m, i) => {
        const h = Math.round((m.count / max) * 72);
        return (
          <div key={i} className="css-bar-col" title={`${m.month}: ${m.count} BN`}>
            <div className="css-bar-count">{m.count > 0 ? m.count : ''}</div>
            <div className="css-bar-fill" style={{ height: Math.max(h, m.count > 0 ? 4 : 0) + 'px', background: '#1a73e8' }} />
            <div className="css-bar-label">{m.month.split('/')[0]}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function NewlineDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [setupBusy, setSetupBusy] = useState(false);

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

  if (loading) return <div className="empty">Đang tải dữ liệu NEWLINE…</div>;

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
          upcoming_total = 0, alerts = [], enroll_by_month = [] } = data || {};

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
                  <a href="#/newline/patients">{a.patient_id}</a> — hạn {a.due_date}
                </div>
              ))}
            </div>
          )}
          {orangeAlerts.length > 0 && (
            <div className="nl-alert-section orange">
              <b>🟠 Sắp đến hạn ({orangeAlerts.length} BN trong 7 ngày tới)</b>
              {orangeAlerts.map((a, i) => (
                <div key={i} className="nl-alert-item">
                  <a href="#/newline/patients">{a.patient_id}</a> — hạn {a.due_date}
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
                onClick={() => { window.location.hash = '#/newline/patients?site=' + meta.site_id; }} />
            );
          })}
        </div>
      </div>

      {/* Enrollment chart */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Tốc độ tuyển bệnh (6 tháng gần nhất)</div>
        <EnrollChart data={enroll_by_month} />
      </div>
    </div>
  );
}
