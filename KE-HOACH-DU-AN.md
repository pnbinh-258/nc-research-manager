# Kế hoạch Dự án — Web App Quản lý Nghiên cứu Khoa Bệnh lý Mạch máu não

> Phiên bản 1.0 — 11/06/2026
> Tech stack: **React (PWA) + Google Apps Script + Google Sheets**

## 1. Mục tiêu

Quản lý tập trung các nghiên cứu y khoa đang tiến hành tại khoa, gồm 3 loại:

| Loại | Mã | Đặc điểm quản lý |
|---|---|---|
| Nghiên cứu quan sát | `Observational` | Đơn giản: IRB + enrollment + tiến độ |
| RCT sponsor (khoa là 1 site) | `RCT_sponsor` | Thêm: milestone theo sponsor (SIV, FPI, LPO, DB Lock), báo cáo sponsor, SAE |
| RCT khoa tự phát triển | `RCT_investigator` | Thêm: tự quản lý protocol/amendment, randomization, DSMB |

Quy mô: 3–7 nghiên cứu đồng thời, < 200 bệnh nhân, ~5–10 người dùng.

## 2. Kiến trúc

```
React Frontend (PWA, host GitHub Pages/Netlify)
        │ fetch GET/POST (JSON)
Google Apps Script Web App (doGet/doPost)
        │
Google Sheets (database, 5 sheet + 1 sheet mapping bảo mật riêng)
```

## 3. Data Model — 5 sheet

### `Studies`
`study_id, title, type, sponsor, phase, status, pi_name, target_n, start_date, expected_end, irb_number, irb_expiry`
- `enrolled_n` **không lưu** — backend tự đếm từ `Patients` khi trả về.
- `status`: Planning / Active / Paused / Completed

### `Patients` (pseudonymized — không bao giờ có tên thật)
`patient_code, study_id, screen_date, enroll_date, status, withdrawal_reason, sub_investigator, notes`
- `patient_code` tự sinh dạng `NC001-007`.
- `status`: Screened / Enrolled / Withdrawn / Completed

### `Milestones`
`milestone_id, study_id, milestone_name, planned_date, actual_date, status, owner`
- `status`: Pending / Done / Overdue (Overdue tự tính khi planned_date < hôm nay và chưa Done)

### `Documents`
`doc_id, study_id, doc_type, version, status, gdrive_link, expiry_date`
- `doc_type`: Protocol / ICF / CRF / IRB_approval / Amendment / SAE_report

### `ActivityLog` (audit trail)
`timestamp, user_email, action, study_id, detail`

### Sheet mapping bảo mật (TÁCH RIÊNG)
- File Google Sheets **riêng biệt**, chỉ PI có quyền truy cập: `patient_code ↔ họ tên / số nhập viện`.
- API và frontend **không bao giờ** đọc file này.

## 4. Modules Frontend

1. **Dashboard** (ưu tiên 1): thẻ tóm tắt mỗi NC (badge loại, progress bar enrolled/target), cảnh báo 🔴 IRB < 30 ngày / 🟡 milestone overdue / 🟠 enrollment chậm, biểu đồ enrollment theo tháng (recharts).
2. **Quản lý nghiên cứu**: CRUD study, trang chi tiết tab Overview/Patients/Milestones/Documents.
3. **Quản lý bệnh nhân**: thêm BN (tự sinh code), cập nhật status, filter, export CSV (chỉ patient_code).
4. **Quản lý tài liệu**: link GDrive, cảnh báo hết hạn, version đơn giản (Approved mới → bản cũ Superseded).
5. **Phân quyền**: admin / investigator / readonly — kiểm soát ở Apps Script theo email Google đăng nhập.

## 5. Lộ trình — 4 Sprint (~4 tuần bán thời gian)

| Sprint | Deliverable | Trạng thái |
|---|---|---|
| 1 | GSheets schema + Apps Script API (CRUD đầy đủ) + auth token theo user | ✅ `apps-script/Code.gs` |
| 2 | React app + Dashboard (thẻ NC, progress, cảnh báo, biểu đồ enrollment) | ✅ `frontend/` |
| 3 | Module Patients + Milestones + pseudonymization (mã BN tự sinh) | ✅ `frontend/` |
| 4 | Module Documents (version control) + export CSV + chế độ demo | ✅ `frontend/` |

> Code hoàn chỉnh, đã test qua chế độ demo và build production thành công. Việc còn lại là **triển khai**: tạo Google Sheets + deploy Apps Script + deploy frontend (xem checklist dưới).

## 6. Checklist triển khai Sprint 1

- [ ] Tạo Google Sheets mới tên `NC-Database`
- [ ] Mở Extensions → Apps Script, dán nội dung `apps-script/Code.gs`
- [ ] Chạy hàm `setupDatabase()` một lần để tạo 5 sheet + header
- [ ] Sửa danh sách user trong sheet `Users` (email + role)
- [ ] Deploy → New deployment → Web app → Execute as: Me, Access: Anyone with Google account
- [ ] Test API bằng URL `?action=listStudies`
- [ ] Tạo file Sheets riêng cho mapping tên thật, chỉ share cho PI

Chi tiết từng bước: xem [apps-script/HUONG-DAN-TRIEN-KHAI.md](apps-script/HUONG-DAN-TRIEN-KHAI.md)

## 7. Khác biệt so với app Đi Buồng

- Không cần real-time sync → Apps Script đơn giản hơn
- Pseudonymization: mapping table tách file riêng
- Multi-study: mọi entity FK theo `study_id`
- Audit log mọi thao tác ghi (quan trọng với RCT sponsor)
- Document version control
