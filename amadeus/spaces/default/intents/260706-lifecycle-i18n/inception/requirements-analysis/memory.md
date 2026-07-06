<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T07:58:00Z — §12a 反復 2（上限）が残 2 件を指摘した。(1) 流入参照の列挙に development.md の 2 箇所の転記漏れ（grep 出力には含まれていたが列挙への転記で漏れた）→ 16 ファイル・30 箇所へ訂正。(2) PR #563 が反復の間に merge（07:36:09Z）され状態記述が陳腐化 → 一次根拠を merge 済み 2 件へ更新し、成立した分岐（lifecycle ja 版から直下文書への ja→ja 参照）を FR-2.4 として要求化。反復上限のため両修正は gate で確定する。origin/main（#563 merge 後）への追従も完了。
- 2026-07-06T07:50:00Z — §12a 反復 1 の指摘 3 件を修正した。(1) Major: 流入参照の初回実測「12 件」は探索範囲が狭く不正確 → repo 全体の再実測で 15 ファイル・28 箇所へ訂正し、FR-4.3 の検証対象リストにした。README.ja.md 等の docs/amadeus/ 外からの ja リンク切り替えは policy 適用範囲外としてスコープ外を明記。(2) Medium: 陳腐化対応の一次根拠を未 merge の #563 から merge 済みの PR #561（GD009 補正）へ変更し、#563 は参考例と明記。(3) Minor: 見出し対訳併記は H1 のみと確定（FR-1.4 新設。実物で H2 以下が素の日本語であることを確認）。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
