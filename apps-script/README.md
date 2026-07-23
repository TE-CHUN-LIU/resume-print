# 自動寄履歷 PNG｜安裝步驟

有人送出應徵表單 → 自動產生 A4 履歷 PNG → 寄到 `ty0220722000@gmail.com`。
安裝一次就好，之後完全不用管。

## 流程

```
Google 表單送出
   └→ 表單回覆試算表（Apps Script onFormSubmit 觸發）
        └→ POST https://www.jiachun-mmt.com/api/resume-png
             └→ 伺服器用 puppeteer 開履歷工具、貼上該列資料、截圖 #a4
                  └→ 回傳 PNG → Apps Script 用附件寄信給你
```

MMT 天賦由出生年月日直接算，不需要 API Key、不需要截圖。

## 安裝（約 5 分鐘）

1. 開啟表單的**回覆試算表** → 上方選單 `擴充功能` → `Apps Script`
2. 把 `onFormSubmit.gs` 的內容整份貼進編輯器（覆蓋預設的 `myFunction`），存檔
3. 左側齒輪 `專案設定` → 最下方 `指令碼屬性` → `新增指令碼屬性`
   - 屬性：`RESUME_PNG_TOKEN`
   - 值：（見 1Password／或 jiachun-mmt 的 `.env.local` 裡的 `RESUME_PNG_TOKEN`）
   - **不要**把這個值寫進程式碼或推上 GitHub
4. 左側 `觸發條件`（鬧鐘圖示）→ `新增觸發條件`
   - 要執行的函式：`onNewResponse`
   - 活動來源：`來自試算表`
   - 活動類型：`提交表單時`
   - 儲存 → 會跳出 Google 授權，選你的帳號 →「進階」→「前往（不安全）」→ 允許
5. 測試：回編輯器，函式選 `testLastRow` → 執行 → 信箱應該收到最後一筆的履歷 PNG

## 日常使用

- 平常什麼都不用做，有人投履歷就會收到信，主旨是 `【新履歷】姓名｜期望地點`
- 失敗時會收到 `【履歷自動寄送失敗】`，信裡有錯誤訊息
- 要補寄某一列：Apps Script 編輯器執行 `resendRow(列號)`（列號＝試算表上看到的實際列號）
- 要一次處理多筆／手動調整：直接開 https://te-chun-liu.github.io/resume-print/ 貼上資料

## 注意

- 履歷含身分證字號等個資，只在你自己的 Vercel 服務上處理，**不會儲存**，處理完即丟。
- 表單題目順序若有變動（新增/刪除題目），要同步更新履歷工具 `index.html` 裡的 `DEFAULT_HDRS`，
  否則欄位會對錯。
- Token 若外洩，到 `jiachun-mmt` 專案重設 `RESUME_PNG_TOKEN` 環境變數並重新部署，
  再更新這裡的指令碼屬性。
