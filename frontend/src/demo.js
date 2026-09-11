// Chế độ demo: nhập API URL = "demo" ở màn đăng nhập để chạy với dữ liệu mẫu
// (lưu trong bộ nhớ trình duyệt, mất khi reload). Dùng để xem UI trước khi có backend.

const db = {
  user: { email: 'demo@khoa.vn', role: 'admin', name: 'BS. Demo', assigned_studies: 'ALL' },
  nl_sites: [
    { site_id: 'ND115', site_name: 'Nhân Dân 115',      city: 'TP.HCM',     status: 'Recruiting',         pi_name: 'PGS.TS Nguyễn Huy Thắng', target_enrollment: 40 },
    { site_id: 'TNH',   site_name: 'Thống Nhất',         city: 'TP.HCM',     status: 'Recruiting',         pi_name: '',  target_enrollment: 30 },
    { site_id: 'QY175', site_name: 'Quân Y 175',         city: 'TP.HCM',     status: 'Recruiting',         pi_name: '',  target_enrollment: 20 },
    { site_id: 'DNA',   site_name: 'Đà Nẵng',            city: 'Đà Nẵng',    status: 'Recruiting',         pi_name: '',  target_enrollment: 30 },
    { site_id: 'VTI',   site_name: 'Việt Tiệp',          city: 'Hải Phòng',  status: 'Recruiting',         pi_name: '',  target_enrollment: 25 },
    { site_id: 'YHN',   site_name: 'Y Hà Nội',           city: 'Hà Nội',     status: 'Not yet recruiting', pi_name: '',  target_enrollment: 30 },
    { site_id: 'QY103', site_name: 'Quân Y 103',         city: 'Hà Nội',     status: 'Not yet recruiting', pi_name: '',  target_enrollment: 20 },
    { site_id: 'CTH',   site_name: 'ĐKTW Cần Thơ',       city: 'Cần Thơ',    status: 'Recruiting',         pi_name: '',  target_enrollment: 25 },
    { site_id: 'UHU',   site_name: 'Trung Ương Huế',     city: 'Huế',        status: 'Recruiting',         pi_name: '',  target_enrollment: 20 },
    { site_id: 'CDO',   site_name: 'Châu Đốc',           city: 'An Giang',   status: 'Recruiting',         pi_name: '',  target_enrollment: 15 },
  ],
  nl_patients: (function() { try { return JSON.parse(localStorage.getItem('demo_nl_patients') || '[]'); } catch(e) { return []; } })(),
  users: [
    { email: 'demo@khoa.vn', role: 'admin', name: 'BS. Demo', assigned_studies: 'ALL', has_token: true },
    { email: 'bs.nguyen@khoa.vn', role: 'investigator', name: 'BS. Nguyễn', assigned_studies: 'NC001,NC002', has_token: true },
    { email: 'bs.tran@khoa.vn', role: 'readonly', name: 'BS. Trần', assigned_studies: 'ALL', has_token: true },
  ],
  log: [
    { timestamp: new Date().toISOString(), user_email: 'demo@khoa.vn', action: 'addStudy', study_id: 'NC001', detail: '{"title":"Registry đột quỵ"}' },
    { timestamp: new Date(Date.now()-3600000).toISOString(), user_email: 'demo@khoa.vn', action: 'addPatient', study_id: 'NC001', detail: '{"patient_code":"NC001-001"}' },
  ],
  studies: [
    { study_id: 'NC001', title: 'Registry đột quỵ thiếu máu não cấp', type: 'Observational', sponsor: '', phase: 'N/A', status: 'Active', pi_name: 'BS. A', target_n: 100, start_date: '2025-09-01', expected_end: '2026-12-31', irb_number: 'IRB-2025-042', irb_expiry: '2026-07-01' },
    { study_id: 'NC002', title: 'Trial ABC-123 — kháng đông sớm sau đột quỵ (site 04)', type: 'RCT_sponsor', sponsor: 'Boehringer', phase: 'III', status: 'Active', pi_name: 'BS. A', target_n: 30, start_date: '2025-06-01', expected_end: '2027-06-01', irb_number: 'IRB-2025-021', irb_expiry: '2026-06-25' },
    { study_id: 'NC003', title: 'RCT can thiệp phục hồi sớm sau EVT', type: 'RCT_investigator', sponsor: 'Internal', phase: 'II', status: 'Active', pi_name: 'BS. B', target_n: 80, start_date: '2025-01-15', expected_end: '2026-10-30', irb_number: 'IRB-2024-088', irb_expiry: '2026-10-30' },
    { study_id: 'NC004', title: 'Khảo sát rung nhĩ tiềm ẩn sau đột quỵ cryptogenic', type: 'Observational', sponsor: '', phase: 'N/A', status: 'Planning', pi_name: 'BS. C', target_n: 60, start_date: '2026-08-01', expected_end: '2027-08-01', irb_number: '', irb_expiry: '' },
  ],
  patients: [],
  milestones: [
    { milestone_id: 'MS001', study_id: 'NC002', milestone_name: 'Site Initiation Visit', planned_date: '2025-07-10', actual_date: '2025-07-10', status: 'Done', owner: 'BS. A' },
    { milestone_id: 'MS002', study_id: 'NC002', milestone_name: 'First Patient In', planned_date: '2025-08-01', actual_date: '2025-08-12', status: 'Done', owner: 'BS. A' },
    { milestone_id: 'MS003', study_id: 'NC002', milestone_name: 'Last Patient In', planned_date: '2026-09-01', actual_date: '', status: 'Pending', owner: 'BS. A' },
    { milestone_id: 'MS004', study_id: 'NC003', milestone_name: 'Database Lock', planned_date: '2026-05-30', actual_date: '', status: 'Pending', owner: 'BS. B' },
    { milestone_id: 'MS005', study_id: 'NC004', milestone_name: 'Nộp đạo đức', planned_date: '2026-07-01', actual_date: '', status: 'Pending', owner: 'BS. C' },
  ],
  documents: [
    { doc_id: 'DOC001', study_id: 'NC002', doc_type: 'Protocol', version: 'v3.0', status: 'Approved', gdrive_link: 'https://drive.google.com/demo', expiry_date: '' },
    { doc_id: 'DOC002', study_id: 'NC002', doc_type: 'ICF', version: 'v2.1', status: 'Approved', gdrive_link: 'https://drive.google.com/demo', expiry_date: '' },
    { doc_id: 'DOC003', study_id: 'NC002', doc_type: 'IRB_approval', version: 'v1.0', status: 'Approved', gdrive_link: 'https://drive.google.com/demo', expiry_date: '2026-06-25' },
    { doc_id: 'DOC004', study_id: 'NC003', doc_type: 'Protocol', version: 'v1.2', status: 'Approved', gdrive_link: 'https://drive.google.com/demo', expiry_date: '' },
  ],
};

