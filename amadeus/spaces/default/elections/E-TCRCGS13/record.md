# Election Record — E-TCRCGS13

- question: intent 260719-tally-choice-ruling / code-generation の §13 学習候補1件の採否。候補(conductor 起案 verbatim): 『worktree 隔離 subagent の resume は隔離を保証しない — 再開は新規 Agent(isolation:worktree)で行うか、再開直後に cwd/branch を実測検証する(#1269 実測)』。実測根拠: 逸脱選挙後の builder 再開(SendMessage resume)が worktree 隔離を失い conductor 本線ツリーで実行された(cwd=engineer-1・bolt ブランチへ switch。実害なし — team ブランチ全 push 済み・復旧後 clean 実測・record 無傷)。#1269 として Issue 起票済み(クロスレビュー進行中)。ステージ文脈: builder 全検証 exit 0・落ちる実証 6fail→17pass・閉包 winner=2・PR #1268 発行済み。各自 e1 record と #1269 を実測確認のうえ GoA 付きで投票してください。

裁定: 採用
- 留保(e4, GoA2): persist は c2(worktree ディスパッチ規律)系への追補統合とし独立 cid を新設しないこと。また #1269(documentation)との二重管理を避けるため、norm 着地後の Issue クローズ時に Issue 側から norm cid への参照で閉じる運用を推奨
- 留保(e3, GoA2): c2(worktree ディスパッチ規律)系への追補統合とし、文言に『resume メッセージには作業 worktree の明示パス+git 操作の worktree 限定を毎回再掲する』を含めること — 私の #1258 是正 resume(同日)は再掲したため隔離を維持できた対照実例で、再掲なしの resume が cwd 継承で本線へ落ちる機序と対になる。
票タイムライン: 配信 2026-07-19T23:38:04Z → 配信 2026-07-19T23:38:04Z → 配信 2026-07-19T23:38:04Z → e4 2026-07-19T23:39:17Z → e3 2026-07-19T23:39:19Z → e2 2026-07-19T23:41:17Z → 開票 2026-07-19T23:41:32Z
GoA[E-TCRCGS13]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
