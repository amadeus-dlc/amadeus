# Intent Capture Questions — intent-autonomy

**Mode:** chat
**Recorded at:** 2026-08-03T03:46:04Z
**leader 承認:** 2026-08-03T03:48:05Z（ユーザー回答「1」）

## 次回への追加学習

- **質問:** Anything to add for next time?
- **回答:** 追加なし（ユーザー回答「1」）

## Q1. 解決する問題は何か

[Answer]: AI-DLC を非対話・長時間で動かす利用者が、承認待ちや品質不備の反復によって Intent の終端へ到達できない。完全自律を選んでも人間待ちで止まる一方、進捗のない修復を無制限に続ける危険もある。ユーザーが事前に認可した範囲で進行し、健全化できない場合だけ監査可能かつ再開可能に停止する必要がある。

**Mode:** chat
**Source:** [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)、[#2095](https://github.com/amadeus-dlc/amadeus/issues/2095)、[#2096](https://github.com/amadeus-dlc/amadeus/issues/2096) を整理した事前grilling

## Q2. 誰が恩恵を受けるか

[Answer]: 第一の利用者は、Claude Code、Codex、Cursor、OpenCode、Kimi Code で Amadeus を実行する開発者・チームである。後から自動裁定や成果を確認する人間の承認者、共通Coreを保守するAmadeusメンテナー、将来新しいharness adapterを追加する開発者も恩恵を受ける。

**Mode:** chat
**Source:** [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)「対象 harness」「自動裁定の確認 UX」

## Q3. 成功をどう測るか

[Answer]: `none` / `semi` / `full` が明示的に分離され、既定の `none` から暗黙昇格しないこと。`full` はIntent・scope・norm・host/tool permissionの範囲内でIntent終端まで進むこと。品質不備は自動修復され、非生産的ループはgrantを失わず再開可能に停止すること。現行5harnessで同じ決定論的contract testsとopt-in live smokeが成立し、将来のharness追加がCore forkを要求しないことを検証可能な成功条件とする。

**Mode:** chat
**Source:** [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)「受け入れ条件」、[#2095](https://github.com/amadeus-dlc/amadeus/issues/2095)「受け入れ条件」、[#2096](https://github.com/amadeus-dlc/amadeus/issues/2096)「受け入れ条件」

## Q4. なぜ今取り組むのか

[Answer]: [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067) の旧案にはClaude Code固有の起動表現、期限・消費型grant、代理 `HUMAN_TURN`、外部連携との密結合が混在していた。grillingでharness-neutralな自律contractへ整理でき、汎用Loop Monitor Coreと品質修復pluginの境界も確定したため、[#2095](https://github.com/amadeus-dlc/amadeus/issues/2095) → [#2096](https://github.com/amadeus-dlc/amadeus/issues/2096) → #2067統合の順で独立検証可能なBoltとして実装へ進める状態になった。

**Mode:** chat
**Source:** 2026-08-03の事前grillingと3件のcanonical Issue

## 完全性・矛盾分析

- 4つのIntent Capture論点は、事前grillingとcanonical Issueにより回答済みである。
- 「Intent終端まで進む」と「品質不備では停止しない」は整合する。非生産的修復だけを再開可能な停止へ分離している。
- 「5harnessを初期対象にする」と「将来のharness追加を難しくしない」は、harness-neutral Core contractとadapter境界を成功条件にすることで両立する。
- 実装詳細は後続stageへ委ね、Intent Captureでは問題、利用者、成功条件、着手理由だけを確定する。
- 未回答のmaterial ambiguityはない。

## Q5. Issueに未記載または矛盾がある場合の扱い

[Answer]: Issueに書かれていることの抜け漏れ・矛盾を指摘する。それ以外はIssueどおりに実行する。Issueにない仕様をAIが暗黙に補完せず、materialな不足やIssue間の衝突は後続stageの明示的な解決対象として提示する。

**Mode:** chat
**Source:** ユーザー回答「issueに書いてあることの抜け漏れ矛盾を指摘してください。それ以外はissueどおりにやります。そういう前提でお願いします」

## 確認

- ユーザー確認: **Looks correct**
- 確認日時: 2026-08-03T03:50:29Z
