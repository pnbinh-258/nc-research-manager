// API client cho Google Apps Script Web App.
// POST dùng Content-Type text/plain để tránh CORS preflight (Apps Script không trả OPTIONS).
import { demoCall } from './demo.js';

// URL mặc định — tự điền khi host trên GitHub Pages (không cần nhập tay)
export const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxXr89yyyRlMOrQMbmpdPhxM4wWSWMEUtVjfmXZirN5XLN2tVAcpijVCMWXQ1-O2pRP/exec';

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

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function apiLogin(email, password) {
  if (email === 'demo' && password === 'demo') {
    saveConfig('demo', 'demo');
    return demoCall('login', {}, { email, password });
  }
  const { apiUrl } = getConfig();
  // luôn dùng DEFAULT_API_URL nếu chưa có URL hợp lệ
  const baseUrl = (apiUrl && apiUrl !== 'demo' && apiUrl.startsWith('http'))
    ? apiUrl : DEFAULT_API_URL;
  saveConfig(baseUrl, getConfig().token);
  const ph = await sha256(password);
  // Dùng string concatenation thay new URL() để tránh lỗi trình duyệt với URL dài
  const fetchUrl = baseUrl
    + '?action=login'
    + '&email=' + encodeURIComponent(email.trim().toLowerCase())
    + '&ph=' + ph;
  const res = await fetch(fetchUrl);
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
