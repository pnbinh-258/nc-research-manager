import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../api.js';
import { Modal, Field, ErrorBox } from '../ui.jsx';

// yyyy-mm-dd ↔ dd/mm/yyyy
function fmtVN(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return (d && m && y) ? `${d}/${m}/${y}` : iso;
}
function isoToVN(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return (d && m && y) ? `${d}/${m}/${y}` : iso;
}
function vnToISO(vn) {
  const p = vn.replace(/[^\d]/g, '');
  if (p.length === 8) return `${p.slice(4)}-${p.slice(2,4)}-${p.slice(0,2)}`;
  return '';
}

// Text input hiển thị dd/mm/yyyy, emit value dạng yyyy-mm-dd
function DateInput({ value, onChange, required, placeholder = 'dd/mm/yyyy' }) {
  const [text, setText] = React.useState(() => isoToVN(value));
  // Chỉ sync khi parent thay đổi từ bên ngoài (không phải do user gõ)
  const lastEmitted = React.useRef(value);
  React.useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(isoToVN(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^\d/]/g, '');
    const digits = raw.replace(/\//g, '');
    if (digits.length <= 2) raw = digits;
    else if (digits.length <= 4) raw = digits.slice(0,2) + '/' + digits.slice(2);
    else raw = digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4,8);
    setText(raw);
    if (raw === '') {
      lastEmitted.current = '';
      onChange('');
    } else {
      const iso = vnToISO(raw);
      if (iso) { lastEmitted.current = iso; onChange(iso); }
      // chưa đủ 8 số → không gọi onChange, user tiếp tục gõ
    }
  };

  return (
    <input type="text" value={text} onChange={handleChange}
      placeholder={placeholder} maxLength={10} required={required}
      style={{ fontFamily:'monospace', letterSpacing:'.05em' }} />
  );
}

const SITE_COLOR = {
  ND115:'#1a73e8', TNH:'#0f9688', QY175:'#7b5ea7',
  DNA:'#e67e22',   VTI:'#e74c3c', YHN:'#2ecc71',
  QY103:'#3498db', CTH:'#9b59b6', UHU:'#f39c12', CDO:'#1abc9c',
};

const SITES_META = [
  { site_id: 'ND115', site_name: 'Nhân Dân 115'     },
  { site_id: 'TNH',   site_name: 'Thống Nhất'        },
  { site_id: 'QY175', site_name: 'Quân Y 175'        },
  { site_id: 'DNA',   site_name: 'Đà Nẵng'           },
  { site_id: 'VTI',   site_name: 'Việt Tiệp'         },
  { site_id: 'YHN',   site_name: 'Y Hà Nội'          },
  { site_id: 'QY103', site_name: 'Quân Y 103'        },
  { site_id: 'CTH',   site_name: 'ĐKTW Cần Thơ'      },
  { site_id: 'UHU',   site_name: 'TW Huế'            },
  { site_id: 'CDO',   site_name: 'Châu Đốc'          },
];

const MRS_OPTIONS = [
  { v: '0', label: 'mRS 0 — Không triệu chứng' },
  { v: '1', label: 'mRS 1 — Không khuyết tật đáng kể' },
  { v: '2', label: 'mRS 2 — Khuyết tật nhẹ' },
  { v: '3', label: 'mRS 3 — Khuyết tật vừa' },
  { v: '4', label: 'mRS 4 — Khuyết tật vừa-nặng' },
  { v: '5', label: 'mRS 5 — Khuyết tật nặng' },
  { v: '6', label: 'mRS 6 — Tử vong' },
];

function mrsBg(v) {
  const n = parseInt(v);
  if (isNaN(n) || v === '') return null;
  if (n <= 1) return { bg: '#d4edda', color: '#155724' };
  if (n === 2) return { bg: '#fff3cd', color: '#856404' };
  if (n === 3) return { bg: '#ffe0b2', color: '#7d3c00' };
  if (n <= 5) return { bg: '#fde8e8', color: '#7b1a1a' };
  return { bg: '#3d3d3d', color: '#ffffff' }; // mRS 6
}

