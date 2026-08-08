# Requirements Analysis 質問票 — 260807-autonomy-reachability

上流入力(consumes 全数): intent-statement / scope-document(境界とバックログの前提として実読)、business-overview / architecture / code-structure(codekb — RE 断面の参照元)。

## 質問と裁定

判断を要した1問はユーザー専権(仕様変更 — 正準リスト(4))として人間裁定、他は既決・実測からの執行。

### Q1. birth 同時宣言の意味論(仕様裁定 — ユーザー専権)

現状 `/amadeus --autonomy semi "<説明>"` は `--autonomy needs an active intent`(`amadeus-orchestrate.ts:1290-1294`、judgment 0)で拒否され、`tests/integration/t450-autonomy-flag-branch.test.ts:83` と `tests/unit/t450-autonomy-flag-apply.test.ts:95` が現行挙動を逆向きにピン留めしている。完了条件1 を新規 intent で満たすための改訂方針は?

[Answer]: **birth 同時受理** — semi/none は birth と同時に受理し birth 直後に適用(1コマンド化)。full は birth 成立後に preview を提示して確認待ち fail-closed(grant 儀式 FR-GRT-006 は不変)。t450×2 のテスト契約は明示改訂する(cid:reverse-engineering:c1-pinned-behavior-ruling 準拠 — 要件段の仕様裁定+テスト契約改訂をセットで確定)

### Q2. 検収バッチ(1 human turn = 1 review ラッチ)を本 intent の scope に含めるか

[Answer]: 含めない(執行: scope-document の In 6点に不在。ライブ実測(`amadeus-autonomy-review-production.ts:369-376`、PROVENANCE_REQUIRED)は Open questions に固定し、Issue-first で別起票する — cid:requirements-analysis:issue-first-capture)

### Q3. 完了条件2 の「grant 既定 scope に phase-gate を含めるか」

[Answer]: 既決につき執行 — full の既定は `ALL_INTERACTIONS`(4値全許可、`amadeus-intent-autonomy-production.ts:67-72,:284`)で phase-gate を既に含む。判断が実効を持つのは semi 側(`:307` = `SEMI_ROUTINE_INTERACTIONS`)で、これは #2253 の設計どおり(節目除外)変更しない。条件2 は可視化(SCOPE_OUT/MODE_REQUIRES_HUMAN の audit 化+preview 列挙)へ寄せる(クロスレビュー収束コメント既決)

## 裁定の記録

- Q1: ユーザー裁定「birth 同時受理」— 2026-08-07(本セッション AskUserQuestion、実 HUMAN_TURN)
- Q2/Q3: 権威ある一次証拠(scope-document・RE finding 12・クロスレビュー収束)からの機械的一意導出(執行クラス、選挙不要)
- ユーザー承認: 2026-08-07T13:05:00Z(Q1 回答ターン)
