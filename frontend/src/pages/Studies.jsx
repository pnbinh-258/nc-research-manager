import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api.js';
import { Badge, Modal, Field, ErrorBox, Spinner, fmtDate, TYPE_LABELS, STUDY_STATUS } from '../ui.jsx';

const EMPTY = {
  title: '', type: 'Observational', sponsor: '', phase: '', status: 'Planning',
  pi_name: '', target_n: '', start_date: '', expected_end: '', irb_number: '', irb_expiry: '',
};

export function StudyForm({ initial, onSaved, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial?.study_id;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiPost(isEdit ? 'updateStudy' : 'addStudy', { ...form });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Sửa nghiên cứu ' + initial.study_id : 'Thêm nghiên cứu mới'} onClose={onClose}>
      <ErrorBox error={error} />
      <form onSubmit={submit}>
        <Field label="Tên nghiên cứu *">
          <input value={form.title} onChange={set('title')} required />
        </Field>
        <div className="form-grid">
          <Field label="Loại *">
            <select value={form.type} onChange={set('type')}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Trạng thái">
            <select value={form.status} onChange={set('status')}>
              {STUDY_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Sponsor">
            <input value={form.sponsor} onChange={set('sponsor')} placeholder="Internal / Boehringer / IQVIA…" />
          </Field>
          <Field label="Phase">
            <input value={form.phase} onChange={set('phase')} placeholder="III hoặc N/A" />
          </Field>
          <Field label="PI *">
            <input value={form.pi_name} onChange={set('pi_name')} required />
          </Field>
          <Field label="Số BN mục tiêu">
            <input type="number" min="0" value={form.target_n} onChange={set('target_n')} />
          </Field>
          <Field label="Ngày bắt đầu">
            <input type="date" value={form.start_date} onChange={set('start_date')} />
          </Field>
          <Field label="Dự kiến kết thúc">
            <input type="date" value={form.expected_end} onChange={set('expected_end')} />
          </Field>
          <Field label="Số IRB">
            <input value={form.irb_number} onChange={set('irb_number')} />
          </Field>
          <Field label="Hạn IRB">
            <input type="date" value={form.irb_expiry} onChange={set('irb_expiry')} />
          </Field>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose}>Huỷ</button>
          <button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Studies({ user }) {
  const [studies, setStudies] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | {} | study

  const load = () => apiGet('listStudies').then(setStudies).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const deleteStudy = async (s) => {
    if (!window.confirm('Xoá nghiên cứu ' + s.study_id + ' "' + s.title + '"?\nThao tác này KHÔNG xoá bệnh nhân/milestones đã nhập.')) return;
    try { await apiPost('deleteStudy', { study_id: s.study_id }); load(); }
    catch (err) { alert(err.message); }
  };

  if (error) return <ErrorBox error={error} />;
  if (!studies) return <Spinner />;

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1 style={{ marginBottom: 0 }}>Nghiên cứu</h1>
        {user.role === 'admin' && (
          <button className="primary" onClick={() => setEditing({})}>+ Thêm nghiên cứu</button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data">
          <thead>
            <tr>
              <th>Mã</th><th>Tên</th><th>Loại</th><th>Trạng thái</th><th>PI</th>
              <th>Enroll</th><th>Hạn IRB</th><th></th>
            </tr>
          </thead>
          <tbody>
            {studies.map((s) => (
              <tr key={s.study_id}>
                <td><a className="link" href={'#/studies/' + s.study_id}>{s.study_id}</a></td>
                <td>{s.title}</td>
                <td><Badge value={s.type} label={TYPE_LABELS[s.type]} /></td>
                <td><Badge value={s.status} /></td>
                <td>{s.pi_name}</td>
                <td>{s.enrolled_n || 0}/{s.target_n || '?'}</td>
                <td>{fmtDate(s.irb_expiry)}</td>
                <td>
                  {user.role === 'admin' && (
                    <div className="row">
                      <button className="small" onClick={() => setEditing(s)}>Sửa</button>
                      <button className="small danger" onClick={() => deleteStudy(s)}>Xoá</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {studies.length === 0 && (
              <tr><td colSpan="8" className="empty">Chưa có nghiên cứu nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <StudyForm
          initial={editing.study_id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
