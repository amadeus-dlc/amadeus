# Security Design — unit merge-provenance

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- 委任条件の正本は team.md ノルムのみ(新設 config なし)— 委任範囲の設定面からの拡大を防止
- 記録は委任根拠 HUMAN_TURN 参照 + 実測値(CI conclusion / converged digest)— 事後検証可能な provenance
- 条件不成立時の人間承認要求は無退行(irreversible 一律拒否の他項目も不変)

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:29Z
- **Iteration:** 1
- **Scope decision:** none

merge-provenance: security bullets trace to R-1/R-5/R-6, no test-theatre, logical-components correctly maps C11.

### Findings

- NIT | security-design.md | 「irreversible 一律拒否の他項目も不変」の括弧書きは merge-provenance 自身の business-rules.md(R-1〜R-7)に対応する規則がなく、ADR-2/C5 の PROHIBITED_EFFECTS(semi-authority-projection unit 所有)への暗黙参照になっている — code-generation 前に出典行(ADR-2 または R-6 相当の明示)を追記すると trace が閉じる
