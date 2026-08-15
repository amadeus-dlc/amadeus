# Security Design — unit docs-norms

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- 文書は実装から導出(未実装挙動の先行記述禁止 — 検証劇場の文書版防止)
- ノルム改定はレビュー付き独立 PR(persist 規律)— 文書経由の規範改変に人間レビューが必ず挟まる

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:29Z
- **Iteration:** 1
- **Scope decision:** none

docs-norms: security bullets trace to R-2/R-4, no test-theatre, no logical-components.md by design (doc unit), consistent with FD (already carries a prior READY review, unchanged).

### Findings

- None
