import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../api.js';
import { ErrorBox, Field } from '../ui.jsx';

const SITES_META = [
  { site_id: 'ND115', site_name: 'Nhân Dân 115'     },
  { site_id: 'TNH',   site_name: 'Thống Nhất'        },
  { site_id: 'QY175', site_name: 'Quân Y 175'        },
  { site_id: 'DNA',   site_name: 'Đà Nẵng'           },
  { site_id: 'VTI',   site_name: 'Việt Tiệp'         },
  { site_id: 'YHN',   site_name: 'Y Hà Nội'          },
  { site_id: 'QY103', site_name: 'Quân Y 103'        },
  { site_id: 'CTH',   site_name: 'ĐKTW Cần Thơ'      },
  { site_id: 'UHU',   site_name: 'Trung Ương Huế'    },
  { site_id: 'CDO',   site_name: 'Châu Đốc'          },
];

const MRS_LABELS = {
  '0': '0 — Không triệu chứng',
  '1': '1 — Không khuyết tật đáng kể',
  '2': '2 — Khuyết tật nhẹ',
  '3': '3 — Khuyết tật vừa',
  '4': '4 — Khuyết tật vừa-nặng',
  '5': '5 — Khuyết tật nặng',
  '6': '6 — Tử vong',
};

const MRS_COLOR = (v) => {
  const n = parseInt(v);
  if (isNaN(n)) return '#aaa';
  if (n <= 1) return '#2e7d32';
  if (n <= 3) return '#f57c00';
  return '#c62828';
};

const FOLLOW_STATUS = {
  completed: { label: 'Đã đánh giá', cls: 'nl-status-completed' },
  overdue:   { label: 'Quá hạn',     cls: 'nl-status-overdue'   },
  upcoming:  { label: 'Sắp đến hạn', cls: 'nl-status-upcoming'  },
  pending:   { label: 'Chờ',         cls: 'nl-status-pending'    },
};

function getSiteInitialFromHash() {
  const h = window.location.hash;
  const m = h.match(/[?&]site=([A-Z0-9]+)/);
  return m ? m[1] : 'ALL';
}

