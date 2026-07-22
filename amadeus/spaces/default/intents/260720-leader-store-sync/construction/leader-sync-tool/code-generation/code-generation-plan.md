# Code Generation Plan — leader-sync-tool(U1)

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements — 実装順序は business-logic-model の M1〜M8、制約は business-rules BR-1〜BR-9、型は domain-entities、I/O と runner は performance-design / security-design、完成条件は unit-of-work / requirements に依拠

## 実装計画

- [x] Step 1: `scripts/amadeus-leader-sync.ts` に判別ユニオン、引数解析、named constants、`shardBasename`、所有物抽出(M1/M2)を実装する — trace: FR-2, AC-3a, BR-1/5/8, U1
- [x] Step 2: 差分パース、E-PM10A 除外判定、memory 復元、自己検査と PR 本文レンダリング(M3/M4/M5)を純関数中心に実装する — trace: AC-3b/3d, BR-2/4/6/9, U1
- [x] Step 3: GitRunner/GhRunner の no-shell 実装、status/plan/create の orchestration、origin/main 起点 branch と PR 作成(M6/M7/M8)を実装する — trace: FR-2/3/4, AC-3c, NFR-1/3, BR-3/5
- [x] Step 4: `tests/unit/t245-amadeus-leader-sync.test.ts` に M1/M2/M3/M5/M7、引数、PR 本文、packages 側 `auditShardName` との drift 検知を追加する — trace: AC-3a〜3d, AC-5a, BR-8
- [x] Step 5: `tests/integration/t245-amadeus-leader-sync.integration.test.ts` に mkdtemp workspace と fake Git/Gh runner を用いた handler 境界、memory 巻き戻し・member snapshot の2注入、transient 3形 corpus を追加する — trace: AC-3b, AC-5a/5b/5c, BR-6/7
- [x] Step 6: test coverage registry の freshness/guard/ratchet を確認し、新規 CLI と unit/integration テストが既存検査面で成立することを検証する — trace: AC-5a, NFR-2
- [x] Step 7: focused tests、typecheck、lint、dist:check、promote:self:check、coverage/patch 検査を実行し、未被覆や生成物 drift を是正する — trace: AC-5a, NFR-2, U1 完成条件
- [x] Step 8: 実装差分・検証値・計画逸脱を `code-summary.md` へ確定値で記録する — trace: U1、Code Generation stage 完成条件

## 対象外

- FR-2 の同期契機ノルム persist、既存 engine/election CLI、CI workflow、auto-merge、既存 store の再編は変更しない。
- 新規 test config は不要。既存 Bun test runner、`tsconfig.tests.json`、coverage registry をそのまま使用する。

## Revision Iteration 1

- [x] 実 Git の一時 sync branch へ memory rollback と member snapshot を注入し、実差分の M3 赤→M4 後 memory のみ解消→snapshot 除去後 green の往復を固定した。
- [x] origin/main の既存 elections 全量を detached worktree で決定的に列挙し、実 FS の `selfCheck` と `checkExclusions` が green になる corpus sweep を追加した。transient 3形 fixture は別テストとして維持した。
- [x] create を owned 抽出→origin/main worktree→copy→M4 restore→実 branch diff/M3→commit/M5→push/create の順へ修正し、source foreign 非搭載と branch 内 snapshot 拒否を固定した。
- [x] remote ref を `ls-remote --heads` で直接列挙し、branch 予約衝突時は同一 seq を反復せず上限付き再試行するよう修正した。
- [x] worktree/一時 dir/local branch の cleanup 結果を検査し、push 後の GitHub CLI 失敗を含む全 fault で local branch 削除を試行するよう修正した。
- [x] clone-id/git/GitHub CLI/usage を `SyncError` 判別ユニオンへ正規化し、stderr と exit code の完全 switch 写像を追加した。
- [x] `handleCreate` の責務を branch 予約、生成・公開、cleanup、outcome 表示へ分割し、対象 Biome の complexity warning を 0 件にした。

## Revision Iteration 2

- [x] `owned.shardPaths` が空の `syncStatus` を明示 no-op とし、pathspec なしの `git diff --numstat origin/main --` を呼ばないよう修正した。
- [x] foreign numstat を返す fake Git を用いた境界テストで、`shardDeltaLines=0` と unscoped numstat 呼出しゼロを固定した。修正前は 1 fail、修正後は focused 35/35 green を実測した。
- [x] focused、typecheck、対象 Biome、coverage、coverage registry、dist 検査を再実測した。
