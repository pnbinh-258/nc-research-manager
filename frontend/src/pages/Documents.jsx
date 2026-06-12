import React, { useEffect, useState } from 'react';
import { apiGet } from '../api.js';
import { Badge, ErrorBox, Spinner, fmtDate, daysUntil, DOC_TYPES } from '../ui.jsx';

export default function Documents() {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStudy, setFilterStudy] = useState('');

  useEffect(() => {
    apiGet('listDocuments').then(setDocs).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox error={error} />;
  if (!docs) return <Spinner />;

  const studyIds = [...new Set(docs.map((d) => d.study_id))].sort();
  const filtered = docs.filter((d) =>
    (!filterType || d.doc_type === filterType) &&
    (!filterStudy || d.study_id === filterStudy)
  );
  const expiring = docs.filter((d) => {
    const days = daysUntil(d.expiry_date);
    return d.status === 'Approved' && days !== null && days < 30;
  });

  return (
    <div>
      <h1>Tài liệu (toàn khoa)</h1>
      <p className="muted" style={{ marginBottom: 12 }}>
        Thêm/sửa tài liệu trong trang chi tiết từng nghiên cứu.
      </p>

      {expiring.length > 0 && (
        <div className="card">
          {expiring.map((d) => (
            <div key={d.doc_id} className="alert red">
              🔴 <a className="link" href={'#/studies/' + d.study_id}>{d.study_id}</a> — {d.doc_type} {d.version} hết hạn {fmtDate(d.expiry_date)}
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ marginBottom: 14 }}>
        <select style={{ width: 'auto' }} value={filterStudy} onChange={(e) => setFilterStudy(e.target.value)}>
          <option value="">Tất cả NC</option>
          {studyIds.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={{ width: 'auto' }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Tất cả loại</option>
          {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data">
          <thead><tr><th>Nghiên cứu</th><th>Loại</th><th>Version</th><th>Trạng thái</th><th>Hết hạn</th><th>Link</th></tr></thead>
          <tbody>
            {filtered.map((d) => {
              const days = daysUntil(d.expiry_date);
              return (
                <tr key={d.doc_id}>
                  <td><a className="link" href={'#/studies/' + d.study_id}>{d.study_id}</a></td>
                  <td>{d.doc_type}</td>
                  <td>{d.version}</td>
                  <td><Badge value={d.status} /></td>
                  <td style={days !== null && days < 30 && d.status === 'Approved' ? { color: 'var(--red)', fontWeight: 600 } : {}}>
                    {fmtDate(d.expiry_date)}
                  </td>
                  <td>{d.gdrive_link && <a className="link" href={d.gdrive_link} target="_blank" rel="noreferrer">Mở ↗</a>}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan="6" className="empty">Không có tài liệu.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