function MrsBadge({ v }) {
  if (v === '' || v === null || v === undefined) return <span style={{ color: '#aaa' }}>—</span>;
  const c = mrsBg(v);
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:10, fontSize:12,
      fontWeight:700, background: c?.bg, color: c?.color }}>
      mRS {v}
    </span>
  );
}

function FollowChip({ status }) {
  const cfg = {
    completed: { label: '✓ Đã đánh giá', bg: '#d4edda', color: '#155724' },
    overdue:   { label: '⚠ Quá hạn',    bg: '#fde8e8', color: '#7b1a1a' },
    upcoming:  { label: '⏰ Sắp hạn',   bg: '#fff3cd', color: '#856404' },
    pending:   { label: '· Chờ đánh giá',bg: '#f0f0f0', color: '#555'   },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span style={{ display:'inline-block', padding:'3px 9px', borderRadius:10,
      fontSize:11, fontWeight:600, background: c.bg, color: c.color, whiteSpace:'nowrap' }}>
      {c.label}
    </span>
  );
}

const EMPTY_FORM = {
  site_id:'', enrollment_date:'', sub_investigator:'', diagnosis:'',
  mrs_baseline:'', mrs_3m:'', outcome_date:'', outcome_notes:'',
};

function PatientForm({ initial, onSave, onClose, isEdit }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initial || {}),
    mrs_baseline: initial?.mrs_baseline != null ? String(initial.mrs_baseline) : '',
    mrs_3m:       initial?.mrs_3m       != null ? String(initial.mrs_3m)       : '',
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.site_id)         { setErr('Vui lòng chọn site'); return; }
    if (!form.enrollment_date) { setErr('Vui lòng nhập ngày thu tuyển'); return; }
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

  const title = isEdit
    ? `Cập nhật — ${initial?.patient_id || ''}`
    : 'Thêm bệnh nhân NEWLINE';

  return (
    <Modal title={title} onClose={onClose}>
      <ErrorBox error={err} />
      <form onSubmit={submit}>
        {/* Site */}
        <Field label="Site thu tuyển *">
          <select value={form.site_id} onChange={e => set('site_id', e.target.value)} required>
            <option value="">— Chọn site —</option>
            {SITES_META.map(s => (
              <option key={s.site_id} value={s.site_id}>{s.site_id} — {s.site_name}</option>
            ))}
          </select>
        </Field>

        {/* Enrollment info */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Ngày thu tuyển *">
            <DateInput value={form.enrollment_date}
              onChange={v => set('enrollment_date', v)} required />
          </Field>
          <Field label="BS phụ trách">
            <input value={form.sub_investigator}
              onChange={e => set('sub_investigator', e.target.value)}
              placeholder="BS. Nguyễn…" />
          </Field>
        </div>

        <Field label="Chẩn đoán">
          <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)}
            placeholder="VD: Nhồi máu não MCA, EVT thành công" />
        </Field>

        <Field label="mRS lúc nhập viện (baseline)">
          <select value={form.mrs_baseline} onChange={e => set('mrs_baseline', e.target.value)}>
            <option value="">— Chưa đánh giá —</option>
            {MRS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </Field>

        {/* 3-month outcome — always shown, required for edit */}
        <div style={{ borderTop:'1px solid var(--border)', margin:'16px 0 12px',
          paddingTop:12, fontWeight:600, fontSize:13, color:'var(--blue)' }}>
          Kết cục 3 tháng (mRS)
          {!isEdit && <span style={{ fontWeight:400, color:'var(--muted)', fontSize:11, marginLeft:6 }}>— có thể điền sau</span>}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="mRS 3 tháng">
            <select value={form.mrs_3m} onChange={e => set('mrs_3m', e.target.value)}>
              <option value="">— Chưa đánh giá —</option>
              {MRS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Ngày đánh giá">
            <DateInput value={form.outcome_date}
              onChange={v => set('outcome_date', v)} />
          </Field>
        </div>
        <Field label="Ghi chú kết cục">
          <input value={form.outcome_notes} onChange={e => set('outcome_notes', e.target.value)}
            placeholder="Ghi chú thêm về kết cục…" />
        </Field>

        <div style={{ display:'flex', gap:8, marginTop:20 }}>
          <button type="button" className="small" onClick={onClose} disabled={busy}>Huỷ</button>
          <button type="submit" className="primary" disabled={busy} style={{ flex:1 }}>
            {busy ? 'Đang lưu…' : isEdit ? '💾 Cập nhật' : '+ Thêm bệnh nhân'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function getSiteFromHash() {
  const m = window.location.hash.match(/[?&]site=([A-Z0-9]+)/);
  return m ? m[1] : 'ALL';
}

export default function NewlinePatients({ user }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [siteFilter, setSite]   = useState(getSiteFromHash);
  const [statusFilter, setStatus] = useState('ALL');
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setPatients(await apiGet('nlListPatients')); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data) => {
    await apiPost('nlAddPatient', data);
    setShowAdd(false);
    await load();
  };

  const handleEdit = async (data) => {
    await apiPost('nlUpdatePatient', data);
    setEditing(null);
    await load();
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Xoá ${p.patient_id}?\nThao tác không thể hoàn tác.`)) return;
    try { await apiPost('nlDeletePatient', { patient_id: p.patient_id }); await load(); }
    catch (e) { alert(e.message); }
  };

  const canWrite = user.role === 'admin' || user.role === 'investigator';

  // Counts for chips
  const counts = patients.reduce((acc, p) => {
    acc[p.follow_status] = (acc[p.follow_status] || 0) + 1; return acc;
  }, {});
  const siteCounts = patients.reduce((acc, p) => {
    acc[p.site_id] = (acc[p.site_id] || 0) + 1; return acc;
  }, {});

  let filtered = patients;
  if (siteFilter !== 'ALL') filtered = filtered.filter(p => p.site_id === siteFilter);
  if (statusFilter !== 'ALL') filtered = filtered.filter(p => p.follow_status === statusFilter);

  // Left border color per follow status
  const rowBorder = { overdue:'#d93025', upcoming:'#c5571c', completed:'#188038', pending:'#ccc' };

  return (
    <div style={{ padding:24 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0 }}>
            <a href="#/newline" style={{ color:'#0f5132', textDecoration:'none' }}>NEWLINE</a>
            {' '}/ Bệnh nhân
          </h1>
          <div className="muted" style={{ marginTop:3 }}>
            {patients.length} bệnh nhân
            {counts.overdue ? <span style={{ color:'#d93025', marginLeft:10 }}>· {counts.overdue} quá hạn</span> : null}
            {counts.upcoming ? <span style={{ color:'#c5571c', marginLeft:6 }}>· {counts.upcoming} sắp hạn</span> : null}
          </div>
        </div>
        {canWrite && (
          <button className="primary" onClick={() => setShowAdd(true)}>+ Thêm BN</button>
        )}
      </div>

      {/* Status filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {[
          { k:'ALL',       label:`Tất cả (${patients.length})`,       color:'#1a73e8' },
          { k:'overdue',   label:`⚠ Quá hạn (${counts.overdue||0})`,  color:'#d93025' },
          { k:'upcoming',  label:`⏰ Sắp hạn (${counts.upcoming||0})`, color:'#c5571c' },
          { k:'completed', label:`✓ Đã đánh giá (${counts.completed||0})`, color:'#188038' },
          { k:'pending',   label:`· Chờ (${counts.pending||0})`,       color:'#67707e' },
        ].map(opt => (
          <button key={opt.k} onClick={() => setStatus(opt.k)}
            style={{
              padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
              border: statusFilter === opt.k ? `1.5px solid ${opt.color}` : '1.5px solid var(--border)',
              background: statusFilter === opt.k ? opt.color : 'var(--surface)',
              color: statusFilter === opt.k ? '#fff' : 'var(--text)',
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Site tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        <button onClick={() => setSite('ALL')}
          style={{
            padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer',
            border: siteFilter==='ALL' ? '2px solid #0f5132' : '2px solid var(--border)',
            background: siteFilter==='ALL' ? '#0f5132' : 'var(--surface)',
            color: siteFilter==='ALL' ? '#fff' : 'var(--muted)',
            transition:'all .15s',
          }}>Tất cả <span style={{ background:'rgba(255,255,255,.25)', borderRadius:10, padding:'1px 6px', fontSize:11 }}>{patients.length}</span></button>
        {SITES_META.map(s => {
          const active = siteFilter === s.site_id;
          const cnt = siteCounts[s.site_id] || 0;
          const col = SITE_COLOR[s.site_id] || '#888';
          return (
            <button key={s.site_id} onClick={() => setSite(s.site_id)}
              style={{
                padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer',
                border: active ? `2px solid ${col}` : '2px solid var(--border)',
                background: active ? col : 'var(--surface)',
                color: active ? '#fff' : 'var(--text)',
                transition:'all .15s',
              }}>
              {s.site_id}
              {cnt > 0 && <span style={{ marginLeft:5, background: active ? 'rgba(255,255,255,.3)' : 'var(--border)', borderRadius:10, padding:'1px 6px', fontSize:11, fontWeight:800 }}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {err && <div className="error-box">⚠️ {err}</div>}

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table" style={{ tableLayout:'fixed', minWidth:860 }}>
          <colgroup>
            <col style={{ width:6 }} />
            <col style={{ width:200 }} />
            <col style={{ width:90 }} />
            <col style={{ width:120 }} />
            <col style={{ width:130 }} />
            <col style={{ width:150 }} />
            <col style={{ width:110 }} />
            <col style={{ width:140 }} />
            {canWrite && <col style={{ width:80 }} />}
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th>Mã bệnh nhân</th>
              <th>Site</th>
              <th>Thu tuyển</th>
              <th>Hạn đánh giá 3T</th>
              <th>BS phụ trách</th>
              <th>mRS 3 tháng</th>
              <th>Trạng thái</th>
              {canWrite && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>
                  {[...Array(canWrite?9:8)].map((_,j) => (
                    <td key={j} style={{ padding:'10px 8px' }}>
                      <div className="skeleton" style={{ height:14, borderRadius:3, width: j===0?'140px':j===8?'60px':'70%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={canWrite?9:8} className="empty">
                {patients.length === 0 ? 'Chưa có bệnh nhân — nhấn "+ Thêm BN" để bắt đầu' : 'Không có kết quả khớp bộ lọc'}
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.patient_id}>
                {/* Left status bar */}
                <td style={{ padding:0 }}>
                  <div style={{ width:6, height:'100%', minHeight:44,
                    background: rowBorder[p.follow_status] || '#e0e4ea',
                    borderRadius:'4px 0 0 4px' }} />
                </td>
                <td style={{ paddingLeft:12 }}>
                  <span style={{ fontFamily:'monospace', fontSize:12.5, fontWeight:700,
                    color:'#1a73e8', letterSpacing:'.01em' }}>{p.patient_id}</span>
                </td>
                <td>
                  <span style={{ display:'inline-block', padding:'3px 8px', borderRadius:6,
                    background:'#e8f0fe', color:'#1a73e8', fontSize:11.5, fontWeight:700,
                    fontFamily:'monospace' }}>{p.site_id}</span>
                </td>
                <td style={{ fontSize:13 }}>{fmtVN(p.enrollment_date)}</td>
                <td style={{ fontSize:13, fontWeight: p.follow_status === 'overdue' ? 700 : 400,
                  color: p.follow_status === 'overdue' ? '#d93025'
                    : p.follow_status === 'upcoming' ? '#c5571c' : 'inherit' }}>
                  {fmtVN(p.due_date_3m)}
                </td>
                <td style={{ fontSize:13, color:'var(--muted)' }}>{p.sub_investigator || '—'}</td>
                <td><MrsBadge v={p.mrs_3m} /></td>
                <td><FollowChip status={p.follow_status} /></td>
                {canWrite && (
                  <td>
                    <button title="Sửa / Nhập kết cục" onClick={() => setEditing(p)}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:'2px 5px', borderRadius:4 }}>✏️</button>
                    {user.role === 'admin' && (
                      <button title="Xoá" onClick={() => handleDelete(p)}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:'2px 5px', borderRadius:4 }}>🗑</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAdd && (
        <PatientForm isEdit={false} onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editing && (
        <PatientForm isEdit={true} initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
