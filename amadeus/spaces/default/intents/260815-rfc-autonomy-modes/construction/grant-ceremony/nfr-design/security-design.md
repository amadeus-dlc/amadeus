# Security Design — unit grant-ceremony

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- 相互必須不変量(preview なし発効拒否・digest 不一致拒否)の落ちる実証を追加 — 確認の形骸化防止
- 実 HUMAN_TURN provenance 要求・nonAutoDecidedKinds 提示内容は不変(簡素化は印字のみ)

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:29Z
- **Iteration:** 1
- **Scope decision:** none

grant-ceremony: security bullets trace to R-3/R-4/R-5, no test-theatre, logical-components correctly maps C12, no FD contradiction.

### Findings

- None
