import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api.js';
import { Modal, Field, ErrorBox, Spinner } from '../ui.jsx';

const ROLES = ['admin', 'investigator', 'readonly'];
const EMPTY = { email: '', role: 'investigator', name: '', assigned_studies: 'ALL', token: '' };

function UserForm({ onSaved, onClose }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newToken, setNewToken] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const genToken = async () => {
    try {
      const res = await apiPost('generateToken', {});
      setForm((f) => ({ ...f, token: res.token }));
      setNewToken(res.token);
    } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.token) { setError('Chưa sinh token — bấm nút Sinh token'); return; }
    setBusy(true); setError('');
    try {
      const res = await apiPost('addUser', { ...form });
      setNewToken(res.token);
      onSaved(res.token);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title="Thêm người dùng mới" onClose={onClose}>
      <ErrorBox error={error} />
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Email (Google) *">
            <input type="email" value={form.email} onChange={set('email')} required />
          </Field>
          <Field label="Tên hiển thị *">
            <input value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Vai trò">
            <select value={form.role} onChange={set('role')}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Nghiên cứu được phép (ALL hoặc NC001,NC002)">
            <input value={form.assigned_studies} onChange={set('assigned_studies')} placeholder="ALL" />
          </Field>
        </div>
        <div className="row" style={{ marginBottom: 12, alignItems: 'center' }}>
          <input readOnly value={form.token} placeholder="Token chưa sinh" style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }} />
          <button type="button" onClick={genToken}>Sinh token</button>
        </div>
        {newToken && (
          <div className="alert orange" style={{ marginBottom: 12 }}>
            Token: <b style={{ fontFamily: 'monospace' }}>{newToken}</b><br />
            <span className="muted">Sao chép và gửi riêng cho người dùng — sẽ không hiển thị lại.</span>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}>Huỷ</button>
          <button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu người dùng'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [savedToken, setSavedToken] = useState('');

  const load = () => apiGet('listUsers').then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const deleteUser = async (email) => {
    if (!window.confirm('Xoá người dùng ' + email + '? Token của họ sẽ bị vô hiệu ngay lập tức.')) return;
    try {
      await apiPost('deleteUser', { email });
      load();
    } catch (err) { alert(err.message); }
  };

  if (error) return <div className="error-box">⚠️ {error}</div>;
  if (!users) return <Spinner />;

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1 style={{ marginBottom: 0 }}>Quản lý người dùng</h1>
        <button className="primary" onClick={() => { setSavedToken(''); setAdding(true); }}>+ Thêm người dùng</button>
      </div>

      {savedToken && (
        <div className="alert orange" style={{ marginBottom: 14 }}>
          Token mới: <b style={{ fontFamily: 'monospace' }}>{savedToken}</b> — gửi riêng cho người dùng, đừng để lộ!
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data">
          <thead>
            <tr><th>Email</th><th>Tên</th><th>Vai trò</th><th>Nghiên cứu</th><th>Token</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email}>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td><span className={'badge ' + u.role}>{u.role}</span></td>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.assigned_studies}</span></td>
                <td>{u.has_token ? <span style={{ color: 'var(--green)' }}>✓ Đã cấp</span> : <span className="muted">—</span>}</td>
                <td>
                  <button className="small danger" onClick={() => deleteUser(u.email)}>Xoá</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="6" className="empty">Chưa có người dùng.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        Thu hồi quyền truy cập: xoá người dùng. Token bị xoá có hiệu lực ngay — lần sau gọi API sẽ nhận UNAUTHORIZED.
      </p>

      {adding && (
        <UserForm
          onClose={() => setAdding(false)}
          onSaved={(token) => { setAdding(false); setSavedToken(token); load(); }}
        />
      )}
    </div>
  );
}
