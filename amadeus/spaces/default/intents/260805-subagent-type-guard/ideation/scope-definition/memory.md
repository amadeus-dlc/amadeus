<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T15:05:00Z — intent-capture Q1〜Q4 の既決事項は再質問せず(no-election-for-decided-norms / intent-capture:c1)、真に未決の2問(順序付け方針・別 Issue の起票時期)に絞った。Standard depth 予算8問に対し実質2問。
- 2026-08-05T15:14:00Z — Should/Could を置かず Must 5件(PU-0〜PU-4)に凝集した。Q1・Q2 の裁定で拡張候補がすべて Out(別 Issue)へ分離済みのため、MoSCoW の中間段が空になるのは裁定の帰結(cid:scope-definition:c2 の先例に整合)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T15:12:00Z — ステージ途中でセッションを本線ツリーから worktree `.claude/worktrees/260805-subagent-type-guard/` へ移設した(ユーザー指示)。本線は `tla-authoring` へ復帰。移設前に record をチェックポイントコミット(c66a2c987)し、worktree 側で `bun install` + `bun run build`(セルフインストール面の再生成 — source-only 境界により未追跡)+ active-intent カーソル再設定を実施。audit の cloneId は移設境界で d4a945003a7f → 90d528d24302 に変わる(per-clone シャード仕様どおり)。
- 2026-08-05T15:13:00Z — Q2=B の履行として、ステージ実行中に別 Issue 2件を起票した(#2297 bug/P2/S3-MAJOR settings drift、#2298 enhancement/P3 汎用 builder persona)。起票のみでスコープ外の作業はしていない。起票前に重複検索(open/closed)と関連 PR 検索を実測(cid:pre-filing-dup-and-branch-check)。

## Tradeoffs
- 2026-08-05T15:10:00Z — Q1 は risk-first(A)。R-1(live payload の model 有無)が CAP-2 の実現範囲を左右する最大の不確実性で、cid:scope-definition:c3 の先例(未証明の基盤に依存する価値面を先行着地させない)と一致。非採用の value-first は R-1 未確定のまま (a) を固定するリスク、dependency-first はリスクを順序に反映しない。
- 2026-08-05T15:10:00Z — Q2 は今すぐ起票(B)。issue-first-capture(発見時点で起票し本線へ戻る)に従い、クロスレビューで証拠が揃っているうちに正書式で書くのが最安。非採用の「完了までに起票」は忘却リスク、「起票しない」は record 外への可視性を失う。

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
