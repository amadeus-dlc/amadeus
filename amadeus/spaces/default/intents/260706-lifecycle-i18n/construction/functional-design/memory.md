<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-06T08:25:00Z — §12a 反復 2（上限）が「本 Intent で確立」ラベルの既訳見落とし 2 行（single entry point = steering.md 24・61 行、human gate = aidlc-v2-reviewer-mapping.md 25・58 行に既訳あり）を検出した。両行を実測出典へ差し替え、前文の再点検宣言も訂正した。反復上限のため本修正は gate で確定する。見落としの原因は「本 Intent で確立」行の grep を docs/ ではなく記憶で判断した行が残っていたことで、反復 1 と同型（出典主張には全行 grep を機械的に通す、の徹底不足）。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T08:15:00Z — §12a 反復 1 の指摘 2 件を修正した。(1) HIGH: 訳語対応表の出典 8〜9 行が実在しない・実既訳と矛盾（abolished → retired、canonical registry → canonical ledger、working agreements → working conventions、decision criteria → judgment criteria へ訳語自体を修正。既訳が存在しない語は「本 Intent で確立」へ正直にラベル変更。全行を実 grep で再点検し行番号付き出典へ）。(2) MEDIUM: 逆方向リンク（直下 4 ファイル・5 箇所の ja→en）が本 Intent 完了後に policy 違反状態になる問題 → B002 最終手順として ja→ja 化を最小追加し BR-10 を更新（gate 報告で確定）。
- 2026-07-06T08:15:00Z — 訳語表の初回作成時に出典を記憶ベースで書いた（grep 裏取りなし）ことが HIGH 指摘の根本原因。以後、出典付き対応表は作成時点で全行 grep 裏取りを必須とする。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
