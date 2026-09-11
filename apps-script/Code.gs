/**
 * API Quản lý Nghiên cứu — Khoa Bệnh lý Mạch máu não
 * Google Apps Script Web App (backend cho React frontend)
 *
 * Triển khai: xem HUONG-DAN-TRIEN-KHAI.md
 * Chạy setupDatabase() MỘT LẦN trước khi deploy.
 */

// ===================== CẤU HÌNH =====================

var SHEETS = {
  STUDIES: 'Studies',
  PATIENTS: 'Patients',
  MILESTONES: 'Milestones',
  DOCUMENTS: 'Documents',
  LOG: 'ActivityLog',
  USERS: 'Users'
};

var SCHEMA = {
  Studies: ['study_id', 'title', 'type', 'sponsor', 'phase', 'status', 'pi_name',
            'target_n', 'start_date', 'expected_end', 'irb_number', 'irb_expiry'],
  Patients: ['patient_code', 'study_id', 'screen_date', 'enroll_date', 'status',
             'withdrawal_reason', 'sub_investigator', 'notes'],
  Milestones: ['milestone_id', 'study_id', 'milestone_name', 'planned_date',
               'actual_date', 'status', 'owner'],
  Documents: ['doc_id', 'study_id', 'doc_type', 'version', 'status',
              'gdrive_link', 'expiry_date'],
  ActivityLog: ['timestamp', 'user_email', 'action', 'study_id', 'detail'],
  Users: ['email', 'role', 'name', 'assigned_studies', 'token', 'password_hash'] // role: admin|investigator|readonly
};

// ===================== SPREADSHEET (STANDALONE) =====================

/** Lấy hoặc tạo Spreadsheet. ID lưu trong PropertiesService để dùng qua mọi lần gọi. */
function getOrCreateSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SS_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {}
  }
  // Chưa có → tạo mới
  var ss = SpreadsheetApp.create('NC Research Manager — Khoa BLMMN');
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

/** Trả về URL của Spreadsheet hiện tại (hoặc '' nếu chưa khởi tạo). */
function getSpreadsheetUrl_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SS_ID');
  if (!id) return '';
  return 'https://docs.google.com/spreadsheets/d/' + id;
}

// ===================== KHỞI TẠO DATABASE =====================

/** Chạy 1 lần để tạo toàn bộ sheet + header. An toàn khi chạy lại (không xoá dữ liệu). */
function setupDatabase() {
  var ss = getOrCreateSpreadsheet_();
  var adminToken = '';
  Object.keys(SCHEMA).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    var headers = SCHEMA[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  });
  var users = ss.getSheetByName(SHEETS.USERS);
  if (users.getLastRow() < 2) {
    adminToken = newToken_();
    users.appendRow([Session.getEffectiveUser().getEmail(), 'admin', 'PI', 'ALL', adminToken]);
  }
  return adminToken;
}

/** Endpoint không cần token — khởi tạo toàn bộ hệ thống lần đầu và trả về token admin. */
function firstRun_() {
  var props = PropertiesService.getScriptProperties();
  var apiUrl = ScriptApp.getService().getUrl();

  // Đã khởi tạo rồi — chỉ trả về url, không lộ token nữa
  if (props.getProperty('INITIALIZED') === '1') {
    return { already_setup: true, api_url: apiUrl, spreadsheet_url: getSpreadsheetUrl_() };
  }

  // Lần đầu: tạo spreadsheet, setup sheets, tạo admin user
  var adminToken = setupDatabase();

  // Setup NEWLINE sheets luôn
  var ss = getOrCreateSpreadsheet_();
  Object.keys(NL_SCHEMA).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    var headers = NL_SCHEMA[name];
    sheet.getRange(1,1,1,headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#0f5132').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  });
  var sitesSheet = ss.getSheetByName(NL_SHEETS.SITES);
  if (sitesSheet.getLastRow() < 2) {
    NL_SITES_INIT.forEach(function(row) { sitesSheet.appendRow(row); });
  }

  props.setProperty('INITIALIZED', '1');

  return {
    already_setup: false,
    api_url: apiUrl,
    admin_token: adminToken,
    spreadsheet_url: getSpreadsheetUrl_(),
    owner_email: Session.getEffectiveUser().getEmail(),
  };
}

/** Sinh token ngẫu nhiên cho user mới — chạy thủ công rồi dán vào cột token */
function newToken_() {
  return Utilities.getUuid().replace(/-/g, '');
}

/**
 * Chạy hàm này trong Apps Script Editor để lấy/tạo token admin.
 * Kết quả hiện trong Execution log (Ctrl+Enter hoặc View > Logs).
 */
function getOrCreateAdminToken() {
  var ss = getOrCreateSpreadsheet_();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) { Logger.log('Sheet Users chưa tồn tại. Chạy setupDatabase() trước.'); return; }
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var emailCol = headers.indexOf('email');
  var tokenCol = headers.indexOf('token');
  var roleCol  = headers.indexOf('role');
  var myEmail  = Session.getEffectiveUser().getEmail();
  // Tìm user hiện tại
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][emailCol]).toLowerCase() === myEmail.toLowerCase()) {
      var tok = String(values[i][tokenCol]);
      if (!tok) { tok = newToken_(); sheet.getRange(i+1, tokenCol+1).setValue(tok); }
      Logger.log('=== TOKEN CỦA BẠN ===');
      Logger.log('Email : ' + myEmail);
      Logger.log('Token : ' + tok);
      Logger.log('Role  : ' + values[i][roleCol]);
      Logger.log('API URL: ' + ScriptApp.getService().getUrl());
      Logger.log('====================');
      return tok;
    }
  }
  // Chưa có → tạo mới admin
  var newTok = newToken_();
  sheet.appendRow([myEmail, 'admin', 'Admin', 'ALL', newTok]);
  Logger.log('=== ĐÃ TẠO USER ADMIN MỚI ===');
  Logger.log('Email : ' + myEmail);
  Logger.log('Token : ' + newTok);
  Logger.log('API URL: ' + ScriptApp.getService().getUrl());
  Logger.log('==============================');
  return newTok;
}

