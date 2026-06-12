import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, getConfig, saveConfig, clearConfig } from './api.js';
import { ErrorBox, Field } from './ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Studies from './pages/Studies.jsx';
import StudyDetail from './pages/StudyDetail.jsx';
import Patients from './pages/Patients.jsx';
import Documents from './pages/Documents.jsx';
import Users from './pages/Users.jsx';
import ActivityLog from './pages/ActivityLog.jsx';

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash.replace(/^#/, '');
}

function LoginScreen({ onLogin }) {
  const cfg = getConfig();
  const [apiUrl, setApiUrl] = useState(cfg.apiUrl);
  const [token, setToken] = useState(cfg.token);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      saveConfig(apiUrl, token);
      const user = await apiGet('whoami');
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: '10vh auto', padding: 16 }}>
      <div className="card">
        <h1 style={{ fontSize: 18, marginBottom: 6 }}>Quản lý Nghiên cứu</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Khoa Bệnh lý mạch máu não — đăng nhập bằng token cá nhân</p>
        <ErrorBox error={error} />
        <form onSubmit={submit}>
          <Field label="API URL (Apps Script /exec)">
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/…/exec" required />
          </Field>
          <Field label="Token cá nhân (PI cấp, trong sheet Users)">
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </Field>
          <button className="primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Đang kiểm tra…' : 'Đăng nhập'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          Chưa có backend? Nhập <b>demo</b> vào cả hai ô để xem app với dữ liệu mẫu.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const route = useHashRoute();

  useEffect(() => {
    const cfg = getConfig();
    if (!cfg.apiUrl || !cfg.token) { setChecking(false); return; }
    apiGet('whoami')
      .then(setUser)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const logout = useCallback(() => {
    clearConfig();
    setUser(null);
    window.location.hash = '#/';
  }, []);

  if (checking) return <div className="empty" style={{ marginTop: '20vh' }}>Đang kết nối…</div>;
  if (!user) return <LoginScreen onLogin={setUser} />;

  const studyMatch = route.match(/^\/studies\/([^/]+)/);
  const nav = [
    ['#/', 'Dashboard', route === '/'],
    ['#/studies', 'Nghiên cứu', route.startsWith('/studies')],
    ['#/patients', 'Bệnh nhân', route === '/patients'],
    ['#/documents', 'Tài liệu', route === '/documents'],
    ...(user.role === 'admin' ? [
      ['#/users', 'Người dùng', route === '/users'],
      ['#/log', 'Audit log', route === '/log'],
    ] : []),
  ];

  const mainNav = [
    { href: '#/',          label: 'Dashboard',    icon: '📊', active: route === '/' },
    { href: '#/studies',   label: 'Nghiên cứu',   icon: '🔬', active: route.startsWith('/studies') },
    { href: '#/patients',  label: 'Bệnh nhân',    icon: '👤', active: route === '/patients' },
    { href: '#/documents', label: 'Tài liệu',     icon: '📁', active: route === '/documents' },
  ];
  const adminNav = user.role === 'admin' ? [
    { href: '#/users', label: 'Người dùng', icon: '👥', active: route === '/users' },
    { href: '#/log',   label: 'Audit Log',  icon: '📝', active: route === '/log' },
  ] : [];

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <div style={{ fontWeight:700, fontSize:15, color:'#fff' }}>ResearchTrack</div>
          <div style={{ fontWeight:400, fontSize:11, color:'#8fa3bd', marginTop:2, lineHeight:1.4 }}>Quản lý nghiên cứu y khoa<br />Khoa BLMMN · BV Nhân dân 115</div>
        </div>
        <div className="nav-section">MENU CHÍNH</div>
        {mainNav.map(n => (
          <a key={n.href} href={n.href} className={n.active ? 'active' : ''}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </a>
        ))}
        {adminNav.length > 0 && (
          <>
            <div className="nav-section">QUẢN TRỊ</div>
            {adminNav.map(n => (
              <a key={n.href} href={n.href} className={n.active ? 'active' : ''}>
                <span className="nav-icon">{n.icon}</span>{n.label}
              </a>
            ))}
          </>
        )}
        <div className="spacer" />
        <div className="sidebar-user">
          <div className="sidebar-avatar">{(user.name || user.email || '?')[0].toUpperCase()}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:13, color:'#e2e8f0' }}>{user.name || user.email}</div>
            <div style={{ fontSize:11, color:'#8fa3bd' }}>{user.role}</div>
          </div>
        </div>
        <a href="#/" onClick={e => { e.preventDefault(); logout(); }} style={{ marginTop:4 }}>
          <span className="nav-icon">🚪</span>Đăng xuất
        </a>
      </nav>
      <main className="main">
        {route === '/' && <Dashboard user={user} />}
        {route === '/studies' && <Studies user={user} />}
        {studyMatch && <StudyDetail user={user} studyId={decodeURIComponent(studyMatch[1])} />}
        {route === '/patients' && <Patients user={user} />}
        {route === '/documents' && <Documents user={user} />}
        {route === '/users' && user.role === 'admin' && <Users />}
        {route === '/log' && user.role === 'admin' && <ActivityLog />}
      </main>
    </div>
  );
}