// Sinh bệnh nhân mẫu rải đều 10 tháng gần nhất
(function seedPatients() {
  const cfg = [['NC001', 41], ['NC002', 24], ['NC003', 72]];
  const doctors = ['BS. D', 'BS. E', 'BS. F'];
  const statuses = ['Enrolled', 'Enrolled', 'Enrolled', 'Completed', 'Withdrawn'];
  cfg.forEach(([sid, n]) => {
    for (let i = 1; i <= n; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (i % 10));
      d.setDate(1 + (i * 7) % 27);
      const status = statuses[i % statuses.length];
      db.patients.push({
        patient_code: sid + '-' + String(i).padStart(3, '0'),
        study_id: sid,
        screen_date: d.toISOString().slice(0, 10),
        enroll_date: status === 'Screened' ? '' : d.toISOString().slice(0, 10),
        status,
        withdrawal_reason: status === 'Withdrawn' ? 'Rút consent' : '',
        sub_investigator: doctors[i % doctors.length],
        notes: '',
      });
    }
  });
})();

function enrolledCount(sid) {
  return db.patients.filter((p) => p.study_id === sid && ['Enrolled', 'Completed'].includes(p.status)).length;
}

function withEnrolled(studies) {
  return studies.map((s) => ({ ...s, enrolled_n: enrolledCount(s.study_id) }));
}

