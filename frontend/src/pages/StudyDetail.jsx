import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, exportCSV } from '../api.js';
import {
  Badge, Progress, Modal, Field, ErrorBox, Spinner, fmtDate, daysUntil, canWrite,
  TYPE_LABELS, PATIENT_STATUS, MILESTONE_STATUS, DOC_TYPES, DOC_STATUS,
} from '../ui.jsx';
import { StudyForm } from './Studies.jsx';

const MILESTONE_SUGGESTIONS = [
  'Nộp đạo đức', 'IRB phê duyệt', 'Site Initiation Visit', 'First Patient In',
  'Giữa kỳ (50% enrollment)', 'Last Patient In', 'Last Patient Out', 'Database Lock', 'Báo cáo kết quả',
];

function PatientForm({ studyId, initial, onSaved, onClose }) {
  const [form, setForm] = useState({
    study_id: studyId, screen_date: '', enroll_date: '', status: 'Screened',
    withdrawal_reason: '', sub_investigator: '', notes: '', ...initial,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial?.patient_code;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await apiPost(isEdit ? 'updatePatient' : 'addPatient', { ...form });
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={isEdit ? 'Cập nhật BN ' + initial.patient_code : 'Thêm bệnh nhân (mã tự sinh)'} onClose={onClose}>
      <ErrorBox error={error} />
      <p className="muted" style={{ marginBottom: 12 }}>
        ⚠️ Không nhập tên thật / số nhập viện vào đây. Mapping danh tính lưu ở file riêng của PI.
      </p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Ngày sàng lọc"><input type="date" value={form.screen_date} onChange={set('screen_date')} /></Field>
          <Field label="Ngày enroll"><input type="date" value={form.enroll_date} onChange={set('enroll_date')} /></Field>
          <Field label="Trạng thái">
            <select value={form.status} onChange={set('status')}>
              {PATIENT_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="BS phụ trách"><input value={form.sub_investigator} onChange={set('sub_investigator')} /></Field>
        </div>
        {form.status === 'Withdrawn' && (
          <Field label="Lý do rút lui"><input value={form.withdrawal_reason} onChange={set('withdrawal_reason')} /></Field>
        )}
        <Field label="Ghi chú"><textarea rows="2" value={form.notes} onChange={set('notes')} /></Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}>Huỷ</button>
          <button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MilestoneForm({ studyId, initial, onSaved, onClose }) {
  const [form, setForm] = useState({
    study_id: studyId, milestone_name: '', planned_date: '', actual_date: '',
    status: 'Pending', owner: '', ...initial,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial?.milestone_id;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await apiPost(isEdit ? 'updateMilestone' : 'addMilestone', { ...form });
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={isEdit ? 'Cập nhật milestone' : 'Thêm milestone'} onClose={onClose}>
      <ErrorBox error={error} />
      <form onSubmit={submit}>
        <Field label="Tên milestone *">
          <input list="ms-suggest" value={form.milestone_name} onChange={set('milestone_name')} required />
          <datalist id="ms-suggest">
            {MILESTONE_SUGGESTIONS.map((m) => <option key={m} value={m} />)}
          </datalist>
        </Field>
        <div className="form-grid">
          <Field label="Ngày kế hoạch"><input type="date" value={form.planned_date} onChange={set('planned_date')} /></Field>
          <Field label="Ngày thực tế"><input type="date" value={form.actual_date} onChange={set('actual_date')} /></Field>
          <Field label="Trạng thái">
            <select value={form.status === 'Overdue' ? 'Pending' : form.status} onChange={set('status')}>
              {MILESTONE_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Người phụ trách"><input value={form.owner} onChange={set('owner')} /></Field>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}>Huỷ</button>
          <button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}

function DocumentForm({ studyId, initial, onSaved, onClose }) {
  const [form, setForm] = useState({
    study_id: studyId, doc_type: 'Protocol', version: 'v1.0', status: 'Draft',
    gdrive_link: '', expiry_date: '', ...initial,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial?.doc_id;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await apiPost(isEdit ? 'updateDocument' : 'addDocument', { ...form });
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={isEdit ? 'Cập nhật tài liệu' : 'Thêm tài liệu'} onClose={onClose}>
      <ErrorBox error={error} />
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Loại tài liệu">
            <select value={form.doc_type} onChange={set('doc_type')}>
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Version"><input value={form.version} onChange={set('version')} placeholder="v2.1" /></Field>
          <Field label="Trạng thái">
            <select value={form.status} onChange={set('status')}>
              {DOC_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Ngày hết hạn (nếu có)"><input type="date" value={form.expiry_date} onChange={set('expiry_date')} /></Field>
        </div>
        <Field label="Link Google Drive *">
          <input type="url" value={form.gdrive_link} onChange={set('gdrive_link')} required placeholder="https://drive.google.com/…" />
        </Field>
        <p className="muted" style={{ marginBottom: 12 }}>
          Khi lưu bản Approved mới, bản Approved cũ cùng loại sẽ tự chuyển thành Superseded.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}>Huỷ</button>
          <button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function StudyDetail({ user, studyId }) {
  const [study, setStudy] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null); // {type, data}

  const writable = canWrite(user, studyId);
  const load = () => apiGet('getStudy', { study_id: studyId }).then(setStudy).catch((e) => setError(e.message));
  useEffect(() => { setStudy(null); load(); }, [studyId]);

  const deleteItem = async (action, label, data) => {
    if (!window.confirm('Xoá ' + label + '?')) return;
    try { await apiPost(action, data); load(); }
    catch (err) { alert(err.message); }
  };

  if (error) return <ErrorBox error={error} />;
  if (!study) return <Spinner />;

  const closeAndReload = () => { setModal(null); load(); };
  const irbDays = daysUntil(study.irb_expiry);

  return (
    <div>
      <a className="link" href="#/studies">← Danh sách nghiên cứu</a>
      <div className="row between" style={{ margin: '10px 0 4px' }}>
        <h1 style={{ marginBottom: 0 }}>{study.title}</h1>
        {user.role === 'admin' && <button onClick={() => setModal({ type: 'study', data: study })}>Sửa thông tin</button>}
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <span className="muted">{study.study_id}</span>
        <Badge value={study.type} label={TYPE_LABELS[study.type]} />
        <Badge value={study.status} />
      </div>

      <div className="tabs">
        {[['overview', 'Tổng quan'], ['patients', `Bệnh nhân (${study.patients.length})`],
          ['milestones', `Milestones (${study.milestones.length})`], ['documents', `Tài liệu (${study.documents.length})`]]
          .map(([k, label]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
      </div>

      {tab === 'overview' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <h2 style={{ marginTop: 0 }}>Enrollment</h2>
            <Progress value={study.enrolled_n || 0} max={Number(study.target_n) || 0} />
            <table className="data" style={{ marginTop: 12 }}>
              <tbody>
                <tr><td className="muted">Screened</td><td>{study.patients.filter((p) => p.status === 'Screened').length}</td></tr>
                <tr><td className="muted">Enrolled</td><td>{study.patients.filter((p) => p.status === 'Enrolled').length}</td></tr>
                <tr><td className="muted">Completed</td><td>{study.patients.filter((p) => p.status === 'Completed').length}</td></tr>
                <tr><td className="muted">Withdrawn</td><td>{study.patients.filter((p) => p.status === 'Withdrawn').length}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <h2 style={{ marginTop: 0 }}>Thông tin</h2>
            <table className="data">
              <tbody>
                <tr><td className="muted">PI</td><td>{study.pi_name}</td></tr>
                <tr><td className="muted">Sponsor</td><td>{study.sponsor || '—'}</td></tr>
                <tr><td className="muted">Phase</td><td>{study.phase || '—'}</td></tr>
                <tr><td className="muted">Thời gian</td><td>{fmtDate(study.start_date)} → {fmtDate(study.expected_end)}</td></tr>
                <tr><td className="muted">IRB</td><td>{study.irb_number || '—'}</td></tr>
                <tr>
                  <td className="muted">Hạn IRB</td>
                  <td style={irbDays !== null && irbDays < 30 ? { color: 'var(--red)', fontWeight: 600 } : {}}>
                    {fmtDate(study.irb_expiry)}{irbDays !== null && irbDays < 30 ? ` (còn ${irbDays} ngày!)` : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'patients' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div className="row between" style={{ padding: '12px 14px' }}>
            <span className="muted">Chỉ hiển thị mã nghiên cứu — không có danh tính thật</span>
            <div className="row">
              <button className="small" onClick={() =>
                exportCSV(study.study_id + '-patients.csv',
                  ['patient_code', 'screen_date', 'enroll_date', 'status', 'withdrawal_reason', 'sub_investigator'],
                  study.patients)}>
                ⬇ Export CSV
              </button>
              {writable && <button className="small primary" onClick={() => setModal({ type: 'patient' })}>+ Thêm BN</button>}
            </div>
          </div>
          <table className="data">
            <thead><tr><th>Mã BN</th><th>Sàng lọc</th><th>Enroll</th><th>Trạng thái</th><th>BS phụ trách</th><th>Ghi chú</th><th></th></tr></thead>
            <tbody>
              {study.patients.map((p) => (
                <tr key={p.patient_code}>
                  <td><b>{p.patient_code}</b></td>
                  <td>{fmtDate(p.screen_date)}</td>
                  <td>{fmtDate(p.enroll_date)}</td>
                  <td><Badge value={p.status} />{p.status === 'Withdrawn' && p.withdrawal_reason && <div className="muted">{p.withdrawal_reason}</div>}</td>
                  <td>{p.sub_investigator}</td>
                  <td>{p.notes}</td>
                  <td>
                    {writable && (
                      <div className="row">
                        <button className="small" onClick={() => setModal({ type: 'patient', data: p })}>Sửa</button>
                        <button className="small danger" onClick={() => deleteItem('deletePatient', 'BN ' + p.patient_code, { patient_code: p.patient_code, study_id: studyId })}>Xoá</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {study.patients.length === 0 && <tr><td colSpan="7" className="empty">Chưa có bệnh nhân.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'milestones' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div className="row" style={{ padding: '12px 14px', justifyContent: 'flex-end' }}>
            {writable && <button className="small primary" onClick={() => setModal({ type: 'milestone' })}>+ Thêm milestone</button>}
          </div>
          <table className="data">
            <thead><tr><th>Milestone</th><th>Kế hoạch</th><th>Thực tế</th><th>Trạng thái</th><th>Phụ trách</th><th></th></tr></thead>
            <tbody>
              {study.milestones.map((m) => (
                <tr key={m.milestone_id}>
                  <td>{m.milestone_name}</td>
                  <td>{fmtDate(m.planned_date)}</td>
                  <td>{fmtDate(m.actual_date)}</td>
                  <td><Badge value={m.status} /></td>
                  <td>{m.owner}</td>
                  <td>
                    {writable && (
                      <div className="row">
                        <button className="small" onClick={() => setModal({ type: 'milestone', data: m })}>Sửa</button>
                        <button className="small danger" onClick={() => deleteItem('deleteMilestone', 'milestone "' + m.milestone_name + '"', { milestone_id: m.milestone_id, study_id: studyId })}>Xoá</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {study.milestones.length === 0 && <tr><td colSpan="6" className="empty">Chưa có milestone.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'documents' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div className="row" style={{ padding: '12px 14px', justifyContent: 'flex-end' }}>
            {writable && <button className="small primary" onClick={() => setModal({ type: 'document' })}>+ Thêm tài liệu</button>}
          </div>
          <table className="data">
            <thead><tr><th>Loại</th><th>Version</th><th>Trạng thái</th><th>Hết hạn</th><th>Link</th><th></th></tr></thead>
            <tbody>
              {study.documents.map((d) => {
                const days = daysUntil(d.expiry_date);
                return (
                  <tr key={d.doc_id}>
                    <td>{d.doc_type}</td>
                    <td>{d.version}</td>
                    <td><Badge value={d.status} /></td>
                    <td style={days !== null && days < 30 && d.status === 'Approved' ? { color: 'var(--red)', fontWeight: 600 } : {}}>
                      {fmtDate(d.expiry_date)}
                    </td>
                    <td>{d.gdrive_link && <a className="link" href={d.gdrive_link} target="_blank" rel="noreferrer">Mở ↗</a>}</td>
                    <td>
                      {writable && (
                        <div className="row">
                          <button className="small" onClick={() => setModal({ type: 'document', data: d })}>Sửa</button>
                          <button className="small danger" onClick={() => deleteItem('deleteDocument', 'tài liệu ' + d.doc_type + ' ' + d.version, { doc_id: d.doc_id, study_id: studyId })}>Xoá</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {study.documents.length === 0 && <tr><td colSpan="6" className="empty">Chưa có tài liệu.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === 'study' && (
        <StudyForm initial={modal.data} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {modal?.type === 'patient' && (
        <PatientForm studyId={studyId} initial={modal.data} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {modal?.type === 'milestone' && (
        <MilestoneForm studyId={studyId} initial={modal.data} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {modal?.type === 'document' && (
        <DocumentForm studyId={studyId} initial={modal.data} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
    </div>
  );
}
