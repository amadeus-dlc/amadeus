## Interpretations

## Deviations
- 2026-07-31T12:43:46Z — Bolt 1 builder が3件の逸脱を実装前停止なしの「宣言付き」で報告(1: FR-5b baseline 再カット見送り 2: argv seam の io 注入抽出 3: 分類器の共有抽出)。1 は要件前提の実測不成立(baseline=固定床)によるものでユーザー裁定で承認・FR-5b へ前提訂正を記録。2/3 は既習様式への準拠(run-tests-totals seam / canonical 1定義)で設計整合 — 受理
- 2026-07-31T12:43:46Z — Bolt 1 walking-skeleton ゲート: ユーザー承認(PR #1848 発行済み、マージは CI green 後に別途伺い)。swarm check/finalize converged、record fragment merge 完了

## Tradeoffs
- 2026-07-31T21:15:24Z — Bolt 1 で conductor と builder が同一 worktree で coverage:ci を並行実行し相互破壊(runner が起動時に coverageRoot を rmSync — 22pp の偽スイングと偽 stale allowlist を双方向で観測、builder の loud 警告で回収)。教訓: 同一 worktree の coverage gate は branch ごとに単独所有者を決める。c5 引き取りの発動は「無音経過時間」でなく live プロセス実測(run-tests --coverage の実在)+事前 ping を先行条件にする — 長時間フォアグラウンド検証こそ第二の書き手が最も破壊的
- 2026-07-31T21:15:24Z — conductor が watcher スクリプトで短縮 SHA を手で完全形へ展開し fabricated SHA で監視が即時誤完了(sha-no-manual-expansion 違反の自己捕捉・実害は待機ロスのみ)。rev-parse 実出力のみ使用へ即時是正

## Open questions
