# Security Design — unit presence-closure

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- approve-batch は未消費 HUMAN_TURN 検証を state 編集・GATE_APPROVED 放出前に実施(fail-closed、withAuditLock 内側 — TOCTOU 排除)
- gate presence の ledger-不在は『presence なし』判定(fail-open 廃止)— 素通りクラス D7/D8 の封鎖
- 正当経路(実 HUMAN_TURN あり)の無退行テストを対で置く

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:28Z
- **Iteration:** 1
- **Scope decision:** none

presence-closure: security bullets trace to R-1/R-2/R-3/R-4, no test-theatre, logical-components correctly maps C13, no FD contradiction.

### Findings

- None
