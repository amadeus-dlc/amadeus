# Security Design — unit s13-zero

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- 0 件確定の根拠は surface 出力 digest のみ(自己申告排除)— 監査に digest を記録
- conductor 追加は増やす方向のみ・disk 再導出必須・追加集合も監査へ — 『0 件にする』方向の申告は構造的に不能

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:29Z
- **Iteration:** 1
- **Scope decision:** none

s13-zero: security bullets trace to R-1/R-3/R-4, no test-theatre, logical-components correctly maps C10, no FD contradiction.

### Findings

- None
