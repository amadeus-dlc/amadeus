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

- 2026-07-23T01:30:49Z — [Interpretations] 本ステージはユーザー質問0問で実行: RA の Open Questions 2件(team-up.sh 配置先/スキル正本位置)は投影機構の実測(claude manifest.ts:51-54 の coreDirs スキル行・codex emit.ts:338 の明示リスト・coreDirs tools 投影)により機械的に確定し、価値判断の残余なし(ADR-1〜3 で裁定+代替案記録)。
- 2026-07-23T01:30:49Z — [Interpretations] amadeus-leader-sync.ts は移設対象外と設計判断(scope の4要素外・Must/Should いずれにも不属)— components.md C4 に明記。
- 2026-07-23T01:30:49Z — [Tradeoffs] team-up.sh の配置は core/tools(全6面投影、kiro 系には実行対象なしだが無害)を選択 — 表層2面複製(drift 温床)と選択投影の新機構(過剰)を棄却(ADR-2)。

- 2026-07-23T01:43:02Z — [Deviations] §12a iteration 2 NOT-READY の残余(consumes 宣言外 codekb 引用クラス3箇所)は、reviewer 予算(max 2)消費後の残余是正として機械検証可能クラスで受理: 是正が file:line で一意特定済み+同型の全数棚卸しが有限語彙(codekb basename 7種)の grep で機械閉包可能(sweep 結果 = 指摘2箇所のみ、未発見同型なし)+各事実は conductor 再実測(import grep 0件・VERBS 9種 :50 verbatim)で裏取り。3箇所を正本直読実測の出典へ統一是正し、閉包 grep 0件を実測(cid:delegated-review-analysis-with-owned-verdict 追補 (b))。E-SRCU2FD の自票(omission 系は追加イテレーション)との整合: あちらは開放集合の伝播先、こちらは閉集合(codekb ファイル名 7種)の attribution — クラスが異なる。
- 2026-07-23T01:43:02Z — [Interpretations] iteration 2 で5/6 閉包成立を reviewer が verbatim 再実測で確認。同型欠陥の縮小適用(same-root-inventory 不実施)を反省点として PM 報告対象に追加。
