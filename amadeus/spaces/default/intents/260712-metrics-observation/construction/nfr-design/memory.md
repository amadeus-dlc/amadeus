<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-12T07:12:00Z — Interpretation: 保証機構を層別に記載(nfr-design:c4)。P-2 の文字列検査の限界(e6 留保)を設計注記に転記し「構造変更で赤くなる=偽陽性側へ倒す」方針を明文化。R-4 は kind 型を持たせない判断(過剰設計回避)を根拠付きで記録。宣言パスは per-unit(前ステージの配置ミスの教訓を適用し最初から metrics-snapshot-cli 配下)。
- 2026-07-12T07:25:00Z — Deviation: reviewer iteration 1 = NOT-READY 4件 — Critical: R-1 の temp 残骸警告が確定済み CLI 契約(interaction-spec 正本)に無断の出力面を追加していた → 「放置+.json.tmp 命名で glob 非合致」へ是正(契約への追加なし)。Major: S-2 アサートの U3 未伝播(**3連続の同型** — セルフチェック宣言直後の再発。私の grep 棚卸しが「新設テスト」は拾えたが「既存テストへのアサート追加」を拾えていない — 棚卸し対象の定義を「新設義務・新概念・既存成果物への追記義務」へ拡張して適用する)→ (d) として伝播。Minor 2件(対処なし行の明示・stale Review 節の superseded 注記)も是正。
- 2026-07-12T07:35:00Z — Interpretation: iteration 2 = READY(予算内)。R-1 は「確定契約に出力面を足さない」安全側を採用(reviewer も同判断)。S-2 の cross-unit 伝播は「強制メカニズムの所在ユニットへ書く」原則として整理された(t222 は U3 在住のため)。
