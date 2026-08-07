# Election Record — E-SSP-CGS13

- question: 260807-subagent-start-pair code-generation ステージ（2 unit: fix-2297-wiring / fix-2303-dispatch-tool）の §13 学習選定。候補は2件。C1: pr-convergence plugin 導入後の CG record 側順序 — reviewer-runtime の scope は produces 全数（pr-convergence-report.md 含む）の実在を要求するため、§12a レビューは『PR 発行 → 収束 → report 生成』の後にしか記録できない。従来の『レビュー READY → Bolt PR 発行』の順序は plugin 導入環境では構造的に成立せず、record 側定型は builder 完了 → code-summary → PR 発行 → converge → report → §12a → approve となる（wave 1 fix-2352 と wave 2 の2 intent で実測。レビュー READY が merge 伺いの前提である点は不変）。cid:code-generation:c1-parallel-degrade-batch への追補として persist する案。C2: record 成果物を worktree ブランチにコミットした状態で bolt ブランチへ checkout すると record ツリーが main 断面へ巻き戻り、その状態で record 書込 CLI（pr-convergence-cli report 等）を実行すると出力が誤ブランチ上の untracked ファイルとして着地する（wave 2 で実測 — untracked だったため branch 復帰後も生存したが、tracked 化後は消失クラス）。record 書込 CLI の実行前に git branch --show-current で worktree ブランチ在位を実測する1手を、cid:requirements-analysis:shard-commit-before-branch-switch ファミリへ追補する案。選択肢: 1 = C1+C2 両方採用、2 = C1 のみ採用、3 = 採用 0 件。各候補の実在根拠（record・実測タイムライン）を独立検証して投票せよ。

裁定: C1+C2 両方採用(choice 1 — tie 裁定)
- 留保(subagent-1, GoA2): C2 は独立 cid を新設せず cid:requirements-analysis:shard-commit-before-branch-switch ファミリへの1行追補として persist し、既存本文（切替前コミット・切替後の branch 実測）の文言を弱めないこと。追補の核心は『record 書込 CLI（人手編集でなくツール）の実行前にも branch 在位を実測する』の1点に限定し、intent 固有の PR 番号・unit 名は焼き込まない。あわせて実測根拠として reflog の時刻対照（fix-2303 report generated at 2026-08-07T15:07:57Z、HEAD は 14:55:46Z〜15:08:06Z の間 bolt-2297-wiring に在位）を記載し、near-miss ではなく実際に誤ブランチ上へ着地した事象であることを明示する。
- 留保(subagent-2, GoA3): C2 を不採用とするのは現時点の射程判断にすぎない — 同型が再発し、かつ report が tracked 化して実消失が起きた場合は、書込アクション側をアンカーとする追補として shard-commit-before-branch-switch ファミリへ昇格させる。今回の near-miss は本 intent の CG diary に事実として残し、実例が失われないようにすること。
票タイムライン: 配信 2026-08-07T15:26:30Z → 配信 2026-08-07T15:26:30Z → subagent-1 2026-08-07T15:29:05Z → subagent-2 2026-08-07T15:29:28Z → 開票 2026-08-07T15:29:37Z
GoA[E-SSP-CGS13]: 1x0 2x1 3x1 4x0 5x0 6x0 7x0 8x0

- hold 裁定履歴: tie → choice:1(2026-08-07T15:30:40Z、復帰先 tallied)