function PatientForm({ initial = {}, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState({
    site_id:         initial.site_id || '',
    enrollment_date: initial.enrollment_date || '',
    age:             initial.age || '',
    sex:             initial.sex || 'Nam',
    diagnosis:       initial.diagnosis || '',
    mrs_baseline:    initial.mrs_baseline !== undefined && initial.mrs_baseline !== '' ? String(initial.mrs_baseline) : '',
    mrs_3m:          initial.mrs_3m !== undefined && initial.mrs_3m !== '' ? String(initial.mrs_3m) : '',
    outcome_date:    initial.outcome_date || '',
    notes:           initial.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.site_id) { setErr('Chọn site'); return; }
    if (!form.enrollment_date) { setErr('Nhập ngày thu tuyển'); return; }
    setBusy(true); setErr('');
    try {
      const payload = { ...form };
      if (isEdit) payload.patient_id = initial.patient_id;
      await onSave(payload);
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Cập nhật bệnh nhân' : 'Thêm bệnh nhân NEWLINE'}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <ErrorBox error={err} />
        <form onSubmit={submit}>
          {!isEdit && (
            <Field label="Site *">
              <select value={form.site_id} onChange={e => set('site_id', e.target.value)} required>
                <option value="">— Chọn site —</option>
                {SITES_META.map(s => (
                  <option key={s.site_id} value={s.site_id}>{s.site_id} — {s.site_name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Ngày thu tuyển *">
            <input type="date" value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} required />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Tuổi">
              <input type="number" min={0} max={120} value={form.age} onChange={e => set('age', e.target.value)} placeholder="VD: 65" />
            </Field>
            <Field label="Giới tính">
              <select value={form.sex} onChange={e => set('sex', e.target.value)}>
                <option>Nam</option>
                <option>Nữ</option>
              </select>
            </Field>
          </div>
          <Field label="Chẩn đoán / Ghi chú lâm sàng">
            <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="VD: Nhồi máu não MCA phải" />
          </Field>
          <Field label="mRS lúc nhập viện (baseline)">
            <select value={form.mrs_baseline} onChange={e => set('mrs_baseline', e.target.value)}>
              <option value="">— Chưa đánh giá —</option>
              {Object.entries(MRS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>

          {isEdit && (
            <>
              <hr style={{ margin: '12px 0', borderColor: 'var(--border)' }} />
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--primary)' }}>Kết cục 3 tháng</div>
              <Field label="mRS 3 tháng">
                <select value={form.mrs_3m} onChange={e => set('mrs_3m', e.target.value)}>
                  <option value="">— Chưa đánh giá —</option>
                  {Object.entries(MRS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Ngày đánh giá 3 tháng">
                <input type="date" value={form.outcome_date} onChange={e => set('outcome_date', e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Ghi chú">
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Ghi chú thêm…" />
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn-sm" onClick={onCancel}>Huỷ</button>
            <button type="submit" className="btn-sm primary" disabled={busy} style={{ flex: 1 }}>
              {busy ? 'Đang lưu…' : isEdit ? 'Cập nhật' : 'Thêm bệnh nhân'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewlinePatients({ user }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [siteFilter, setSiteFilter] = useState(getSiteInitialFromHash);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const list = await apiGet('nlListPatients');
      setPatients(list);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data) => {
    await apiPost('nlAddPatient', data);
    setShowForm(false);
    await load();
  };

  const handleEdit = async (data) => {
    await apiPost('nlUpdatePatient', data);
    setEditing(null);
    await load();
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Xoá bệnh nhân ${p.patient_id}?\nThao tác này không thể hoàn tác.`)) return;
    try {
      await apiPost('nlDeletePatient', { patient_id: p.patient_id });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const canWrite = user.role === 'admin' || user.role === 'investigator';

  // Filter
  let filtered = patients;
  if (siteFilter !== 'ALL') filtered = filtered.filter(p => p.site_id === siteFilter);
  if (statusFilter !== 'ALL') filtered = filtered.filter(p => p.follow_status === statusFilter);

  // Count per status
  const counts = { overdue: 0, upcoming: 0, completed: 0, pending: 0 };
  patients.forEach(p => { if (counts[p.follow_status] !== undefined) counts[p.follow_status]++; });
  const siteCounts = {};
  patients.forEach(p => { siteCounts[p.site_id] = (siteCounts[p.site_id] || 0) + 1; });

  const siteName = (id) => SITES_META.find(s => s.site_id === id)?.site_name || id;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            <a href="#/newline" style={{ color: '#0f5132', textDecoration: 'none' }}>NEWLINE</a>
            {' '}/ Bệnh nhân
          </h1>
          <div className="muted">{patients.length} bệnh nhân · {Object.keys(siteCounts).length} site</div>
        </div>
        {canWrite && (
          <button className="btn-sm primary" onClick={() => setShowForm(true)}>+ Thêm BN</button>
        )}
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { key: 'ALL',       label: `Tất cả (${patients.length})` },
          { key: 'overdue',   label: `🔴 Quá hạn (${counts.overdue})` },
          { key: 'upcoming',  label: `🟠 Sắp hạn (${counts.upcoming})` },
          { key: 'completed', label: `✅ Đã đánh giá (${counts.completed})` },
          { key: 'pending',   label: `⏳ Chờ (${counts.pending})` },
        ].map(opt => (
          <button key={opt.key}
            className={`filter-chip ${statusFilter === opt.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(opt.key)}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Site filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className={`nl-site-tab ${siteFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setSiteFilter('ALL')}>Tất cả site</button>
        {SITES_META.map(s => (
          <button key={s.site_id}
            className={`nl-site-tab ${siteFilter === s.site_id ? 'active' : ''}`}
            onClick={() => setSiteFilter(s.site_id)}>
            {s.site_id}
            {siteCounts[s.site_id] ? <span className="nl-tab-count">{siteCounts[s.site_id]}</span> : null}
          </button>
        ))}
      </div>

      {err && <div className="alert-banner" style={{ background: '#fff3cd' }}>{err}</div>}

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã BN</th>
              <th>Site</th>
              <th>Ngày thu tuyển</th>
              <th>Hạn đánh giá 3T</th>
              <th>Tuổi / Giới</th>
              <th>mRS nhập viện</th>
              <th>mRS 3 tháng</th>
              <th>Trạng thái</th>
              {canWrite && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canWrite ? 9 : 8} className="empty">Đang tải…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={canWrite ? 9 : 8} className="empty">Không có bệnh nhân</td></tr>
            ) : filtered.map(p => {
              const st = FOLLOW_STATUS[p.follow_status] || FOLLOW_STATUS.pending;
              const rowCls = p.follow_status === 'overdue' ? 'nl-row-overdue'
                : p.follow_status === 'upcoming' ? 'nl-row-upcoming'
                : p.follow_status === 'completed' ? 'nl-row-completed' : '';
              return (
                <tr key={p.patient_id} className={rowCls}>
                  <td><code style={{ fontSize: 12 }}>{p.patient_id}</code></td>
                  <td><span className="nl-site-pill">{p.site_id}</span></td>
                  <td>{p.enrollment_date || '—'}</td>
                  <td>{p.due_date_3m || '—'}</td>
                  <td>{p.age ? `${p.age}t` : '—'} / {p.sex || '—'}</td>
                  <td>
                    {p.mrs_baseline !== '' && p.mrs_baseline !== undefined && p.mrs_baseline !== null ? (
                      <span className="nl-mrs-badge" style={{ background: MRS_COLOR(p.mrs_baseline) }}>
                        mRS {p.mrs_baseline}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {p.mrs_3m !== '' && p.mrs_3m !== undefined && p.mrs_3m !== null ? (
                      <span className="nl-mrs-badge" style={{ background: MRS_COLOR(p.mrs_3m) }}>
                        mRS {p.mrs_3m}
                      </span>
                    ) : '—'}
                  </td>
                  <td><span className={`nl-follow-status ${st.cls}`}>{st.label}</span></td>
                  {canWrite && (
                    <td>
                      <button className="btn-icon" title="Sửa / Nhập kết cục"
                        onClick={() => setEditing(p)}>✏️</button>
                      {user.role === 'admin' && (
                        <button className="btn-icon danger" title="Xoá"
                          onClick={() => handleDelete(p)}>🗑</button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PatientForm onSave={handleAdd} onCancel={() => setShowForm(false)} isEdit={false} />
      )}
      {editing && (
        <PatientForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} isEdit={true} />
      )}
    </div>
  );
}
