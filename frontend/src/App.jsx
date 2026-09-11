import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiLogin, getConfig, saveConfig, clearConfig, DEFAULT_API_URL } from './api.js';
import { ErrorBox, Field } from './ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Studies from './pages/Studies.jsx';
import StudyDetail from './pages/StudyDetail.jsx';
import Patients from './pages/Patients.jsx';
import Documents from './pages/Documents.jsx';
import Users from './pages/Users.jsx';
import ActivityLog from './pages/ActivityLog.jsx';
import NewlineDashboard from './pages/NewlineDashboard.jsx';
import NewlinePatients from './pages/NewlinePatients.jsx';

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
  const [email, setEmail] = useState(cfg.lastEmail || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // chỉ pre-fill nếu user đã tự nhập URL tùy chỉnh (khác mặc định và khác 'demo')
  const [apiUrl, setApiUrl] = useState(
    cfg.apiUrl && cfg.apiUrl !== 'demo' && cfg.apiUrl !== DEFAULT_API_URL ? cfg.apiUrl : ''
  );

  const doLogin = async (loginEmail, loginPassword, loginUrl) => {
    setBusy(true);
    setError('');
    try {
      if (loginUrl) saveConfig(loginUrl, cfg.token || '');
      const userData = await apiLogin(loginEmail, loginPassword);
      // lưu token nhận được, email để pre-fill lần sau
      saveConfig(getConfig().apiUrl, userData.token);
      localStorage.setItem('nc_last_email', loginEmail);
      onLogin(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    doLogin(email, password, apiUrl || null);
  };

  const demoLogin = () => {
    saveConfig('demo', 'demo');
    doLogin('demo', 'demo', 'demo');
  };

  return (
    <div style={{ maxWidth: 420, margin: '10vh auto', padding: 16 }}>
      <div className="card">
        <div style={{ textAlign:'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🏥</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Quản lý Nghiên cứu</h1>
          <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>Khoa Bệnh lý mạch máu não — BV Nhân dân 115</p>
        </div>

        <ErrorBox error={error} />

        <form onSubmit={submit}>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" autoComplete="email" required />
          </Field>
          <Field label="Mật khẩu">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" required />
          </Field>

          {showAdvanced && (
            <Field label="API URL (tuỳ chỉnh)">
              <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                placeholder="Để trống để dùng URL mặc định" />
            </Field>
          )}

          <button type="submit" className="primary" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ marginTop: 14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button type="button" onClick={demoLogin}
            style={{ background:'none', border:'1px solid var(--border)', borderRadius:6,
              padding:'4px 12px', fontSize:12, cursor:'pointer', color:'var(--muted)' }}>
            Dùng thử demo
          </button>
          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            style={{ background:'none', border:'none', fontSize:11, cursor:'pointer', color:'var(--muted)' }}>
            {showAdvanced ? 'Ẩn tuỳ chỉnh' : 'Tuỳ chỉnh API URL'}
          </button>
        </div>
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
  const newlineNav = [
    { href: '#/newline',          label: 'Dashboard NC', icon: '🏥', active: route === '/newline' },
    { href: '#/newline/patients', label: 'Bệnh nhân',    icon: '👥', active: route === '/newline/patients' || route.startsWith('/newline/patients') },
  ];
  const adminNav = user.role === 'admin' ? [
    { href: '#/users', label: 'Người dùng', icon: '👤', active: route === '/users' },
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
        <div className="nav-section">NEWLINE</div>
        {newlineNav.map(n => (
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
        {route === '/newline' && <NewlineDashboard user={user} />}
        {route.startsWith('/newline/patients') && <NewlinePatients user={user} />}
      </main>
    </div>
  );
}
