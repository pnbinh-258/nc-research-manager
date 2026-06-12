import React from 'react';

export const TYPE_LABELS = {
  Observational: 'Quan sát',
  RCT_sponsor: 'RCT sponsor',
  RCT_investigator: 'RCT khoa',
};

export const STUDY_STATUS = ['Planning', 'Active', 'Paused', 'Completed'];
export const PATIENT_STATUS = ['Screened', 'Enrolled', 'Withdrawn', 'Completed'];
export const MILESTONE_STATUS = ['Pending', 'Done'];
export const DOC_TYPES = ['Protocol', 'ICF', 'CRF', 'IRB_approval', 'Amendment', 'SAE_report'];
export const DOC_STATUS = ['Draft', 'Approved', 'Superseded'];

export function Badge({ value, label }) {
  if (!value) return null;
  return <span className={'badge ' + value}>{label || value}</span>;
}

export function Progress({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="progress"><div style={{ width: pct + '%' }} /></div>
      <div className="muted" style={{ marginTop: 4 }}>{value}/{max || '?'} BN ({pct}%)</div>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 0 }}>{title}</h3>
          <button className="small" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return <div className="error-box">⚠️ {String(error)}</div>;
}

export function Spinner() {
  return <div className="empty">Đang tải dữ liệu…</div>;
}

export function canWrite(user, studyId) {
  if (user.role === 'admin') return true;
  if (user.role !== 'investigator') return false;
  const assigned = String(user.assigned_studies || '');
  return assigned === 'ALL' || assigned.split(',').map((s) => s.trim()).includes(studyId);
}

export function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString('vi-VN');
}

export function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}
