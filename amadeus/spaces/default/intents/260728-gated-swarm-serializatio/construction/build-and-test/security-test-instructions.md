# Security Test Instructions — 260728-gated-swarm-serializatio

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 対象攻撃面は code-summary.md の新設 verb(approve-batch)と承認台帳、および plan D-2 の fail-closed 契約。

## 選定判断(比例原則)

承認済みセキュリティ NFR は requirements.md に明示されないが、本変更は**承認ゲート機構**そのものに触れるため、ゲート整合性の検査を選定する(cid:build-and-test:c3 — 実在境界への trace)。

## 検査項目(実施済み・結果は build-test-results.md)

1. fail-closed: 承認台帳の不正トークン drop(t211 g)、未知 autonomy 値の非 swarm 化(t135 2c / t211 k)
2. ゲート迂回不能性: 台帳に載るまで次バッチ invoke-swarm を emit しない(t211 e)、最終バッチのステージ本ゲート維持(t211 h)
3. 監査完全性: approve-batch が既存タクソノミ GATE_APPROVED を emit し二重 emit しない(t33 冪等)
4. 残余リスク(申告済み): approve-batch の human-presence 未強制 — ユーザー裁定で分離し Issue #1647 で追跡。engine 側台帳ゲートは fail-closed のため暫定許容。
