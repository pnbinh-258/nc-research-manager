// API client cho Google Apps Script Web App.
// POST dùng Content-Type text/plain để tránh CORS preflight (Apps Script không trả OPTIONS).
import { demoCall } from './demo.js';

// URL mặc định — tự điền khi host trên GitHub Pages (không cần nhập tay)
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxXr89yyyRlMOrQMbmpdPhxM4wWSWMEUtVjfmXZirN5XLN2tVAcpijVCMWXQ1-O2pRP/exec';

export function getConfig() {
  return {
    apiUrl: localStorage.getItem('nc_api_url') || (typeof window !== 'undefined' && window.NC_API_URL) || DEFAULT_API_URL,
    token: localStorage.getItem('nc_token') || '',
    lastEmail: localStorage.getItem('nc_last_email') || '',
  };
}

export function saveConfig(apiUrl, token) {
  localStorage.setItem('nc_api_url', apiUrl.trim());
  localStorage.setItem('nc_token', token.trim());
}

export function clearConfig() {
  localStorage.removeItem('nc_api_url');
  localStorage.removeItem('nc_token');
}

async function parseResponse(res) {
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('API không trả về JSON — kiểm tra lại URL deploy (phải là bản /exec, quyền Anyone).');
  }
  if (!json.ok) throw new Error(json.message || json.error || 'Lỗi API');
  return json.data;
}

export async function apiGet(action, params = {}) {
  const { apiUrl, token } = getConfig();
  if (!apiUrl) throw new Error('Chưa cấu hình API URL');
  if (apiUrl === 'demo') return demoCall(action, params);
  const url = new URL(apiUrl);
  url.searchParams.set('action', action);
  url.searchParams.set('token', token);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  return parseResponse(res);
}

export async function apiLogin(email, password) {
  // demo mode chỉ khi cả email lẫn password đều là 'demo'
  if (email === 'demo' && password === 'demo') {
    saveConfig('demo', 'demo');
    return demoCall('login', {}, { email, password });
  }
  // real login: luôn dùng URL thật, bỏ qua nc_api_url = 'demo' từ session cũ
  const { apiUrl } = getConfig();
  const url = (!apiUrl || apiUrl === 'demo') ? DEFAULT_API_URL : apiUrl;
  saveConfig(url, getConfig().token); // đảm bảo URL thật được lưu lại
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'login', data: { email, password } }),
  });
  return parseResponse(res);
}

export async function apiPost(action, data) {
  const { apiUrl, token } = getConfig();
  if (!apiUrl) throw new Error('Chưa cấu hình API URL');
  if (apiUrl === 'demo') return demoCall(action, {}, data);
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token, data }),
  });
  return parseResponse(res);
}

export function exportCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(',')].concat(
    rows.map((r) => headers.map((h) => escape(r[h])).join(','))
  );
  // BOM để Excel đọc đúng UTF-8 tiếng Việt
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
