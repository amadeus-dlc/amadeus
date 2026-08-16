# Security Design — unit d6-investigation

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- 調査専用 — 修正・是正コードを書かない(発見欠陥は Issue 起票でクロスレビューを経る)
- 推測起票の禁止(P2)— 実測のみを記録し、再現不能は条件不足として記録

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:29Z
- **Iteration:** 1
- **Scope decision:** none

d6-investigation: security bullets trace to R-1, no test-theatre, no logical-components.md by design (investigation unit), consistent with FD (already carries a prior READY review, unchanged).

### Findings

- None