// ===================== ENTRY POINTS =====================

function doGet(e) {
  if (!e || !e.parameter || !e.parameter.action) {
    var t = HtmlService.createTemplateFromFile('Index');
    t.apiUrl = ScriptApp.getService().getUrl();
    return t.evaluate()
      .setTitle('Quản lý Nghiên cứu — Khoa BLMMN')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  // firstRun trả về trang HTML thay vì JSON
  if (e.parameter.action === 'firstRun') {
    try {
      var result = firstRun_();
      return HtmlService.createHtmlOutput(buildSetupPage_(result))
        .setTitle('Khởi tạo hệ thống — NC BLMMN')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } catch (err) {
      return HtmlService.createHtmlOutput('<pre style="color:red">LỖI: ' + err.message + '</pre>')
        .setTitle('Lỗi khởi tạo');
    }
  }
  return handleRequest(e.parameter, null);
}

function buildSetupPage_(r) {
  var apiUrlEsc = r.api_url.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  var ssUrlEsc  = r.spreadsheet_url.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  if (r.already_setup) {
    return '<body style="font-family:sans-serif;padding:40px;max-width:600px;margin:auto">'
      + '<h2 style="color:#0f5132">✅ Hệ thống đã được khởi tạo trước đó</h2>'
      + '<p>Đăng nhập tại <a href="https://pnbinh-258.github.io/nc-research-manager/" target="_blank">nc-research-manager</a> bằng API URL và token của bạn.</p>'
      + '<p><b>API URL:</b> <code style="word-break:break-all">' + apiUrlEsc + '</code></p>'
      + '<p><a href="' + ssUrlEsc + '" target="_blank">📊 Mở Google Sheets</a></p>'
      + '</body>';
  }
  return '<body style="font-family:sans-serif;padding:40px;max-width:600px;margin:auto;background:#f8fff8">'
    + '<h2 style="color:#0f5132">🎉 Khởi tạo thành công!</h2>'
    + '<p>Hệ thống đã tạo Google Sheets và tài khoản admin cho bạn.</p>'
    + '<div style="background:#fff;border:1px solid #c3e6cb;border-radius:8px;padding:20px;margin:20px 0">'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<tr><td style="padding:8px;color:#555;width:140px"><b>API URL</b></td>'
    + '<td style="padding:8px"><code style="word-break:break-all;background:#f0f0f0;padding:3px 6px;border-radius:4px">' + apiUrlEsc + '</code></td></tr>'
    + '<tr><td style="padding:8px;color:#555"><b>Token admin</b></td>'
    + '<td style="padding:8px"><code style="background:#fff3cd;padding:3px 10px;border-radius:4px;font-size:15px;letter-spacing:.05em">' + (r.admin_token || '') + '</code></td></tr>'
    + '<tr><td style="padding:8px;color:#555"><b>Email</b></td>'
    + '<td style="padding:8px">' + (r.owner_email || '') + '</td></tr>'
    + '</table></div>'
    + '<p>⚠️ <b>Lưu token lại ngay</b> — sẽ không hiển thị lần sau.</p>'
    + '<p><a href="https://pnbinh-258.github.io/nc-research-manager/" target="_blank" '
    + 'style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">▶ Mở ứng dụng & đăng nhập</a>'
    + '&nbsp;&nbsp;<a href="' + ssUrlEsc + '" target="_blank" style="color:#0f5132">📊 Mở Google Sheets</a></p>'
    + '</body>';
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  return handleRequest(e.parameter, body);
}

function handleRequest(params, body) {
  var action = (params && params.action) || (body && body.action) || '';
  var token = (params && params.token) || (body && body.token) || '';

  // firstRun, login, bootstrapAdmin không cần token
  if (action === 'firstRun') {
    try { return json_({ ok: true, data: firstRun_() }); } catch (e) { return json_({ ok: false, error: e.message }); }
  }
  // bootstrapAdmin: đặt mật khẩu qua URL — chỉ hoạt động với đúng secret
  // Ví dụ: ?action=bootstrapAdmin&secret=NC115_BOOT&email=abc@gmail.com&password=mypass
  if (action === 'bootstrapAdmin') {
    try {
      if ((params.secret || '') !== 'NC115_BOOT') return json_({ ok: false, error: 'Sai secret' });
      var bEmail = String(params.email || '').toLowerCase().trim();
      var bPwd   = String(params.password || '');
      if (!bEmail || bPwd.length < 4) return json_({ ok: false, error: 'Thiếu email hoặc mật khẩu' });
      ensurePasswordHashCol_();
      var sheet = getSheet_(SHEETS.USERS);
      var values = sheet.getDataRange().getValues();
      var hdr = values[0];
      var eCol = hdr.indexOf('email');
      var hCol = hdr.indexOf('password_hash');
      var tCol = hdr.indexOf('token');
      for (var bi = 1; bi < values.length; bi++) {
        if (String(values[bi][eCol]).toLowerCase().trim() === bEmail) {
          sheet.getRange(bi + 1, hCol + 1).setValue(hashPassword_(bPwd));
          return json_({ ok: true, data: { message: 'OK', email: bEmail, token: values[bi][tCol] } });
        }
      }
      // Chưa có → tạo mới
      var newTok = newToken_();
      sheet.appendRow([bEmail, 'admin', 'Admin', 'ALL', newTok, hashPassword_(bPwd)]);
      return json_({ ok: true, data: { message: 'Created', email: bEmail, token: newTok } });
    } catch (e) { return json_({ ok: false, error: e.message }); }
  }
  if (action === 'login') {
    try {
      // Hỗ trợ cả GET (params.email + params.ph) và POST (body.data.email + body.data.password)
      var loginData = (body && body.data) ? body.data
        : { email: params.email || '', ph: params.ph || '' };
      return json_({ ok: true, data: login_(loginData) });
    }
    catch (e) { return json_({ ok: false, error: e.message }); }
  }

  var user = getCurrentUser_(token);
  try {
    if (!user) return json_({ ok: false, error: 'UNAUTHORIZED', message: 'Token không hợp lệ hoặc chưa được cấp quyền.' });

    var result;
    switch (action) {
      // ---- đọc (mọi role) ----
      case 'listStudies':    result = listStudies_(); break;
      case 'getStudy':       result = getStudy_(params.study_id); break;
      case 'listPatients':   result = listRows_(SHEETS.PATIENTS, params.study_id); break;
      case 'listMilestones': result = withOverdue_(listRows_(SHEETS.MILESTONES, params.study_id)); break;
      case 'listDocuments':  result = listRows_(SHEETS.DOCUMENTS, params.study_id); break;
      case 'dashboard':      result = dashboard_(); break;
      case 'whoami':         result = user; break;

      // ---- ghi (admin / investigator) ----
      case 'addStudy':        requireRole_(user, ['admin']);                 result = addRow_(SHEETS.STUDIES, body.data, 'study_id', 'NC'); break;
      case 'updateStudy':     requireRole_(user, ['admin']);                 result = updateRow_(SHEETS.STUDIES, 'study_id', body.data); break;
      case 'addPatient':      requireWrite_(user, body.data.study_id);       result = addPatient_(body.data); break;
      case 'updatePatient':   requireWrite_(user, body.data.study_id);       result = updateRow_(SHEETS.PATIENTS, 'patient_code', body.data); break;
      case 'addMilestone':    requireWrite_(user, body.data.study_id);       result = addRow_(SHEETS.MILESTONES, body.data, 'milestone_id', 'MS'); break;
      case 'updateMilestone': requireWrite_(user, body.data.study_id);       result = updateRow_(SHEETS.MILESTONES, 'milestone_id', body.data); break;
      case 'addDocument':     requireWrite_(user, body.data.study_id);       result = addDocument_(body.data); break;
      case 'updateDocument':  requireWrite_(user, body.data.study_id);       result = updateRow_(SHEETS.DOCUMENTS, 'doc_id', body.data); break;

      // ---- xoá (admin hoặc investigator được assign) ----
      case 'deleteStudy':     requireRole_(user, ['admin']);                  result = deleteRow_(SHEETS.STUDIES, 'study_id', body.data.study_id); break;
      case 'deletePatient':   requireWrite_(user, body.data.study_id);        result = deleteRow_(SHEETS.PATIENTS, 'patient_code', body.data.patient_code); break;
      case 'deleteMilestone': requireWrite_(user, body.data.study_id);        result = deleteRow_(SHEETS.MILESTONES, 'milestone_id', body.data.milestone_id); break;
      case 'deleteDocument':  requireWrite_(user, body.data.study_id);        result = deleteRow_(SHEETS.DOCUMENTS, 'doc_id', body.data.doc_id); break;

      // ---- quản lý người dùng (admin only) ----
      case 'listUsers':       requireRole_(user, ['admin']); result = listUsersPublic_(); break;
      case 'addUser':         requireRole_(user, ['admin']); result = addUser_(body.data); break;
      case 'updateUser':      requireRole_(user, ['admin']); result = updateRow_(SHEETS.USERS, 'email', body.data); break;
      case 'deleteUser':      requireRole_(user, ['admin']); result = deleteRow_(SHEETS.USERS, 'email', body.data.email); break;
      case 'generateToken':   requireRole_(user, ['admin']); result = { token: newToken_() }; break;
      case 'setPassword':     result = setPassword_(user, body.data); break;

      // ---- audit log (admin only) ----
      case 'listLog':         requireRole_(user, ['admin']); result = readSheet_(SHEETS.LOG).slice(-300).reverse(); break;

      // ---- NEWLINE multi-site trial ----
      case 'nlSetupSheets':   requireRole_(user, ['admin']); result = nlSetupSheets_(); break;
      case 'nlListSites':     result = nlListSites_(); break;
      case 'nlDashboard':     result = nlDashboard_(); break;
      case 'nlListPatients':  result = nlListPatients_(params.site_id); break;
      case 'nlAddPatient':    requireRole_(user, ['admin','investigator']); result = nlAddPatient_(body.data); invalidateNlCache_(); break;
      case 'nlUpdatePatient': requireRole_(user, ['admin','investigator']); result = nlUpdatePatientRow_(body.data); invalidateNlCache_(); break;
      case 'nlDeletePatient': requireRole_(user, ['admin']); result = nlDeletePatient_(body.data.patient_id); invalidateNlCache_(); break;
      case 'nlUpdateSite':    requireRole_(user, ['admin']); result = nlUpdateSiteRow_(body.data); break;

      default:
        return json_({ ok: false, error: 'UNKNOWN_ACTION', action: action });
    }

    if (body && body.action) {
      log_(user.email, action, (body.data && body.data.study_id) || '', body.data);
      invalidateStudiesCache_();
    }
    return json_({ ok: true, data: result });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

// ===================== AUTH =====================

/** Xác thực bằng token (cột token trong sheet Users). Fallback: email Google nếu gọi trực tiếp. */
function getCurrentUser_(token) {
  var rows = readSheet_(SHEETS.USERS);
  if (token) {
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].token) === String(token) && rows[i].token !== '') {
        return { email: rows[i].email, role: rows[i].role, name: rows[i].name,
                 assigned_studies: String(rows[i].assigned_studies || '') };
      }
    }
    return null;
  }
  var email = Session.getActiveUser().getEmail();
  if (!email) return null;
  for (var j = 0; j < rows.length; j++) {
    if (String(rows[j].email).toLowerCase() === email.toLowerCase()) {
      return { email: email, role: rows[j].role, name: rows[j].name,
               assigned_studies: String(rows[j].assigned_studies || '') };
    }
  }
  return null;
}

