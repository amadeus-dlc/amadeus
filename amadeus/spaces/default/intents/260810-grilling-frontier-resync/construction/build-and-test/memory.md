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

## Interpretations
- 2026-08-10T14:20:00Z — Comprehensive 戦略でも performance / security は「承認済み NFR と実在境界へ trace できる範囲」に限る(cid:build-and-test:bt-proportional-selection)。本 intent は数値目標を伴う性能 NFR が0件のため専用ベンチマークを作らず、非該当の判定・根拠・覆すべき条件を指示書へ明記した(cid:build-and-test:c2-no-test-theatre-for-absent-nfr)。

## Deviations
- 2026-08-10T14:10:00Z — code-generation approve が workspace_requires で拒否。conductor ツリーでは Bolt のコードが**マージ経由**で到達しており、recordBranchSourceWork が `--first-parent --no-merges` で merge 到来コードを設計上除外し、boltRefHasSourceWork も取込後は merge-base == bolt tip で diff 空になるため経路 (a)(b) がともに不成立だった。経路 (c)(mergedPrSourceWork)を満たすため、origin/main(Bolt 2/3 の squash 着地を含む)を取り込み、state の Project フィールドへ**実装 PR 番号の事実記載**(#2828 / #2843 / #2844)を追記して通過。虚偽参照による guard 迂回は禁止(検証劇場)であり、本追記は実在する実装 PR の記載に限る。
- 2026-08-10T14:15:00Z — build-and-test 直前の `next` が `await-advisory-choice: advisories[0].code must be one of ...` で malformed directive を拒否。原因は formal-model-check plugin の advisory evaluator が exit 1(直前に取り込んだ origin/main の #2841 = plugin の evaluator argv 解決修正が `.claude/plugins` 投影へ未反映)。`bun run build` で投影を再生成したところ evaluator は exit 0 / `no-hold` を返し、`next` が正常に run-stage を発行した。**main 取込後の投影再生成は engine の指令発行そのものに影響する**(cid:code-generation:c1-mirror-and-rebuild-before-review の engine 面)。

## Tradeoffs
- 2026-08-10T14:45:00Z — フルスイートは conductor ツリーで exit 0(943ファイル PASS / 0 FAIL、13,030 assertions / 失敗0)。Bolt 2 builder の隔離 worktree(base a5e05d2af)では4ファイル赤(no-silent-drop の BASELINE_INVALID 3件 + t222 の既存 flaky 1件)だったが、main 着地後の本ツリーでは全解消 — 赤が base 側の状態に依存していたという builder の帰属を独立に裏付けた(cid:build-and-test:bt-20260730-2 の逆方向確認)。

## Open questions
- FR-DOG-1(dogfood 実走)の実施時期 — 受け入れ基準の内側だが実走という運用行為であり、operation フェーズは本スコープで SKIP のためゲートでユーザーへ諮る。
