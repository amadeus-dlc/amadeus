# Stage Diary — code-generation(3.5)

## Interpretations

- 2026-07-09T13:50:00Z — units-generation SKIP(bugfix)のため Bolt=バグ単位4件で編成し、engine の run-stage(subagent)を worktree 隔離の並列 fan-out で実行した; team.md parallel-bolts / subagent-utilization ノルム準拠。
- 2026-07-09T13:50:00Z — FR-1.3 の条件分岐は「判別材料あり」側で解決; ライブセッションでの実機キャプチャ(一時・未コミットのフック計測、採取後 revert)により prompt 接頭 `<task-notification>` が唯一の判別子と確定したため。

## Deviations

- 2026-07-09T13:50:00Z — B1(#708)のサブエージェントが「CI モニタ待ち」でターンを終える無応答パターンに入ったため、SendMessage で完遂を再指示して復帰させた(cid:code-generation:c5 の引き取りの手前で解決)。

## Tradeoffs

- 2026-07-09T13:50:00Z — #715 の codecov/patch 赤への対応として、handleCodekbPath の export(test seam)+ in-process ハンドラテストを採用; bun --coverage が spawnSync サブプロセスを計測しないという実測に基づく。CLI テストだけで済ませる案は計測に乗らないため不採用。
- 2026-07-09T13:50:00Z — 共有生成ファイル(coverage-registry/ratchet)を触る並列 Bolt のマージは直列化+再生成が必要(architecture-reviewer iter1 Major)。ランブック化して conductor 執行とした(#716 マージ後に #715 をリベース+再生成+force-push で緑化、実運用済み)。

## Open questions

- 2026-07-09T13:50:00Z — #708 の判別子は Claude Code の prompt 慣行(`<task-notification>` 接頭)への外部結合。harness が将来 source フィールドを提供したら置換する(enhancement、bugs-only スコープ中は起票のみ対象)。