function requireRole_(user, roles) {
  if (roles.indexOf(user.role) === -1) throw new Error('FORBIDDEN: cần quyền ' + roles.join('/'));
}

// ===================== PASSWORD AUTH =====================

function hashPassword_(pwd) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pwd, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/** Đảm bảo cột password_hash tồn tại trong sheet Users */
function ensurePasswordHashCol_() {
  var sheet = getSheet_(SHEETS.USERS);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('password_hash') !== -1) return;
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, newCol).setValue('password_hash');
  _sheetCache = {}; // xóa cache để đọc lại
}

/** Đăng nhập bằng email + mật khẩu — trả về token và thông tin user.
 *  Nhận data.ph (SHA-256 hex của password, hash ở client) HOẶC data.password (plaintext, hash ở server).
 */
function login_(data) {
  var email = String(data.email || '').toLowerCase().trim();
  // ph = pre-hashed từ browser (crypto.subtle SHA-256); password = plaintext từ POST cũ
  var inputHash = data.ph ? String(data.ph) : (data.password ? hashPassword_(String(data.password)) : '');
  if (!email || !inputHash) throw new Error('Thiếu email hoặc mật khẩu');
  ensurePasswordHashCol_();
  var rows = readSheet_(SHEETS.USERS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email).toLowerCase() === email) {
      var storedHash = String(rows[i].password_hash || '');
      if (!storedHash) throw new Error('Tài khoản chưa đặt mật khẩu. Liên hệ admin để đặt mật khẩu.');
      if (inputHash !== storedHash) throw new Error('Mật khẩu không đúng');
      var tok = String(rows[i].token || '');
      if (!tok) {
        tok = newToken_();
        updateRow_(SHEETS.USERS, 'email', { email: rows[i].email, token: tok });
      }
      return { token: tok, email: rows[i].email, role: rows[i].role, name: rows[i].name,
               assigned_studies: String(rows[i].assigned_studies || '') };
    }
  }
  throw new Error('Email không tồn tại trong hệ thống');
}

