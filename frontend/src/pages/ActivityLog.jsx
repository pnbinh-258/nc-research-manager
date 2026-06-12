import React, { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import { Spinner } from '../ui.jsx';

const ACTION_LABEL = {
  addStudy: 'Thêm NC', updateStudy: 'Sửa NC', deleteStudy: 'Xoá NC',
  addPatient: 'Thêm BN', updatePatient: 'Sửa BN', deletePatient: 'Xoá BN',
  addMilestone: 'Thêm MS', updateMilestone: 'Sửa MS', deleteMilestone: 'Xoá MS',
  addDocument: 'Thêm tài liệu', updateDocument: 'Sửa tài liệu', deleteDocument: 'Xoá tài liệu',
  addUser: 'Thêm user', deleteUser: 'Xoá user',
};

const ACTION_COLOR = {
  addStudy: 'Active', addPatient: 'Enrolled', addMilestone: 'Done', addDocument: 'Approved', addUser: 'Active',
  deleteStudy: 'Withdrawn', deletePatient: 'Withdrawn', deleteMilestone: 'Withdrawn', deleteDocument: 'Superseded', deleteUser: 'Withdrawn',
  updateStudy: 'Screened', updatePatient: 'Screened', updateMilestone: 'Pending', updateDocument: 'Draft',
};

function fmtTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  return d.toLocaleString('vi-VN');
}

export default function ActivityLog() {
  const [log, setLog] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    apiGet('listLog').then(setLog).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-box">⚠️ {error}</div>;
  if (!log) return <Spinner />;

  const rows = filter ? log.filter((r) => r.study_id === filter || r.user_email.includes(filter) || r.action.includes(filter)) : log;
  const studies = [...new Set(log.map((r) => r.study_id).filter(Boolean))].sort();

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1 style={{ marginBottom: 0 }}>Audit log</h1>
        <div className="row">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 140 }}>
            <option value="">Tất cả NC</option>
            {studies.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data">
          <thead>
            <tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Nghiên cứu</th><th>Chi tiết</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtTs(r.timestamp)}</td>
                <td style={{ fontSize: 12 }}>{r.user_email}</td>
                <td><span className={'badge ' + (ACTION_COLOR[r.action] || 'Screened')}>{ACTION_LABEL[r.action] || r.action}</span></td>
                <td>{r.study_id && <a className="link" href={'#/studies/' + r.study_id}>{r.study_id}</a>}</td>
                <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.detail}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty">Không có dữ liệu.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>Hiển thị 300 thao tác gần nhất, mới nhất lên trên.</p>
    </div>
  );
}
