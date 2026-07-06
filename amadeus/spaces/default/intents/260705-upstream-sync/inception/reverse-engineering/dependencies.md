# dependencies — 260705-upstream-sync

正本は [codekb/amadeus/dependencies.md](../../../../codekb/amadeus/dependencies.md)（解析時刻 2026-07-05T23:26:00Z、対象コミット 314ad98f）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠

正本 codekb/amadeus は 2026-07-05T12:25:00Z の全面再解析（対象コミット 3049eadf、PR #496）を基底とする。本 Intent（260705-upstream-sync / Issue #428 / scope: refactor）では、merge 済み PR #489/#500/#503/#505/#508 の非 aidlc 変更について影響評価を実施し、差分が確認された箇所のみを外科的に更新した。本 artifact への変更内容: amadeus-lib.ts が `git rev-parse --git-common-dir`（spawnSync）で linked worktree の codekb repo 名を解決（#498）、git 不在時は basename フォールバック（fail-open）を追記、インストーラ（scripts/amadeus-install.ts）が配布物から参照されない独立スクリプト（DR-4）である点を追記。採用方式はピア協議（engineer2/engineer3）による「差分列挙 + 影響評価」方式（decision 記録済み）。
