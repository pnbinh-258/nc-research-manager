import React, { useEffect, useState } from 'react';
import { apiGet, exportCSV } from '../api.js';
import { Badge, ErrorBox, Spinner, fmtDate } from '../ui.jsx';

export default function Patients() {
  const [patients, setPatients] = useState(null);
  const [studies, setStudies] = useState([]);
  const [error, setError] = useState('');
  const [filterStudy, setFilterStudy] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');

  useEffect(() => {
    Promise.all([apiGet('listPatients'), apiGet('listStudies')])
      .then(([pts, sts]) => { setPatients(pts); setStudies(sts); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox error={error} />;
  if (!patients) return <Spinner />;

  const doctors = [...new Set(patients.map((p) => p.sub_investigator).filter(Boolean))].sort();
  const filtered = patients.filter((p) =>
    (!filterStudy || p.study_id === filterStudy) &&
    (!filterStatus || p.status === filterStatus) &&
    (!filterDoctor || p.sub_investigator === filterDoctor)
  );

  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1 style={{ marginBottom: 0 }}>Bệnh nhân (toàn khoa)</h1>
        <button onClick={() =>
          exportCSV('patients-export.csv',
            ['patient_code', 'study_id', 'screen_date', 'enroll_date', 'status', 'withdrawal_reason', 'sub_investigator'],
            filtered)}>
          ⬇ Export CSV ({filtered.length})
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        Thêm/sửa bệnh nhân trong trang chi tiết từng nghiên cứu. Export chỉ chứa mã nghiên cứu — không có danh tính thật.
      </p>

      <div className="row" style={{ marginBottom: 14 }}>
        <select style={{ width: 'auto' }} value={filterStudy} onChange={(e) => setFilterStudy(e.target.value)}>
          <option value="">Tất cả NC</option>
          {studies.map((s) => <option key={s.study_id} value={s.study_id}>{s.study_id} — {s.title.slice(0, 40)}</option>)}
        </select>
        <select style={{ width: 'auto' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {['Screened', 'Enrolled', 'Withdrawn', 'Completed'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={{ width: 'auto' }} value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}>
          <option value="">Tất cả BS</option>
          {doctors.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data">
          <thead><tr><th>Mã BN</th><th>Nghiên cứu</th><th>Sàng lọc</th><th>Enroll</th><th>Trạng thái</th><th>BS phụ trách</th></tr></thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.patient_code}>
                <td><b>{p.patient_code}</b></td>
                <td><a className="link" href={'#/studies/' + p.study_id}>{p.study_id}</a></td>
                <td>{fmtDate(p.screen_date)}</td>
                <td>{fmtDate(p.enroll_date)}</td>
                <td><Badge value={p.status} /></td>
                <td>{p.sub_investigator}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="6" className="empty">Không có bệnh nhân phù hợp bộ lọc.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
