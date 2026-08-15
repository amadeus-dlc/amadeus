# Security Design — unit config-visibility

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- 旧キー(trigger.mode / consent 軸旧名)は LEGACY_KEY_REPLACEMENTS の loud fail — 互換シム・無音読み替えなし
- 表示は実効判定関数と同一ソース(UI 真実性)— 表示と実挙動の乖離を構造的に排除
- consent 軸は autonomy mode から独立 — mode 変更が外部書込 consent を暗黙に変えない

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:28Z
- **Iteration:** 1
- **Scope decision:** none

config-visibility: security bullets trace to R-2/R-6/R-7, no test-theatre, logical-components correctly maps C7+C8, no FD contradiction (R-8's known out-of-scope consumer gap is FD-level, not a security-design defect).

### Findings

- None
