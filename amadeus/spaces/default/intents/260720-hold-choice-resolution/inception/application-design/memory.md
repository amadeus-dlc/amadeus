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

- [2026-07-20T04:33Z] Interpretation: 設計を record.ts 無変更へ寄せ(ADR-2)、e4 バッチとの交差をファイルレベルで解消 — 並行合意の条件(スコープ変動時の相互通知)は「変動なし」につき発動せず。
- [2026-07-20T04:33Z] Interpretation: ADR-1 の防御行(label 不在の ?? 縮退)は実在照合済み経路では到達不能 — 実装時に到達可能性を再評価し、不要なら省く(lcov 不達行の予防)を component-methods に明記。
- [2026-07-20T04:44Z] Deviations: reviewer iteration 1 = REVISE(Critical 1: tie 分岐スニペットが制御フロー未規定 — 有効 choice でも空テーブル lookup へ落ちる)。是正: handleHoldResolved を tie/非-tie 相互排他 if/else として明示(let resumedTo、else 側は現行字句そのまま)。Minor 2件(choices 変数出所・valid 列挙プレースホルダ)も具体化。iteration 2 へ。
- [2026-07-20T04:47Z] Interpretation: iteration 2 READY(findings 0 blocking)。補足所見(「字句1文字も変えない」の過大断定 — 実際は shadowing 回避の変数名リネームあり)を即時精密化(citation-semantics-check 準拠)。誤読時も TS definite-assignment でコンパイル時 fail-closed と reviewer が確認済み。