function withOverdue(ms) {
  const today = new Date();
  return ms.map((m) => ({
    ...m,
    status: m.status !== 'Done' && m.planned_date && new Date(m.planned_date) < today ? 'Overdue' : m.status,
  }));
}

function alerts() {
  const out = [];
  const today = new Date();
  const soon = new Date(today.getTime() + 30 * 86400000);
  withEnrolled(db.studies).forEach((s) => {
    if (s.irb_expiry && new Date(s.irb_expiry) <= soon) {
      out.push({ level: 'red', type: 'IRB_EXPIRY', study_id: s.study_id, message: 'IRB hết hạn ' + s.irb_expiry });
    }
    if (s.status === 'Active' && s.target_n && s.start_date && s.expected_end) {
      const total = new Date(s.expected_end) - new Date(s.start_date);
      const elapsed = today - new Date(s.start_date);
      if (total > 0 && elapsed / total >= 0.5 && s.enrolled_n / s.target_n < 0.7) {
        out.push({ level: 'orange', type: 'SLOW_ENROLLMENT', study_id: s.study_id, message: 'enroll ' + s.enrolled_n + '/' + s.target_n + ' — chậm tiến độ' });
      }
    }
  });
  withOverdue(db.milestones).filter((m) => m.status === 'Overdue').forEach((m) => {
    out.push({ level: 'yellow', type: 'MILESTONE_OVERDUE', study_id: m.study_id, message: '"' + m.milestone_name + '" quá hạn ' + m.planned_date });
  });
  db.documents.forEach((d) => {
    if (d.expiry_date && d.status === 'Approved' && new Date(d.expiry_date) <= soon) {
      out.push({ level: 'red', type: 'DOC_EXPIRY', study_id: d.study_id, message: 'Tài liệu ' + d.doc_type + ' hết hạn ' + d.expiry_date });
    }
  });
  return out;
}

