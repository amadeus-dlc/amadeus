# Security Design — unit waiting-interruption

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- waiting は engine 発行専用(CLI verb なし)— 自己 park 脅威(#365/#3016)の新入口を作らない
- admission は構造化事由(occurrenceId・candidates・derivation transcript・basisFingerprint)へ束縛し監査へ append — 自由文 park の偽装余地なし
- レート鍵 = occurrenceId + basisFingerprint、超過はエスカレーションのみ(自動続行分岐なし)
- park の 1 HUMAN_TURN = 1 park 会計は無改変 — 人間実在会計の弱化なし。REPAIR resume は是正証跡必須(fail-closed)

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:28Z
- **Iteration:** 1
- **Scope decision:** none

waiting-interruption: security bullets trace to R-2/R-6/R-7/R-9, no test-theatre, logical-components correctly maps C4, no FD contradiction.

### Findings

- None