/** Đặt mật khẩu: admin có thể đặt cho bất kỳ user; user thường chỉ đặt cho chính mình */
function setPassword_(user, data) {
  var targetEmail = String(data.email || user.email).toLowerCase().trim();
  if (user.role !== 'admin' && targetEmail !== user.email.toLowerCase()) {
    throw new Error('FORBIDDEN: chỉ được đặt mật khẩu cho chính mình');
  }
  if (!data.password || String(data.password).length < 6) {
    throw new Error('Mật khẩu phải ít nhất 6 ký tự');
  }
  ensurePasswordHashCol_();
  var sheet = getSheet_(SHEETS.USERS);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var emailCol = headers.indexOf('email');
  var hashCol  = headers.indexOf('password_hash');
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][emailCol]).toLowerCase() === targetEmail) {
      sheet.getRange(i + 1, hashCol + 1).setValue(hashPassword_(data.password));
      return { ok: true, email: targetEmail };
    }
  }
  throw new Error('Không tìm thấy user ' + targetEmail);
}

/**
 * Chạy hàm này trong Apps Script Editor để đặt mật khẩu admin.
 * Sửa biến EMAIL và PASSWORD bên dưới rồi nhấn Run.
 * Kết quả xem trong tab "Nhật ký thực thi" hoặc View > Logs.
 */
function setAdminPassword() {
  var EMAIL = 'pnbinh@gmail.com'; // ← email admin
  var PASSWORD = 'pnbinh85';      // ← mật khẩu
  console.log('▶ Bắt đầu setAdminPassword cho: ' + EMAIL);
  ensurePasswordHashCol_();
  var sheet = getSheet_(SHEETS.USERS);
  var ss = getOrCreateSpreadsheet_();
  console.log('📊 Spreadsheet: ' + ss.getUrl());
  var values = sheet.getDataRange().getValues();
  console.log('👥 Số dòng Users (incl header): ' + values.length);
  var headers = values[0];
  console.log('Headers: ' + JSON.stringify(headers));
  var emailCol = headers.indexOf('email');
  var hashCol  = headers.indexOf('password_hash');
  var tokenCol = headers.indexOf('token');
  console.log('emailCol=' + emailCol + ' hashCol=' + hashCol + ' tokenCol=' + tokenCol);
  for (var i = 1; i < values.length; i++) {
    var rowEmail = String(values[i][emailCol]).toLowerCase().trim();
    console.log('Row ' + i + ': ' + rowEmail);
    if (rowEmail === EMAIL.toLowerCase().trim()) {
      var hash = hashPassword_(PASSWORD);
      sheet.getRange(i + 1, hashCol + 1).setValue(hash);
      console.log('✅ Đặt mật khẩu OK cho: ' + EMAIL + ' | hash: ' + hash.slice(0,8) + '...');
      console.log('   Token: ' + values[i][tokenCol]);
      return;
    }
  }
  // Chưa có user → tạo mới
  var tok = newToken_();
  var hash = hashPassword_(PASSWORD);
  sheet.appendRow([EMAIL, 'admin', 'Admin', 'ALL', tok, hash]);
  console.log('✅ Tạo admin mới: ' + EMAIL + ' | hash: ' + hash.slice(0,8) + '... | token: ' + tok);
}

