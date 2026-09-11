import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api.js';
import { Modal, Field, ErrorBox, Spinner } from '../ui.jsx';

const ROLES = ['admin', 'investigator', 'readonly'];
const EMPTY = { email: '', role: 'investigator', name: '', assigned_studies: 'ALL', password: '', token: '' };

function UserForm({ onSaved, onClose }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) { setError('Mật khẩu phải ít nhất 6 ký tự'); return; }
    setBusy(true); setError('');
    try {
      const res = await apiPost('addUser', { ...form });
      onSaved(res);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title="Thêm người dùng mới" onClose={onClose}>
      <ErrorBox error={error} />
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Email *">
            <input type="email" value={form.email} onChange={set('email')} autoComplete="off" required />
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
          <Field label="Mật khẩu đăng nhập *">
            <input type="password" value={form.password} onChange={set('password')}
              placeholder="Ít nhất 6 ký tự" autoComplete="new-password" required />
          </Field>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose}>Huỷ</button>
          <button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Tạo tài khoản'}</button>
        </div>
      </form>
    </Modal>
  );
}

function SetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Mật khẩu phải ít nhất 6 ký tự'); return; }
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp'); return; }
    setBusy(true); setError('');
    try {
      await apiPost('setPassword', { email: user.email, password });
      setDone(true);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={'Đặt mật khẩu — ' + user.email} onClose={onClose}>
      {done
        ? <div className="alert" style={{ color:'var(--green)', border:'1px solid var(--green)', background:'#f0faf0' }}>
            ✅ Đặt mật khẩu thành công cho <b>{user.email}</b>
            <div style={{ marginTop: 10, textAlign:'right' }}>
              <button onClick={onClose}>Đóng</button>
            </div>
          </div>
        : <>
            <ErrorBox error={error} />
            <form onSubmit={submit}>
              <Field label="Mật khẩu mới">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự" autoComplete="new-password" required />
              </Field>
              <Field label="Xác nhận mật khẩu">
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu" autoComplete="new-password" required />
              </Field>
              <div className="row" style={{ justifyContent:'flex-end', marginTop: 8 }}>
                <button type="button" onClick={onClose}>Huỷ</button>
                <button className="primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Đặt mật khẩu'}</button>
              </div>
            </form>
          </>
      }
    </Modal>
  );
}

export default function Users() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [settingPw, setSettingPw] = useState(null); // user object

  const load = () => apiGet('listUsers').then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const deleteUser = async (email) => {
    if (!window.confirm('Xoá người dùng ' + email + '?')) return;
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
        <button className="primary" onClick={() => setAdding(true)}>+ Thêm người dùng</button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data">
          <thead>
            <tr>
              <th>Email</th><th>Tên</th><th>Vai trò</th><th>Nghiên cứu</th>
              <th>Mật khẩu</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email}>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td><span className={'badge ' + u.role}>{u.role}</span></td>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.assigned_studies}</span></td>
                <td>
                  {u.has_password
                    ? <span style={{ color: 'var(--green)' }}>✓ Đã đặt</span>
                    : <span style={{ color: '#e67e22' }}>⚠ Chưa đặt</span>}
                </td>
                <td style={{ display:'flex', gap:6 }}>
                  <button className="small" onClick={() => setSettingPw(u)}>Đặt mật khẩu</button>
                  <button className="small danger" onClick={() => deleteUser(u.email)}>Xoá</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="6" className="empty">Chưa có người dùng.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        Mỗi người dùng đăng nhập bằng email + mật khẩu riêng. Admin đặt mật khẩu lần đầu, người dùng có thể đổi sau.
      </p>

      {adding && (
        <UserForm
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
      )}

      {settingPw && (
        <SetPasswordModal
          user={settingPw}
          onClose={() => { setSettingPw(null); load(); }}
        />
      )}
    </div>
  );
}
