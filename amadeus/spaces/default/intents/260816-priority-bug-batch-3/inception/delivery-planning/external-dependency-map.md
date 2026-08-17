# External Dependency Map — intent 260816-priority-bug-batch-3

## 外部依存の棚卸し

| 依存 | 所有者 | リードタイム | ブロックする Bolt | 緩和 |
|---|---|---|---|---|
| GitHub(PR 作成・レビュー・merge queue) | GitHub(常設) | 即時〜CI 実行時間 | 全 Bolt の着地 | gh CLI の runnable/auth を利用前検査、障害時は loud fail して継続(ALWAYS gh optional dependency) |
| GitHub Actions 必須 CI(ci-success 集約) | リポジトリ CI | 実測 10-15 分/run | 全 Bolt の merge-ready | push-first で実装と並列化。Review Thread Gate の stale fail は `gh run rerun --failed` で回復(bt-review-thread-gate-stale-fail) |
| CodeRabbit レビュー | 外部 bot | push ごと数分 | 全 Bolt の収束 | per-push sweep 定型(cid:pr-convergence:c1)— unresolved×non-outdated の全数取得と実否検証 |
| merge queue(main Ruleset) | リポジトリ設定 | 先行 PR 依存 | 着地順序 | 直列着地の Bolt 番号順投入。queue 投入後の push 不可(GH006)を前提に record 訂正は conductor record 正本で |

外部チームへのハンドオフ・API 承認・データ可用性待ちは存在しない。

## 内部依存(参考)

- 各 Bolt worktree の self-install 面: 依存インストール + `bun run build`(solo-bolt-worktree-required)
- Bolt 3 の自己適用は risk-and-sequencing-rationale.md のリスク登録を参照