/** admin ghi mọi NC; investigator chỉ ghi NC được assign (assigned_studies = "ALL" hoặc "NC001,NC002") */
function requireWrite_(user, studyId) {
  if (user.role === 'admin') return;
  if (user.role === 'investigator') {
    var assigned = user.assigned_studies;
    if (assigned === 'ALL' || assigned.split(',').map(function (s) { return s.trim(); }).indexOf(studyId) !== -1) return;
  }
  throw new Error('FORBIDDEN: không có quyền ghi trên ' + studyId);
}

// ===================== BUSINESS LOGIC =====================

var STUDIES_CACHE_KEY = 'listStudies_v1';

function listStudies_() {
  var sc = CacheService.getScriptCache();
  var hit = sc.get(STUDIES_CACHE_KEY);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }

  var studies = readSheet_(SHEETS.STUDIES);
  var patients = readSheet_(SHEETS.PATIENTS);
  studies.forEach(function (st) {
    st.enrolled_n = patients.filter(function (p) {
      return p.study_id === st.study_id &&
             ['Enrolled', 'Completed'].indexOf(p.status) !== -1;
    }).length;
  });
  try { sc.put(STUDIES_CACHE_KEY, JSON.stringify(studies), 60); } catch (e) {}
  return studies;
}

function invalidateStudiesCache_() {
  try { CacheService.getScriptCache().remove(STUDIES_CACHE_KEY); } catch (e) {}
}

function getStudy_(studyId) {
  var st = listStudies_().filter(function (s) { return s.study_id === studyId; })[0];
  if (!st) throw new Error('Không tìm thấy ' + studyId);
  st.patients = listRows_(SHEETS.PATIENTS, studyId);
  st.milestones = withOverdue_(listRows_(SHEETS.MILESTONES, studyId));
  st.documents = listRows_(SHEETS.DOCUMENTS, studyId);
  return st;
}

