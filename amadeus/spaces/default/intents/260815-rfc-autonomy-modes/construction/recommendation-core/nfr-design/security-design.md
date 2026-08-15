# Security Design — unit recommendation-core

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- contested の構築点制約(候補 ≥2)と parse-don't-validate が偽装 outcome の混入を遮断する — 外部 JSON からの復元は parse 経由のみ
- basis.fingerprint は不透明 SHA-256(算出は下流)— 本 unit は書式検証のみで、偽 fingerprint による裁定偽装は下流の照合(監査)で検出
- AUTO_DECIDED は unique のみ放出(型保証)— 縮退進行による無権限自動裁定を構造的に排除

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:28Z
- **Iteration:** 1
- **Scope decision:** none

recommendation-core: security bullets trace to R-2/R-6/R-7, no test-theatre, logical-components correctly maps C1+C2, no FD contradiction.

### Findings

- None
