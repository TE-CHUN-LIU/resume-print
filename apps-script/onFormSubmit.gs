/**
 * 7-ELEVEN 應徵表單｜自動產生履歷 PNG 並寄信
 * ------------------------------------------------------------------
 * 綁在「表單回覆」試算表上：有人送出表單 → 自動把那一列資料丟給
 * jiachun-mmt 的 /api/resume-png（用 puppeteer 開履歷工具截圖）
 * → 收到 PNG → 用附件寄到指定信箱。
 *
 * 安裝步驟見同資料夾的 README.md
 * ------------------------------------------------------------------
 */

// ── 設定（Token 存在「指令碼屬性」，不寫進程式碼）──
// 用 www（apex 會 308 轉址，UrlFetchApp 對 POST 轉址處理不可靠）
var API_URL = 'https://www.jiachun-mmt.com/api/resume-png';
var MAIL_TO = 'ty0220722000@gmail.com';

function getToken_() {
  var t = PropertiesService.getScriptProperties().getProperty('RESUME_PNG_TOKEN');
  if (!t) throw new Error('尚未設定指令碼屬性 RESUME_PNG_TOKEN');
  return t;
}

/**
 * 表單送出時觸發（安裝式觸發條件：來自試算表 → 提交表單時）
 */
function onNewResponse(e) {
  try {
    var values = (e && e.values && e.values.length) ? e.values : lastRowValues_();
    sendResumeFor_(values);
  } catch (err) {
    notifyError_(err, e);
  }
}

/** 手動測試用：對最後一列跑一次 */
function testLastRow() {
  sendResumeFor_(lastRowValues_());
}

/** 補寄用：指定試算表列號（含標題列的實際列號，例如第 3 列填 3） */
function resendRow(rowNumber) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastCol = sh.getLastColumn();
  sendResumeFor_(sh.getRange(rowNumber, 1, 1, lastCol).getValues()[0]);
}

// ────────────────────────────────────────────────

function lastRowValues_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  return sh.getRange(sh.getLastRow(), 1, 1, sh.getLastColumn()).getValues()[0];
}

/** 試算表第 1 列＝標題列 */
function headerValues_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(cellToText_);
}

/** 依標題關鍵字取值（找不到就回空字串），避免寫死欄位索引 */
function byHeader_(headers, values, keyword) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].indexOf(keyword) === 0) return cellToText_(values[i]);
  }
  for (var j = 0; j < headers.length; j++) {
    if (headers[j] && headers[j].indexOf(keyword) !== -1) return cellToText_(values[j]);
  }
  return '';
}

/** 一列資料 → 產 PNG → 寄信 */
function sendResumeFor_(values) {
  var headers = headerValues_();
  // 標題列一起送，讓履歷工具用「實際欄位名」對應（等同你手動連標題貼上的結果）
  var rows = [headers.join('\t'), values.map(cellToText_).join('\t')];

  var name  = byHeader_(headers, values, '姓名') || '應徵者';
  var birth = byHeader_(headers, values, '出生年月日');
  var phone = byHeader_(headers, values, '行動電話');
  var want  = byHeader_(headers, values, '期望工作地點');
  var shift = byHeader_(headers, values, '期望上班班別');

  var res = UrlFetchApp.fetch(API_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ token: getToken_(), rows: rows }),
    muteHttpExceptions: true,
    followRedirects: true,
  });

  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('產生 PNG 失敗 HTTP ' + code + '：' + res.getContentText().slice(0, 500));
  }

  var blob = res.getBlob().setName(name + '_應徵履歷.png');

  MailApp.sendEmail({
    to: MAIL_TO,
    subject: '【新履歷】' + name + '｜' + (want || '未填地點'),
    body:
      '有新的門市應徵表單，履歷 PNG 如附件。\n\n' +
      '姓名：' + name + '\n' +
      '出生：' + birth + '\n' +
      '手機：' + phone + '\n' +
      '期望地點：' + (want || '—') + '\n' +
      '期望班別：' + (shift || '—') + '\n\n' +
      '（本信含應徵者個資，僅供面試徵才使用，用完請刪除）\n' +
      '履歷工具：https://te-chun-liu.github.io/resume-print/\n',
    attachments: [blob],
  });
}

/** 儲存格 → 純文字（Date 轉成 yyyy/M/d，並清掉會破壞 tab 分隔的字元）*/
function cellToText_(v) {
  if (v == null) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy/M/d');
  }
  return String(v).replace(/[\t\r\n]+/g, ' ').trim();
}

function notifyError_(err, e) {
  var name = '';
  try { name = (e && e.values) ? e.values[2] : ''; } catch (ignore) {}
  MailApp.sendEmail({
    to: MAIL_TO,
    subject: '【履歷自動寄送失敗】' + (name || '未知應徵者'),
    body:
      '自動產生履歷 PNG 時發生錯誤：\n\n' + (err && err.message ? err.message : err) + '\n\n' +
      '可以到試算表手動處理，或在 Apps Script 執行 resendRow(列號) 重試。\n' +
      '也可以直接開工具貼上該列：https://te-chun-liu.github.io/resume-print/\n',
  });
}

/** 除錯用：把標題列與最後一列的關鍵欄位印到執行記錄 */
function debugDump() {
  var headers = headerValues_();
  var values = lastRowValues_();
  Logger.log('欄位數 headers=' + headers.length + ' values=' + values.length);
  Logger.log('姓名欄=[' + byHeader_(headers, values, '姓名') + ']');
  Logger.log('生日欄=[' + byHeader_(headers, values, '出生年月日') + ']');
  Logger.log('標題前6=' + JSON.stringify(headers.slice(0, 6)));
  Logger.log('資料前6=' + JSON.stringify(values.slice(0, 6).map(cellToText_)));
}