/** Tự sinh patient_code dạng NC001-007 (số thứ tự tiếp theo trong NC đó) */
function addPatient_(data) {
  var existing = listRows_(SHEETS.PATIENTS, data.study_id);
  var maxSeq = existing.reduce(function (m, p) {
    var n = parseInt(String(p.patient_code).split('-')[1], 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  data.patient_code = data.study_id + '-' + padNum_(maxSeq + 1, 3);
  appendObject_(SHEETS.PATIENTS, data);
  return data;
}

/** Khi thêm document Approved cùng study + doc_type → bản Approved cũ thành Superseded */
function addDocument_(data) {
  data.doc_id = nextId_(SHEETS.DOCUMENTS, 'doc_id', 'DOC');
  if (data.status === 'Approved') {
    var sheet = getSheet_(SHEETS.DOCUMENTS);
    var rows = readSheet_(SHEETS.DOCUMENTS);
    var headers = SCHEMA.Documents;
    rows.forEach(function (r, i) {
      if (r.study_id === data.study_id && r.doc_type === data.doc_type && r.status === 'Approved') {
        sheet.getRange(i + 2, headers.indexOf('status') + 1).setValue('Superseded');
      }
    });
  }
  appendObject_(SHEETS.DOCUMENTS, data);
  return data;
}

/** Dashboard: dữ liệu đầy đủ cho trang tổng quan */
function dashboard_() {
  var studies = listStudies_();
  var allMs = withOverdue_(readSheet_(SHEETS.MILESTONES));
  var docs = readSheet_(SHEETS.DOCUMENTS);
  var patients = readSheet_(SHEETS.PATIENTS);
  var today = new Date();
  var soon = new Date(today.getTime() + 30 * 86400000);
  var in60 = new Date(today.getTime() + 60 * 86400000);
  var in90 = new Date(today.getTime() + 90 * 86400000);
  var mStart = new Date(today.getFullYear(), today.getMonth(), 1);
  var mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  var alerts = [];

  studies.forEach(function (st) {
    if (st.irb_expiry) {
      var exp = new Date(st.irb_expiry);
      if (exp <= soon) alerts.push({ level: exp <= today ? 'red' : 'yellow', type: 'IRB_EXPIRY',
        study_id: st.study_id, message: 'IRB ' + st.study_id + ' hết hạn ' + fmtDate_(exp) });
    }
    if (st.status === 'Active' && st.target_n && st.start_date && st.expected_end) {
      var total = new Date(st.expected_end) - new Date(st.start_date);
      var elapsed = today - new Date(st.start_date);
      if (total > 0 && elapsed / total >= 0.5 && st.enrolled_n / st.target_n < 0.7) {
        alerts.push({ level: 'orange', type: 'SLOW_ENROLLMENT', study_id: st.study_id,
          message: st.study_id + ' enroll ' + st.enrolled_n + '/' + st.target_n + ' — chậm tiến độ' });
      }
    }
  });

  allMs.filter(function (m) { return m.status === 'Overdue'; }).forEach(function (m) {
    alerts.push({ level: 'yellow', type: 'MILESTONE_OVERDUE', study_id: m.study_id,
      message: m.study_id + ': "' + m.milestone_name + '" quá hạn ' + fmtDate_(new Date(m.planned_date)) });
  });

  docs.forEach(function (d) {
    if (d.expiry_date && new Date(d.expiry_date) <= soon && d.status === 'Approved') {
      alerts.push({ level: 'red', type: 'DOC_EXPIRY', study_id: d.study_id,
        message: 'Tài liệu ' + d.doc_type + ' (' + d.study_id + ') hết hạn ' + fmtDate_(new Date(d.expiry_date)) });
    }
  });

  // Stats tổng hợp
  var statusCounts = {};
  var enrolledTotal = 0, targetTotal = 0;
  studies.forEach(function (s) {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    enrolledTotal += s.enrolled_n || 0;
    targetTotal += Number(s.target_n) || 0;
  });
  var enrolledThisMonth = patients.filter(function (p) {
    return p.enroll_date && new Date(p.enroll_date) >= mStart && new Date(p.enroll_date) < mEnd;
  }).length;
  var msThisMonth = allMs.filter(function (m) {
    if (!m.planned_date) return false;
    var d = new Date(m.planned_date);
    return d >= mStart && d < mEnd;
  }).length;

  // Milestones sắp tới (60 ngày tới, chưa Done)
  var upcoming = allMs.filter(function (m) {
    return m.planned_date && new Date(m.planned_date) <= in60 && m.status !== 'Done';
  }).sort(function (a, b) { return new Date(a.planned_date) - new Date(b.planned_date); }).slice(0, 8);

  // Tài liệu sắp hết hạn (90 ngày tới)
  var docDeadlines = docs.filter(function (d) {
    return d.expiry_date && d.status === 'Approved' && new Date(d.expiry_date) <= in90;
  }).sort(function (a, b) { return new Date(a.expiry_date) - new Date(b.expiry_date); });

  // Hoạt động gần đây (8 entries cuối)
  var recentActivity = readSheet_(SHEETS.LOG).slice(-8).reverse();

  // Enrollment theo tháng (6 tháng gần nhất)
  var enrollByMonth = [];
  for (var i = 5; i >= 0; i--) {
    var ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
    var me = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    var cnt = patients.filter(function (p) {
      return p.enroll_date && new Date(p.enroll_date) >= ms && new Date(p.enroll_date) < me;
    }).length;
    enrollByMonth.push({ month: (ms.getMonth() + 1) + '/' + ms.getFullYear(), count: cnt });
  }

  return {
    studies: studies,
    alerts: alerts,
    all_milestones: allMs,
    stats: {
      status_counts: statusCounts,
      enrolled_total: enrolledTotal,
      target_total: targetTotal,
      enrolled_this_month: enrolledThisMonth,
      milestones_this_month: msThisMonth,
      milestones_overdue: allMs.filter(function (m) { return m.status === 'Overdue'; }).length,
      docs_expiring: docs.filter(function (d) { return d.expiry_date && d.status === 'Approved' && new Date(d.expiry_date) <= soon; }).length
    },
    upcoming_milestones: upcoming,
    doc_deadlines: docDeadlines,
    recent_activity: recentActivity,
    enroll_by_month: enrollByMonth
  };
}

/** Milestone chưa Done mà quá planned_date → Overdue (tính động, không ghi đè sheet) */
function withOverdue_(milestones) {
  var today = new Date();
  return milestones.map(function (m) {
    if (m.status !== 'Done' && m.planned_date && new Date(m.planned_date) < today) {
      return Object.assign({}, m, { status: 'Overdue' });
    }
    return m;
  });
}

// ===================== SHEET HELPERS =====================

// Cache trong 1 request (mỗi HTTP request là 1 execution context mới)
var _ss = null;
var _sheetCache = {};

function getSheet_(name) {
  if (!_ss) _ss = getOrCreateSpreadsheet_();
  return _ss.getSheetByName(name);
}

function readSheet_(name) {
  if (_sheetCache[name]) return _sheetCache[name];
  var sheet = getSheet_(name);
  var values = sheet.getDataRange().getValues();
  var headers = values.shift();
  _sheetCache[name] = values.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      obj[h] = row[i] instanceof Date ? fmtDate_(row[i]) : row[i];
    });
    return obj;
  });
  return _sheetCache[name];
}

function listRows_(name, studyId) {
  var rows = readSheet_(name);
  return studyId ? rows.filter(function (r) { return r.study_id === studyId; }) : rows;
}

function appendObject_(name, data) {
  var headers = SCHEMA[name];
  getSheet_(name).appendRow(headers.map(function (h) { return data[h] != null ? data[h] : ''; }));
}

function addRow_(name, data, idField, prefix) {
  if (!data[idField]) data[idField] = nextId_(name, idField, prefix);
  appendObject_(name, data);
  return data;
}

function updateRow_(name, idField, data) {
  var sheet = getSheet_(name);
  var headers = SCHEMA[name];
  var rows = readSheet_(name);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idField]) === String(data[idField])) {
      headers.forEach(function (h, c) {
        if (data[h] !== undefined && h !== idField) sheet.getRange(i + 2, c + 1).setValue(data[h]);
      });
      return data;
    }
  }
  throw new Error('Không tìm thấy ' + idField + '=' + data[idField]);
}

