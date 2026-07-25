<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-25T23:40Z (U2) — 完了照合の述語をディレクトリ実在から `git worktree list --porcelain` の登録確認へ変更した。nfr-design の reviewer 指摘（`git worktree add` は対象ディレクトリを作った後に checkout で失敗しうるため `[ -d ]` は偽陽性）を実測で裏取りした結果: 正常な worktree = 登録1件、ディレクトリのみ = 登録0件。
- 2026-07-25T23:40Z (U2) — 並列度の上限4は「上限を置くこと自体」が要点。無制限ファンアウトは 7.55秒で直列 7.39秒とほぼ同じ（git がオブジェクトストアで直列化する）。実測: 直列 7.77秒 vs 並列度4 で 3.60/3.55秒。
- 2026-07-25T23:58Z (U1+U2) — 実 launch（7人構成）でアタッチ到達 T+11.80秒、exit 0、sentinel 7/7。本 intent の成果は「速くなった」ことより **#1384 の保護が実際に機能するようになった**ことにある — 起動レイテンシ自体は前 intent (PR #1477) で既に解消していた。
## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-25T23:55Z (U2) — §12a 第1イテレーションで NOT-READY。Major 1件: `code-summary.md:24` の正本挿入行数を +87 と記載したが実測は +73（`--stat` の合算値 73+14 を挿入行数と取り違え）。Minor 1件: CREATED_MEMBERS の grep 結果を「0 件」と記載したが実測は 1 件（t295 の歴史的経緯コメント。実行コードの消費者は 0）。両件をコマンド出力から転記し直し、第2イテレーションで是正 diff 自体の独立再検証を経て READY。
- 2026-07-25T23:50Z (U2) — 検証コマンドの初回実行が4種とも exit 127 だった。原因は bun が PATH 上に無かったこと（コマンド自体が起動していない）で実装の失敗ではない。PATH を通して再実行し4種とも exit 0 を確認。127 を「検証失敗」として報告しなかった。
## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-25T23:40Z (U2) — ロールバックの台帳（`CREATED_MEMBERS`）を復活させず廃止した。並列化で各メンバーがサブシェルに入り親へ書き戻せないため、台帳の維持には一時ファイル等の外部機構が要る。観測ベース（RUN_ROOT を歩く）へ切り替え、誤削除の危険は3層限定（起点・名前・深さ）で抑えた。台帳を持たない方が「作ったつもりで作れていない」状態と乖離しない。
## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-25T23:55Z (U2) — Linux CI 上の並列度特性（RAID R-6）は未実測。macOS の実測に基づく上限4が Linux でも適正かは未確認。上限を置く設計自体が吸収する想定だが、根拠は移植していない。
- 2026-07-25T23:58Z — resume（`-c`）での actas ロック残存、および R-3（actas の受信範囲制限が配送を壊さないか）は未実測。build-and-test で扱う。