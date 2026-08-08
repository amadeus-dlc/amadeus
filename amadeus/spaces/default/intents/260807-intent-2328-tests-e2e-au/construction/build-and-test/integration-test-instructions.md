# Integration Test Instructions — 260807-intent-2328-tests-e2e-au

上流入力(consumes 全数): code-generation-plan（対象の導出元）、code-summary（実測転記元）

## 対象（e2e 層 — 本 intent の主戦場）

| 対象 | 検証内容 |
|---|---|
| 患部19ファイル各単独実行 | AC-1a: t113 を除く18件 green（Red→Green 全表は code-summary）。t113 は患部分類（#2456 の順序欠陥 — 変換前後で署名 byte 同一） |
| `bun tests/run-tests.ts --e2e`（99ファイル全層） | 残余赤4件がすべて自変更と無関係であること |
| vacuity 3 assert（t09:206 / t07:361 / t07:520） | FR-2: v2 行注入で赤 → 復元 md5 一致 → 残渣 grep 0（1セット不可分） |

## integration 層の無改変確認

- 除外4ファイル（t378/t380/t382/t388 — v1 不在 assert が設計意図）への diff ゼロを機械確認
- 共有ハーネス tests/harness/audit-records.ts 無改変（NFR-2）
- integration 層全体の回帰は PR CI green を正規判定とする

## 残余赤の帰属（bt-20260730-2 — 未改変 base 分離 worktree での正式確認）

conductor が attribution base `6bef8206d`（merge-base HEAD origin/main）の detached worktree + build で実測:

| ファイル | base（未改変） | 帰属 |
|---|---|---|
| t113 | 1 pass / 3 fail（a5621236c でも同一署名） | 既存事象 — #2456 起票済み |
| t267-clean-env-team-mode | 1 fail | 既存事象（election CLI tally） |
| setup-install / setup-upgrade | 1 fail / 6 fail | 既存事象（`bun build failed for @amadeus-dlc/setup ... ENOENT` のビルド環境要因） |
| t17 / t66（builder の test:ci で赤） | **0 fail（base 単独）** | **環境要因** — active intent を持つ worktree でのみ赤（自ツリー単独でも再現）。bare 形 state ケースの ambient workspace 読取 — **#2464 起票済み**。PR CI では green（正規判定） |