function nextId_(name, idField, prefix) {
  var max = readSheet_(name).reduce(function (m, r) {
    var n = parseInt(String(r[idField]).replace(prefix, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return prefix + padNum_(max + 1, 3);
}

function log_(email, action, studyId, detail) {
  getSheet_(SHEETS.LOG).appendRow([new Date(), email, action, studyId, JSON.stringify(detail || {})]);
}

function padNum_(n, width) {
  var s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

function fmtDate_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function deleteRow_(name, idField, idValue) {
  var sheet = getSheet_(name);
  var rows = readSheet_(name);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idField]) === String(idValue)) {
      sheet.deleteRow(i + 2); // +2: 1-indexed và bỏ header
      return { deleted: idValue };
    }
  }
  throw new Error('Không tìm thấy ' + idField + '=' + idValue);
}

/** Trả về danh sách user không kèm token/password_hash */
function listUsersPublic_() {
  ensurePasswordHashCol_();
  return readSheet_(SHEETS.USERS).map(function (u) {
    return { email: u.email, role: u.role, name: u.name,
             assigned_studies: u.assigned_studies,
             has_token: !!u.token,
             has_password: !!(u.password_hash) };
  });
}

/** Thêm user mới — nếu truyền password thì tự hash */
function addUser_(data) {
  ensurePasswordHashCol_();
  var existing = readSheet_(SHEETS.USERS);
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i].email).toLowerCase() === String(data.email).toLowerCase()) {
      throw new Error('Email ' + data.email + ' đã tồn tại trong hệ thống');
    }
  }
  if (!data.token) data.token = newToken_();
  if (data.password) {
    data.password_hash = hashPassword_(data.password);
    delete data.password;
  } else {
    data.password_hash = '';
  }
  appendObject_(SHEETS.USERS, data);
  return { email: data.email, token: data.token };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===================== NEWLINE MULTI-SITE TRIAL =====================

var NL_SHEETS = { SITES: 'NL_Sites', PATIENTS: 'NL_Patients' };

var NL_SCHEMA = {
  NL_Sites: ['site_id','site_name','city','status','contact_name','contact_email','contact_phone','pi_name','target_enrollment'],
  NL_Patients: ['patient_id','site_id','seq_num','enrollment_date','sub_investigator','diagnosis','mrs_baseline','mrs_3m','outcome_date','outcome_notes','created_at'],
};

var NL_SITES_INIT = [
  ['ND115','Nhân Dân 115','TP. HCM','Recruiting','','','','',0],
  ['TNH','Thống Nhất','TP. HCM','Recruiting','','','','',0],
  ['QY175','Quân Y 175','TP. HCM','Recruiting','','','','',0],
  ['DNA','Đà Nẵng','Đà Nẵng','Recruiting','','','','',0],
  ['VTI','Việt Tiệp','Hải Phòng','Recruiting','','','','',0],
  ['YHN','Y Hà Nội','Hà Nội','Not yet recruiting','','','','',0],
  ['QY103','Quân Y 103','Hà Nội','Not yet recruiting','','','','',0],
  ['CTH','Đa Khoa TW Cần Thơ','Cần Thơ','Recruiting','','','','',0],
  ['UHU','Trung Ương Huế','Huế','Recruiting','','','','',0],
  ['CDO','Châu Đốc','An Giang','Recruiting','','','','',0],
];

function nlSetupSheets_() {
  var ss = getOrCreateSpreadsheet_();
  Object.keys(NL_SCHEMA).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    var headers = NL_SCHEMA[name];
    sheet.getRange(1,1,1,headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#0f5132').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  });
  var sitesSheet = ss.getSheetByName(NL_SHEETS.SITES);
  if (sitesSheet.getLastRow() < 2) {
    NL_SITES_INIT.forEach(function(row) { sitesSheet.appendRow(row); });
  }
  return { message: 'NEWLINE sheets ready' };
}

function nlReadSheet_(name) {
  if (_sheetCache[name]) return _sheetCache[name];
  var sheet = getSheet_(name);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values.shift();
  _sheetCache[name] = values.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i] instanceof Date ? fmtDate_(row[i]) : row[i]; });
    return obj;
  });
  return _sheetCache[name];
}

function nlListSites_() { return nlReadSheet_(NL_SHEETS.SITES); }

function nlListPatients_(siteId) {
  var patients = nlReadSheet_(NL_SHEETS.PATIENTS);
  var today = new Date();
  var in7 = new Date(today.getTime() + 7 * 86400000);
  patients = patients.map(function(p) {
    if (p.enrollment_date) {
      var due = new Date(new Date(p.enrollment_date).getTime() + 90 * 86400000);
      p.due_date_3m = fmtDate_(due);
    }
    var fs = 'pending';
    if (String(p.mrs_3m) !== '' && p.mrs_3m !== null && p.mrs_3m !== undefined) {
      fs = 'completed';
    } else if (p.due_date_3m) {
      var dueD = new Date(p.due_date_3m);
      if (dueD < today) fs = 'overdue';
      else if (dueD <= in7) fs = 'upcoming';
    }
    p.follow_status = fs;
    return p;
  });
  return siteId ? patients.filter(function(p) { return String(p.site_id) === String(siteId); }) : patients;
}

function nlAddPatient_(data) {
  var all = nlReadSheet_(NL_SHEETS.PATIENTS);
  var maxSeq = all.reduce(function(m, p) { var n = parseInt(p.seq_num, 10); return isNaN(n) ? m : Math.max(m, n); }, 0);
  data.seq_num = maxSeq + 1;
  data.patient_id = 'NEWLINE-' + data.site_id + '-' + padNum_(data.seq_num, 3);
  data.created_at = fmtDate_(new Date());
  var headers = NL_SCHEMA[NL_SHEETS.PATIENTS];
  getSheet_(NL_SHEETS.PATIENTS).appendRow(headers.map(function(h) { return data[h] != null ? data[h] : ''; }));
  return data;
}

