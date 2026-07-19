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

- [2026-07-19T23:46Z] Interpretation: nfr-design:c4(構造保証の層別記述)と E-SMF-ND 追補(in-process=計測軸 / テスト層=配置軸の独立)を logical-components / reliability-design に反映。断定的インベントリは書かない(nfr-design:c7 — 目録は code-generation-plan へ)。

- [2026-07-19T23:58Z] Interpretation: iteration 1 = READY(NR→ND 全単射・引用7点 verbatim 一致・model 層 import 0件実測)。non-blocking minor 2件を code-generation-plan への持ち越し事項として受領: (1) 同時刻 amend 優先の正しさを支える構造的不変(amend は参照先より配列後方に append — unknown-ref 照合が保証)を plan に1行明示 (2) BR-4 適用点の番号↔行の対応読み。
