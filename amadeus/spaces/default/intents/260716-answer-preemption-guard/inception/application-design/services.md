# Services — answer-preemption-guard

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜7)、codekb `architecture.md`・`component-inventory.md`、`../practices-discovery/team-practices.md`(変更 0 件)。

## 実行時サービス構成(二層防衛)

| 層 | 機構 | タイミング | 失敗様式 |
|----|------|-----------|---------|
| advisory 層(本 intent) | answer-evidence sensor | questions ファイル Write/Edit 時(PostToolUse hook)+conductor 手動 fire | SENSOR_FAILED 監査行+finding ファイル(非ブロック) |
| fail-closed 層(既存 #1106) | gate-start ガード | gate-start 実行時 | error() exit 1(checkbox 遷移前に停止) |

同一述語 `checkQuestionsEvidence` の2発火点 — canonical 1定義(重複実装なし)。cutoff も C-3 で1定義。

## データフロー

Write(questions)→ hook が current stage の sensors_applicable を読む → matches `**/*-questions.md` 一致 → dispatcher fire → script が述語呼出 → stdout JSON → dispatcher が SENSOR_PASSED/FAILED emit+FAILED 時 finding 書出し(`.amadeus-sensors/<stage>/answer-evidence-<fireId>.md`)。