function nextId(list, field, prefix) {
  const max = list.reduce((m, r) => {
    const n = parseInt(String(r[field]).replace(prefix, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return prefix + String(max + 1).padStart(3, '0');
}

export function demoCall(action, params = {}, data = {}) {
  switch (action) {
    case 'login': {
      if (data.email === 'demo' && data.password === 'demo') {
        return { token: 'demo', email: 'demo@demo.com', role: 'admin', name: 'Demo User', assigned_studies: 'ALL' };
      }
      throw new Error('Demo: nhập "demo" vào cả email và mật khẩu');
    }
    case 'setPassword': return { ok: true, email: data.email || db.user.email };
    case 'whoami': return { ...db.user };
    case 'listStudies': return withEnrolled(db.studies);
    case 'getStudy': {
      const s = withEnrolled(db.studies).find((x) => x.study_id === params.study_id);
      if (!s) throw new Error('Không tìm thấy ' + params.study_id);
      return {
        ...s,
        patients: db.patients.filter((p) => p.study_id === s.study_id),
        milestones: withOverdue(db.milestones.filter((m) => m.study_id === s.study_id)),
        documents: db.documents.filter((d) => d.study_id === s.study_id),
      };
    }
    case 'listPatients': return params.study_id ? db.patients.filter((p) => p.study_id === params.study_id) : [...db.patients];
    case 'listMilestones': return withOverdue(params.study_id ? db.milestones.filter((m) => m.study_id === params.study_id) : db.milestones);
    case 'listDocuments': return params.study_id ? db.documents.filter((d) => d.study_id === params.study_id) : [...db.documents];
    case 'dashboard': {
      const studies = withEnrolled(db.studies);
      const allMs = withOverdue(db.milestones);
      const today = new Date();
      const soon = new Date(today.getTime() + 30 * 86400000);
      const in60 = new Date(today.getTime() + 60 * 86400000);
      const in90 = new Date(today.getTime() + 90 * 86400000);
      const mStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const statusCounts = {};
      let enrolledTotal = 0, targetTotal = 0;
      studies.forEach(s => { statusCounts[s.status] = (statusCounts[s.status]||0)+1; enrolledTotal += s.enrolled_n||0; targetTotal += Number(s.target_n)||0; });
      const enrollByMonth = Array.from({length:6},(_,i)=>{
        const ms = new Date(today.getFullYear(), today.getMonth()-5+i, 1);
        const me = new Date(today.getFullYear(), today.getMonth()-5+i+1, 1);
        return { month: `${ms.getMonth()+1}/${ms.getFullYear()}`, count: db.patients.filter(p=>p.enroll_date&&new Date(p.enroll_date)>=ms&&new Date(p.enroll_date)<me).length };
      });
      return {
        studies,
        alerts: alerts(),
        all_milestones: allMs,
        stats: {
          status_counts: statusCounts,
          enrolled_total: enrolledTotal,
          target_total: targetTotal,
          enrolled_this_month: db.patients.filter(p=>p.enroll_date&&new Date(p.enroll_date)>=mStart&&new Date(p.enroll_date)<mEnd).length,
          milestones_this_month: allMs.filter(m=>m.planned_date&&new Date(m.planned_date)>=mStart&&new Date(m.planned_date)<mEnd).length,
          milestones_overdue: allMs.filter(m=>m.status==='Overdue').length,
          docs_expiring: db.documents.filter(d=>d.expiry_date&&d.status==='Approved'&&new Date(d.expiry_date)<=soon).length,
        },
        upcoming_milestones: allMs.filter(m=>m.planned_date&&new Date(m.planned_date)<=in60&&m.status!=='Done').sort((a,b)=>new Date(a.planned_date)-new Date(b.planned_date)).slice(0,8),
        doc_deadlines: db.documents.filter(d=>d.expiry_date&&d.status==='Approved'&&new Date(d.expiry_date)<=in90).sort((a,b)=>new Date(a.expiry_date)-new Date(b.expiry_date)),
        recent_activity: [...db.log].reverse().slice(0,8),
        enroll_by_month: enrollByMonth,
      };
    }
    case 'addStudy': data.study_id = nextId(db.studies, 'study_id', 'NC'); db.studies.push({ ...data }); return data;
    case 'updateStudy': Object.assign(db.studies.find((s) => s.study_id === data.study_id), data); return data;
    case 'addPatient': {
      const seq = db.patients.filter((p) => p.study_id === data.study_id).length + 1;
      data.patient_code = data.study_id + '-' + String(seq).padStart(3, '0');
      db.patients.push({ ...data });
      return data;
    }
    case 'updatePatient': Object.assign(db.patients.find((p) => p.patient_code === data.patient_code), data); return data;
    case 'addMilestone': data.milestone_id = nextId(db.milestones, 'milestone_id', 'MS'); db.milestones.push({ ...data }); return data;
    case 'updateMilestone': Object.assign(db.milestones.find((m) => m.milestone_id === data.milestone_id), data); return data;
    case 'addDocument': {
      data.doc_id = nextId(db.documents, 'doc_id', 'DOC');
      if (data.status === 'Approved') {
        db.documents.forEach((d) => {
          if (d.study_id === data.study_id && d.doc_type === data.doc_type && d.status === 'Approved') d.status = 'Superseded';
        });
      }
      db.documents.push({ ...data });
      return data;
    }
    case 'updateDocument': Object.assign(db.documents.find((d) => d.doc_id === data.doc_id), data); return data;
    case 'deleteStudy': { const i = db.studies.findIndex((s) => s.study_id === data.study_id); if (i>=0) db.studies.splice(i,1); return { deleted: data.study_id }; }
    case 'deletePatient': { const i = db.patients.findIndex((p) => p.patient_code === data.patient_code); if (i>=0) db.patients.splice(i,1); return { deleted: data.patient_code }; }
    case 'deleteMilestone': { const i = db.milestones.findIndex((m) => m.milestone_id === data.milestone_id); if (i>=0) db.milestones.splice(i,1); return { deleted: data.milestone_id }; }
    case 'deleteDocument': { const i = db.documents.findIndex((d) => d.doc_id === data.doc_id); if (i>=0) db.documents.splice(i,1); return { deleted: data.doc_id }; }
    case 'listUsers': return [...db.users];
    case 'addUser': {
      if (db.users.find((u) => u.email === data.email)) throw new Error('Email đã tồn tại');
      const newUser = { ...data, has_token: true };
      db.users.push(newUser);
      return { email: data.email, token: 'demo-token-' + Date.now() };
    }
    case 'deleteUser': { const i = db.users.findIndex((u) => u.email === data.email); if (i>=0) db.users.splice(i,1); return { deleted: data.email }; }
    case 'generateToken': return { token: 'demo-' + Math.random().toString(36).slice(2) };
    case 'listLog': return [...db.log];

    // ---- NEWLINE ----
    case 'nlListSites': return [...db.nl_sites];
    case 'nlDashboard': {
      const today = new Date();
      const in7 = new Date(today.getTime() + 7 * 86400000);
      const siteMap = {};
      db.nl_sites.forEach(s => {
        siteMap[s.site_id] = { ...s, enrolled: 0, completed_outcome: 0, overdue_outcome: 0, upcoming_outcome: 0 };
      });
      const patientsWithStatus = db.nl_patients.map(p => {
        let due_date_3m = '';
        if (p.enrollment_date) {
          const due = new Date(new Date(p.enrollment_date).getTime() + 90 * 86400000);
          due_date_3m = due.toISOString().slice(0, 10);
        }
        let fs = 'pending';
        if (p.mrs_3m !== '' && p.mrs_3m !== undefined && p.mrs_3m !== null) fs = 'completed';
        else if (due_date_3m) {
          const dueD = new Date(due_date_3m);
          if (dueD < today) fs = 'overdue';
          else if (dueD <= in7) fs = 'upcoming';
        }
        return { ...p, due_date_3m, follow_status: fs };
      });
      const alerts = [];
      patientsWithStatus.forEach(p => {
        if (siteMap[p.site_id]) siteMap[p.site_id].enrolled++;
        if (p.follow_status === 'completed' && siteMap[p.site_id]) siteMap[p.site_id].completed_outcome++;
        else if (p.follow_status === 'overdue') {
          if (siteMap[p.site_id]) siteMap[p.site_id].overdue_outcome++;
          alerts.push({ level: 'red', patient_id: p.patient_id, site_id: p.site_id, due_date: p.due_date_3m, message: p.patient_id + ' — quá hạn đánh giá 3 tháng (hạn ' + p.due_date_3m + ')' });
        } else if (p.follow_status === 'upcoming') {
          if (siteMap[p.site_id]) siteMap[p.site_id].upcoming_outcome++;
          const daysLeft = Math.ceil((new Date(p.due_date_3m) - today) / 86400000);
          alerts.push({ level: 'orange', patient_id: p.patient_id, site_id: p.site_id, due_date: p.due_date_3m, message: p.patient_id + ' — đánh giá 3 tháng trong ' + daysLeft + ' ngày' });
        }
      });
      const siteIds = db.nl_sites.map(s => s.site_id);
      const totalTarget = db.nl_sites.reduce((s, site) => s + (parseInt(site.target_enrollment) || 0), 0);
      const STUDY_MONTHS = 12;
      const plannedPerMonth = totalTarget > 0 ? totalTarget / STUDY_MONTHS : 0;
      const enrollByMonth = [];
      let cur = new Date(2026, 7, 1);
      let monthIndex = 0;
      while (cur <= today) {
        const ms = new Date(cur);
        const me = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        const entry = {
          month: `${cur.getMonth()+1}/${cur.getFullYear()}`,
          count: 0,
          planned: Math.round(plannedPerMonth * (monthIndex + 1)),
          planned_month: Math.round(plannedPerMonth),
        };
        siteIds.forEach(sid => {
          const cnt = patientsWithStatus.filter(p => p.site_id === sid && p.enrollment_date && new Date(p.enrollment_date) >= ms && new Date(p.enrollment_date) < me).length;
          entry[sid] = cnt;
          entry.count += cnt;
        });
        enrollByMonth.push(entry);
        cur = me; monthIndex++;
      }
      return {
        sites: Object.values(siteMap),
        patients_total: patientsWithStatus.length,
        completed_total: patientsWithStatus.filter(p => p.follow_status === 'completed').length,
        overdue_total: patientsWithStatus.filter(p => p.follow_status === 'overdue').length,
        upcoming_total: patientsWithStatus.filter(p => p.follow_status === 'upcoming').length,
        total_target: totalTarget,
        site_ids: siteIds,
        alerts: alerts.sort((a, b) => a.level === 'red' ? -1 : 1),
        enroll_by_month: enrollByMonth,
      };
    }
    case 'nlListPatients': {
      const today = new Date();
      const in7 = new Date(today.getTime() + 7 * 86400000);
      const list = db.nl_patients.map(p => {
        let due_date_3m = '';
        if (p.enrollment_date) {
          const due = new Date(new Date(p.enrollment_date).getTime() + 90 * 86400000);
          due_date_3m = due.toISOString().slice(0, 10);
        }
        let fs = 'pending';
        if (p.mrs_3m !== '' && p.mrs_3m !== undefined && p.mrs_3m !== null) fs = 'completed';
        else if (due_date_3m) {
          const dueD = new Date(due_date_3m);
          if (dueD < today) fs = 'overdue';
          else if (dueD <= in7) fs = 'upcoming';
        }
        return { ...p, due_date_3m, follow_status: fs };
      });
      return params.site_id ? list.filter(p => p.site_id === params.site_id) : list;
    }
    case 'nlAddPatient': {
      const maxSeq = db.nl_patients.reduce((m, p) => Math.max(m, parseInt(p.seq_num) || 0), 0);
      const seq = maxSeq + 1;
      const newP = { ...data, seq_num: seq, patient_id: 'NEWLINE-' + data.site_id + '-' + String(seq).padStart(3,'0'), created_at: new Date().toISOString().slice(0,10) };
      db.nl_patients.push(newP);
      try { localStorage.setItem('demo_nl_patients', JSON.stringify(db.nl_patients)); } catch(e) {}
      return newP;
    }
    case 'nlUpdatePatient': {
      const i = db.nl_patients.findIndex(p => p.patient_id === data.patient_id);
      if (i >= 0) {
        // Nếu site thay đổi → cập nhật patient_id
        if (data.site_id && data.site_id !== db.nl_patients[i].site_id) {
          data.patient_id = 'NEWLINE-' + data.site_id + '-' + String(db.nl_patients[i].seq_num).padStart(3,'0');
        }
        Object.assign(db.nl_patients[i], data);
      }
      try { localStorage.setItem('demo_nl_patients', JSON.stringify(db.nl_patients)); } catch(e) {}
      return data;
    }
    case 'nlDeletePatient': {
      const i = db.nl_patients.findIndex(p => p.patient_id === data.patient_id);
      if (i >= 0) db.nl_patients.splice(i, 1);
      try { localStorage.setItem('demo_nl_patients', JSON.stringify(db.nl_patients)); } catch(e) {}
      return { deleted: data.patient_id };
    }
    case 'nlSetupSheets': return { message: 'Demo: sheets ready' };
    case 'nlUpdateSite': {
      const i = db.nl_sites.findIndex(s => s.site_id === data.site_id);
      if (i >= 0) Object.assign(db.nl_sites[i], data);
      return data;
    }

    default: throw new Error('Demo chưa hỗ trợ action: ' + action);
  }
}
