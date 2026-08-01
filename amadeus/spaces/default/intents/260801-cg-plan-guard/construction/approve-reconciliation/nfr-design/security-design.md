# Security Design — approve-reconciliation(U3)

上流入力(consumes 全数): business-logic-model.md

- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は nfr-requirements / technology-stack 系ステージが本スコープ(self-feature の実行集合)で SKIP のため設計どおり不在(consumes_absent expected)— 該当 NFR は requirements.md の NFR-1〜4 を正本として代替参照する。
- セキュリティ面は `business-logic-model.md` の「突合結果を audit へ書き戻さない」(自己参照検証の回避 — ADR-3)に接地する。

## セキュリティ設計

- 検証入力(audit SWARM イベント)の emitter は amadeus-swarm.ts のみ(一次証拠性)— 突合が自分の書いた行を読む自己参照を作らない。
- 既存 approve ガード(human-presence / workspace_requires)を迂回・緩和しない(挿入位置は既存ガード群の後段)。
- 逃し弁は計画訂正のみ(env スキップ・verb 新設なし)。

## 検証形

- 新規セキュリティ検査は N/A(根拠: 認可面は既存ガード無改変+追加は拒否側のみ)。fail-closed は AC-2a の落ちる実証が引き受ける。
