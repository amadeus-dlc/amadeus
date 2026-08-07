<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-06T05:00:00Z — Comprehensive の「15 tests/component」を件数ノルマではなく契約の網羅と解釈した; 各 BR/AC に対して「それを落とせるテストが 1 つ以上あること」を基準にし、行カバレッジの数値目標は置かなかった
- 2026-08-06T05:00:00Z — 性能指示書を「受入基準を設けない」形で作成した; U3 performance-design が明示 NFR 不在を理由に設計目標のみと定めており、未実測の推定値を基準に昇格させない方針に従った

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-06T05:00:00Z — ステージ指示の「2 回試して直らなければ記録してゲートへ」を、修復ではなく**切り分け**で履行した; CI の 5 ファイル赤は変更前コミットの分離 worktree と失敗集合が完全一致したため、修復対象ではなく既存事象として記録した

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-06T05:00:00Z — 回帰判定に git stash ではなく分離 worktree を選んだ; 対象変更は既にコミット済みで stash が無効だったためで、実際 1 回目の stash 切り分けは偽のベースラインを見ていた
- 2026-08-06T05:00:00Z — 性能は合成 corpus ではなく実 corpus(216 シャード / 127,715 行)で測った; 測定値は測定 ref と併記しなければ意味を持たないため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-06T05:00:00Z — no-silent-drop 系ガードのベース revision 依存をマージ前にどう解消するか(origin/main と 13/51 コミット分岐中)
- 2026-08-06T05:00:00Z — formal-model-check の macOS 既定経路(auto → sandbox-exec)不通と JDK パッチ版完全一致ピンを別 Issue 化するか
