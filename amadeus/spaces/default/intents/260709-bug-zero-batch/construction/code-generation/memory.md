<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-09T09:47:00Z — units-generation SKIP のフォールバックとして、per-unit の code-generation-plan.md ではなくバッチレベルの単一 plan(construction/code-generation/code-generation-plan.md)に6 Bolt を編成した; ステージレビュアーの major 指摘『plan がどこにも無い』は消失インシデント(下記)+per-unit パスのみの探索によるもので、plan は再作成済み。per-unit produces 契約との形式差は次バッチで要検討

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-09T09:47:00Z — 並列ディスパッチのプロンプトに conductor 本線ツリーのパスを記載したため、複数の worktree 隔離エージェントが本線に誤入して checkout/stash を実行するインシデントが発生; ブランチ・stash を patch-id 照合で精査しデータ損失は plan/memory の未コミット2ファイルのみ(内容はコンテキストから再作成、監査行 ARTIFACT_CREATED 09:08:34Z が初版の存在を証明)。教訓は §13 で永続化
- 2026-07-09T09:47:00Z — このファイル自体もインシデントで消失したため再作成; 初版に記録していた観察は本再作成版に統合済み

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-09T09:47:00Z — 6 Bolt を amadeus-bolt の worktree 機構ではなく harness の Agent worktree 隔離で並列実行した; autonomy grant がなく engine の invoke-swarm 経路が発火しないため、conductor 所有のファンアウトとして正当。ただし共有 stash・本線パス混入のリスクが顕在化した(上記インシデント)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-09T09:47:00Z — マージ順の dist 衝突リスク(ステージレビュー minor): 4つの core PR は別ファイルを触るため理論上クリーンだが、マージ時に GitHub の mergeable 状態を1件ずつ確認する
