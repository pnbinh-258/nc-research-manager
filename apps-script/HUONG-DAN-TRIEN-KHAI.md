# Hướng dẫn Triển khai Sprint 1 — Apps Script API

## Bước 1 — Tạo database
1. Tạo Google Sheets mới, đặt tên `NC-Database`.
2. Menu **Extensions → Apps Script**.
3. Xoá nội dung mặc định, dán toàn bộ file `Code.gs` vào.
4. Lưu (Ctrl+S), đặt tên project `NC-API`.

## Bước 2 — Khởi tạo schema
1. Trong editor Apps Script, chọn hàm `setupDatabase` → bấm **Run**.
2. Cấp quyền khi được hỏi (lần đầu).
3. Quay lại Sheets: sẽ thấy 6 sheet `Studies, Patients, Milestones, Documents, ActivityLog, Users` với header sẵn.
4. Email của anh đã tự thêm vào `Users` với role `admin`.

## Bước 3 — Thêm người dùng (token-based auth)
Vào sheet `Users`, mỗi dòng 1 người. Cột `token` là "mật khẩu" cá nhân để đăng nhập từ frontend — sinh token bằng cách chạy hàm `newToken_()` trong editor (View → Logs để xem giá trị) hoặc tự đặt chuỗi ngẫu nhiên dài ≥ 20 ký tự:

| email | role | name | assigned_studies | token |
|---|---|---|---|---|
| pi@gmail.com | admin | BS. A | ALL | a1b2c3… |
| bs.b@gmail.com | investigator | BS. B | NC001,NC003 | d4e5f6… |
| lanhdao@gmail.com | readonly | BS. C | | g7h8i9… |

Gửi riêng token cho từng người (Zalo/email cá nhân). Thu hồi quyền = xoá token trong sheet.

## Bước 4 — Deploy Web App
1. **Deploy → New deployment → Web app**
2. Execute as: **Me** · Who has access: **Anyone**
   > Phải là "Anyone" (không phải "Anyone with Google account") thì React app mới gọi được API cross-origin. Bảo mật do token đảm nhiệm — ai không có token chỉ nhận được lỗi UNAUTHORIZED.
3. Copy **Web app URL** — đây là `API_URL` để đăng nhập từ frontend.

> ⚠️ Mỗi lần sửa code phải **Deploy → Manage deployments → Edit → New version** thì URL mới nhận code mới.

## Bước 5 — Test API
Mở trình duyệt:

```
<API_URL>?action=whoami&token=<TOKEN>        → trả về email + role
<API_URL>?action=listStudies&token=<TOKEN>   → danh sách NC (rỗng ban đầu)
<API_URL>?action=dashboard&token=<TOKEN>     → studies + alerts
```

Test POST (Postman hoặc fetch, kèm `"token"` trong body):
```json
{ "action": "addStudy", "token": "<TOKEN>", "data": {
    "title": "Registry đột quỵ thiếu máu não cấp",
    "type": "Observational", "status": "Active",
    "pi_name": "BS. A", "target_n": 100,
    "start_date": "2026-06-01", "expected_end": "2027-06-01",
    "irb_number": "IRB-2026-015", "irb_expiry": "2027-06-01" } }
```

## Bước 6 — File mapping tên thật (BẢO MẬT)
1. Tạo **file Google Sheets riêng** tên `NC-Mapping-CONFIDENTIAL`.
2. Cột: `patient_code | họ tên | số nhập viện | ngày sinh`.
3. **Chỉ share cho PI** — tuyệt đối không share chung, không liên kết với API.

## Danh sách action API

| Action | Method | Quyền | Tham số |
|---|---|---|---|
| whoami | GET | tất cả | — |
| dashboard | GET | tất cả | — |
| listStudies | GET | tất cả | — |
| getStudy | GET | tất cả | `study_id` |
| listPatients / listMilestones / listDocuments | GET | tất cả | `study_id` (tuỳ chọn) |
| addStudy / updateStudy | POST | admin | `data` |
| addPatient / updatePatient | POST | admin, investigator (NC được assign) | `data` |
| addMilestone / updateMilestone | POST | như trên | `data` |
| addDocument / updateDocument | POST | như trên | `data` |

Mọi POST đều tự ghi vào `ActivityLog`.

---

## Triển khai Frontend (React)

Code nằm trong thư mục `frontend/`. Yêu cầu Node.js ≥ 18.

```powershell
cd frontend
npm install
npm run dev        # chạy thử local tại http://localhost:5173
npm run build      # build production → thư mục dist/
```

**Deploy miễn phí** (chọn 1):
- **Netlify**: kéo-thả thư mục `dist/` vào https://app.netlify.com/drop
- **GitHub Pages**: push repo, bật Pages trỏ vào `dist/` (hoặc dùng action build)
- **Vercel**: `npx vercel` trong thư mục `frontend/`

**Đăng nhập**: mở app → nhập API URL (bản `/exec` ở Bước 4) + token cá nhân → Đăng nhập. Cấu hình lưu trong trình duyệt, lần sau tự vào.

**Chế độ demo**: nhập `demo` vào cả 2 ô để xem app với dữ liệu mẫu (không cần backend).
