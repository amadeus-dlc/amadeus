# Security Design — unit semi-authority-projection

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- 効果天井の保存: advisory-deferral は plugin advisories 宣言由来のみ(構築点限定)、blocking 系へ不適用 — 落ちる実証 2 本で pin
- 投影乖離は全 mode loud fail(D3/D9)— 無言縮退の除去。unset 免除は pair(宣言 none ∧ unset)のみ(R-25)
- amadeus-log.ts:278 の presence ガード迂回を semi へ広げない(R-21)— FR-12 の封鎖と逆行させない
- WS ゲートの Stance 従属は発火判定のみの変更 — ゲート自体の人間承認要求は不変

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:28Z
- **Iteration:** 1
- **Scope decision:** none

semi-authority-projection: security bullets trace to R-7/R-8/R-10/R-13/R-17/R-21/R-25, no test-theatre, logical-components correctly maps C5+C6, no FD contradiction.

### Findings

- None
