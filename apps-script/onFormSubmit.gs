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

/** 一列資料 → 產 PNG → 寄信 */
function sendResumeFor_(values) {
  var row = values.map(cellToText_).join('\t');
  var name = String(values[2] || '').trim() || '應徵者';   // 第 3 欄＝姓名

  var res = UrlFetchApp.fetch(API_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ token: getToken_(), rows: row }),
    muteHttpExceptions: true,
    followRedirects: true,
  });

  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('產生 PNG 失敗 HTTP ' + code + '：' + res.getContentText().slice(0, 500));
  }

  var blob = res.getBlob().setName(name + '_應徵履歷.png');
  var birth = cellToText_(values[4]);
  var phone = cellToText_(values[7]);
  var want  = cellToText_(values[24]);
  var shift = cellToText_(values[26]);

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
