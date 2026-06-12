# Thông tin Triển khai Thực tế — 11/06/2026

## 🌐 Địa chỉ hệ thống (đã LIVE)

| Thành phần | Địa chỉ |
|---|---|
| **Web app** (gửi link này cho người dùng) | https://script.google.com/macros/s/AKfycbxXr89yyyRlMOrQMbmpdPhxM4wWSWMEUtVjfmXZirN5XLN2tVAcpijVCMWXQ1-O2pRP/exec |
| Database (Google Sheets `NC-Database`) | https://docs.google.com/spreadsheets/d/1om5Ztira3rzOK-Kl-yed1d8zuHQUXceyOx_flz7xTEs/edit |
| Apps Script project `NC-API` | https://script.google.com/u/0/home/projects/1hqfVB8L1znCaXOL87wU_uaVM2yO1ZJNgQgdezqhPORcl9NNRUqrkTpQ0/edit |
| Mapping danh tính (CHỈ PI) `NC-Mapping-CONFIDENTIAL` | https://docs.google.com/spreadsheets/d/14J8LuMfWT0rAOCscHpCecI1zwyc-IH2ivPCIJMpqsew/edit |

- Web app **vừa là frontend vừa là API** — một URL duy nhất, không cần hosting riêng.
- Deployment ID: `AKfycbxXr89yyyRlMOrQMbmpdPhxM4wWSWMEUtVjfmXZirN5XLN2tVAcpijVCMWXQ1-O2pRP`
- Đăng nhập: mở web app → API URL đã tự điền → nhập **token cá nhân** (cột `token`, sheet `Users`).
- Token admin hiện tại: xem sheet `Users` dòng 2.

## ✅ Đã kiểm chứng end-to-end (11/06/2026)

- `setupDatabase()` đã chạy — 6 sheet với header chuẩn
- API GET (`whoami`, `dashboard`) và POST (`addStudy`) trả về đúng
- Đăng nhập UI bằng token → Dashboard hiển thị dữ liệu thật
- Thêm BN qua UI → tự sinh mã `NC001-001`, lưu vào Sheets
- ActivityLog ghi nhận đủ mọi thao tác ghi (user, action, detail)
- NC001 "Registry đột quỵ thiếu máu não cấp" là **dữ liệu test** — anh có thể sửa lại thông tin thật (nút Sửa) hoặc xoá dòng trong sheet `Studies` + `Patients`.

## 👥 Thêm người dùng mới

Vào sheet `Users` thêm dòng: email, role (`admin`/`investigator`/`readonly`), tên, `assigned_studies` (`ALL` hoặc `NC001,NC003`), token (chuỗi ngẫu nhiên ≥20 ký tự — chạy hàm `newToken_()` trong Apps Script editor để sinh). Gửi token riêng cho từng người.

## 🔄 Cập nhật code sau này

Toolchain đã cài sẵn: `clasp` (đã login), thư mục `gas/` đã liên kết project.

```powershell
# 1. Sửa code trong frontend/src hoặc apps-script/Code.gs
# 2. Build + gộp 1 file:
npm run build --prefix .\frontend
node .\frontend\tools\inline.mjs
# 3. Đồng bộ backend (nếu sửa Code.gs):
Copy-Item .\apps-script\Code.gs .\gas\Code.js -Force
# 4. Đẩy lên + deploy GIỮ NGUYÊN URL:
cd gas
clasp push -f
clasp deploy -i AKfycbxXr89yyyRlMOrQMbmpdPhxM4wWSWMEUtVjfmXZirN5XLN2tVAcpijVCMWXQ1-O2pRP --description "update"
```

> ⚠️ Dùng `clasp deploy -i <ID>` để cập nhật deployment cũ — nếu `clasp deploy` không có `-i` sẽ sinh URL mới.

## 🔐 Ghi chú bảo mật

- Apps Script deploy quyền **Anyone** — bảo mật bằng token, không có token chỉ nhận `UNAUTHORIZED`.
- Sheet `Patients` chỉ chứa mã BN (NC001-xxx). Mapping mã ↔ danh tính thật nằm ở file `NC-Mapping-CONFIDENTIAL` riêng biệt — **không share file này cho ai**.
- Thu hồi quyền 1 người = xoá token của họ trong sheet `Users`.