function nlUpdatePatientRow_(data) {
  var sheet = getSheet_(NL_SHEETS.PATIENTS);
  var headers = NL_SCHEMA[NL_SHEETS.PATIENTS];
  var rows = nlReadSheet_(NL_SHEETS.PATIENTS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].patient_id) === String(data.patient_id)) {
      var seqNum = rows[i].seq_num;
      // Nếu site thay đổi → cập nhật patient_id theo quy ước NEWLINE-{SITE}-{seq}
      if (data.site_id && data.site_id !== rows[i].site_id) {
        data.patient_id = 'NEWLINE-' + data.site_id + '-' + padNum_(seqNum, 3);
      }
      headers.forEach(function(h, c) {
        if (data[h] !== undefined && h !== 'seq_num' && h !== 'created_at') {
          sheet.getRange(i + 2, c + 1).setValue(data[h]);
        }
      });
      return data;
    }
  }
  throw new Error('Không tìm thấy patient_id=' + data.patient_id);
}

function nlDeletePatient_(patientId) {
  var sheet = getSheet_(NL_SHEETS.PATIENTS);
  var rows = nlReadSheet_(NL_SHEETS.PATIENTS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].patient_id) === String(patientId)) {
      sheet.deleteRow(i + 2);
      return { deleted: patientId };
    }
  }
  throw new Error('Không tìm thấy ' + patientId);
}

function nlUpdateSiteRow_(data) {
  var sheet = getSheet_(NL_SHEETS.SITES);
  var headers = NL_SCHEMA[NL_SHEETS.SITES];
  var rows = nlReadSheet_(NL_SHEETS.SITES);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].site_id) === String(data.site_id)) {
      headers.forEach(function(h, c) {
        if (data[h] !== undefined && h !== 'site_id') sheet.getRange(i + 2, c + 1).setValue(data[h]);
      });
      return data;
    }
  }
  throw new Error('Không tìm thấy site_id=' + data.site_id);
}

var NL_DASH_CACHE_KEY = 'nlDashboard_v1';

function invalidateNlCache_() {
  try { CacheService.getScriptCache().removeAll([NL_DASH_CACHE_KEY]); } catch(e) {}
}

function nlDashboard_() {
  var sc = CacheService.getScriptCache();
  var hit = sc.get(NL_DASH_CACHE_KEY);
  if (hit) { try { return JSON.parse(hit); } catch(e) {} }

  var sites = nlListSites_();
  var patients = nlListPatients_();
  var today = new Date();

  var siteMap = {};
  sites.forEach(function(s) {
    siteMap[s.site_id] = Object.assign({}, s, { enrolled: 0, completed_outcome: 0, overdue_outcome: 0, upcoming_outcome: 0 });
  });

  var alerts = [];
  patients.forEach(function(p) {
    if (siteMap[p.site_id]) siteMap[p.site_id].enrolled++;
    if (p.follow_status === 'completed') {
      if (siteMap[p.site_id]) siteMap[p.site_id].completed_outcome++;
    } else if (p.follow_status === 'overdue') {
      if (siteMap[p.site_id]) siteMap[p.site_id].overdue_outcome++;
      alerts.push({ level: 'red', patient_id: p.patient_id, site_id: p.site_id, due_date: p.due_date_3m,
        message: p.patient_id + ' — quá hạn đánh giá 3 tháng (hạn ' + p.due_date_3m + ')' });
    } else if (p.follow_status === 'upcoming') {
      if (siteMap[p.site_id]) siteMap[p.site_id].upcoming_outcome++;
      var daysLeft = Math.ceil((new Date(p.due_date_3m) - today) / 86400000);
      alerts.push({ level: 'orange', patient_id: p.patient_id, site_id: p.site_id, due_date: p.due_date_3m,
        message: p.patient_id + ' — đánh giá 3 tháng trong ' + daysLeft + ' ngày (hạn ' + p.due_date_3m + ')' });
    }
  });
  alerts.sort(function(a, b) { return a.level === 'red' && b.level !== 'red' ? -1 : b.level === 'red' && a.level !== 'red' ? 1 : 0; });

  // Tổng target và kế hoạch tuyển theo tháng (linear, 12 tháng)
  var totalTarget = sites.reduce(function(s, site) { return s + (parseInt(site.target_enrollment) || 0); }, 0);
  var STUDY_MONTHS = 12;
  var plannedPerMonth = totalTarget > 0 ? totalTarget / STUDY_MONTHS : 0;

  var siteIds = sites.map(function(s) { return s.site_id; });
  var enrollByMonth = [];
  var studyStart = new Date(2026, 7, 1); // 01/08/2026
  var cur = new Date(studyStart.getFullYear(), studyStart.getMonth(), 1);
  var monthIndex = 0;
  while (cur <= today) {
    var me = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    var ms2 = new Date(cur);
    var entry = { month: (cur.getMonth() + 1) + '/' + cur.getFullYear(), count: 0,
      planned: Math.round(plannedPerMonth * (monthIndex + 1)), // planned cumulative
      planned_month: Math.round(plannedPerMonth) };
    siteIds.forEach(function(sid) {
      var cnt = patients.filter(function(p) {
        return p.site_id === sid && p.enrollment_date &&
               new Date(p.enrollment_date) >= ms2 && new Date(p.enrollment_date) < me;
      }).length;
      entry[sid] = cnt;
      entry.count += cnt;
    });
    enrollByMonth.push(entry);
    cur = me;
    monthIndex++;
  }

  var result = {
    sites: Object.values(siteMap),
    patients_total: patients.length,
    completed_total: patients.filter(function(p) { return p.follow_status === 'completed'; }).length,
    overdue_total: patients.filter(function(p) { return p.follow_status === 'overdue'; }).length,
    upcoming_total: patients.filter(function(p) { return p.follow_status === 'upcoming'; }).length,
    total_target: totalTarget,
    site_ids: siteIds,
    alerts: alerts,
    enroll_by_month: enrollByMonth,
  };
  try { sc.put(NL_DASH_CACHE_KEY, JSON.stringify(result), 60); } catch(e) {}
  return result;
}
