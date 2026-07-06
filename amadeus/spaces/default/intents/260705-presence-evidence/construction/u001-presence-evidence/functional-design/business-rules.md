# Business Rules — u001-presence-evidence（260705-presence-evidence）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | エンジンコード・skills・完了済み record を変更しない | C-1、C-2 |
| BR-2 | 追記は英語で、audit-format.md の既存様式に一致させる。冒頭カウントは更新しない（独立 H2） | NFR-1、FR-1.5、AD-2 |
| BR-3 | 記述は執筆時点の verifyDocsOnlyEvidence 再読了に基づく（スナップショット写経の禁止）。実装ファイル・関数名を明示参照 | FR-2.3 |
| BR-4 | 出典（Issue #506、PR #505、本 Intent の decision）を明示 | NFR-2 |
| BR-5 | parity-map reason は独立段落で追補し union 解消可能に保つ | AD-3、リスク対応 |
| BR-6 | mint 規律（#497 判断 8）に触れる記述は「不変」の明記のみ | FR-1.4 |
| BR-7 | 対象 2 ファイル（audit-format.md 本体・parity-map.json）への実書き込みは #428 merge 後に行う。先行できるのは record 成果物（下書き）だけ | 着手順の再確定 decision（2026-07-06T00:34:53Z）、engineer1 訂正 |

## 検証の分担

- BR-1 / BR-5 は diff レビューと test:all。BR-2〜BR-4、BR-6 は文書内容として PR レビューと gate 承認で担保。BR-7 は commit 履歴（対象 2 ファイルの変更 commit が #428 merge 後であること）で確認できる。
