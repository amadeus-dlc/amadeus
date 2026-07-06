# code-structure — 260705-upstream-sync

正本は [codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)（解析時刻 2026-07-05T23:26:00Z、対象コミット 314ad98f）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

正本 codekb/amadeus は 2026-07-05T12:25:00Z の全面再解析（対象コミット 3049eadf、PR #496）を基底とする。本 Intent（260705-upstream-sync / Issue #428 / scope: refactor）では、merge 済み PR #489/#500/#503/#505/#508 の非 aidlc 変更について影響評価を実施し、差分が確認された箇所のみを外科的に更新した。本 artifact への変更内容: dev-scripts/evals の件数 25→28（pdm-scope、docs-codekb-guards、installer が追加）、scripts/（利用者向けインストーラ入口）を追記、mise.toml（node = "24"）を追記。採用方式はピア協議（engineer2/engineer3）による「差分列挙 + 影響評価」方式（decision 記録済み）。
