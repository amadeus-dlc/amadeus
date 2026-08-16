# Security Design — unit presence-detection

> 上流: requirements.md NFR(fail-closed 保存・P2 append-only/非偽装・後方互換禁止)+ 各 FD business-rules。承認済み NFR に perf/security の数値目標は存在しないため、本書は該当 unit の fail-closed / 認可境界の設計面のみを扱い、目標なきベンチマーク・検査は生成しない(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 不生成の根拠: NFR 節に数値目標宣言なし。覆す条件: NFR へ数値目標が追加されたとき)。

- 判定は HUMAN_TURN 造幣パイプライン(#755 の偽装検出通過済み)の読取のみ — 新しい presence 生成面を作らない
- 判定不能は非対話へ fail-closed(interactive: false)— 例外・読取不能が『対話扱いで進む』方向へ倒れない
- 棄却済み代替(鮮度ウィンドウ/TTY/明示フラグ)の不実装を文書検査で固定 — 宣言忘れ・誤判定クラスの再導入防止

- 認証情報・シークレットの取扱いなし(CLI 内部機構)。入力検証は各 parse 境界で fail-closed。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:07:28Z
- **Iteration:** 1
- **Scope decision:** none

presence-detection: security bullets trace to R-1/R-2/R-3/R-5, no test-theatre, logical-components correctly maps C3, no FD contradiction.

### Findings

- None
