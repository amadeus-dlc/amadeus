# Code Summary — leader-sync-tool(U1)

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

## 実装結果

- `scripts/amadeus-leader-sync.ts` に `status` / `plan` / `create` の3 verb を実装した。
- 同期対象は選挙 store 全体と、`amadeus/.amadeus-clone-id` から正準化した自 clone の audit shard のみに限定した。clone ID は `O_NOFOLLOW` 付きで読み、欠落・不正・symlink を fail-closed とした。
- E-PM10A の除外述語として memory 層、他メンバー snapshot、その他の非所有差分を拒否し、`create` は `origin/main` 起点の隔離 worktree でのみ同期 commit と PR を作る。元 worktree は変更せず、自動 merge も行わない。
- 自己検査は election の純追加、audit shard の prefix append-only、JSON parse、正準 conflict marker 3語彙、memory 復元後の除外再検査を行い、結果を PR 本文へ機械転記する。
- 未同期選挙数、shard 差分行、norm 差分行、閾値超過を `status` で構造化出力する。閾値 `SYNC_ELECTION_THRESHOLD=10` と分割拒否上限 `SYNC_SPLIT_FILE_LIMIT=300` は named constant とした。
- Git/GitHub 呼び出しは argv 配列の no-shell runner を使用し、`GH_TOKEN` の読取・表示、auto-merge、shell 展開を行わない。

## Revision Iteration 1

- `SyncError` を `clone-id-missing | git-failed | gh-failed | usage` の判別ユニオンとし、完全 switch で stderr 1行と exit 1/2 を写像した。
- create の正準順序を branch 予約→owned copy→memory restore→生成 branch 実差分の除外判定→commit→自己検査→push→GitHub CLI create とした。source worktree の foreign 差分は生成 branch へ運ばず、生成 branch 内へ混入した snapshot は commit 前に拒否する。
- remote branch は Git cache に依存せず `ls-remote --heads` で列挙し、予約衝突時は同一 seq を反復しない上限付き retry とした。
- worktree remove、一時 dir 除去、worktree prune、local branch delete の結果を検査する cleanup を追加した。push 後の GitHub CLI fault でも local branch を削除し、設計に削除契約がない remote branch は保持した旨を loud detail へ含める。
- integration の falling proof を純関数入力から実 Git 往復へ置換した。origin/main の既存 elections 全量も detached worktree の実 FS へ `selfCheck` / `checkExclusions` を適用する corpus sweep とした。

## Revision Iteration 2

- `syncStatus` で `owned.shardPaths=[]` の場合は shard numstat を空文字列として扱い、Git を呼ばない明示 no-op にした。これにより pathspec のない全 repository 差分が `shardDeltaLines` へ混入しない。
- 境界テストは fake Git の unscoped numstat 応答へ foreign 99行を注入する。修正前は `shardDeltaLines=99` と不要な Git call により 1 fail、修正後は `shardDeltaLines=0` かつ当該 call 0件で green となった。

## 変更ファイル

- `scripts/amadeus-leader-sync.ts`
- `tests/unit/t245-amadeus-leader-sync.test.ts`
- `tests/integration/t245-amadeus-leader-sync.integration.test.ts`
- `amadeus/spaces/default/intents/260720-leader-store-sync/construction/leader-sync-tool/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260720-leader-store-sync/construction/leader-sync-tool/code-generation/code-summary.md`

## Acceptance Criteria 対応

- AC-3a: transient な collecting / hold / views-only corpus を列挙し、特定 clone shard だけを所有物へ含めるテストで確認した。
- AC-3b: memory 注入と他メンバー snapshot 注入の falling proof を追加し、restore 後だけ green へ戻ることを確認した。
- AC-3c: fake Git/Gh port により、隔離 worktree、origin/main 起点 branch、push、PR create、元 worktree 非変更、merge 不実行を確認した。
- AC-3d: pure-addition、append-only、JSON parse、marker 検査、および PR 本文への転記を確認した。
- AC-5a/5b/5c: unit/integration、package 側 shard 名との drift 検出、3種 transient corpus、2種 exclusion 注入を実装した。

## 検証結果

- `bun test tests/unit/t245-amadeus-leader-sync.test.ts tests/integration/t245-amadeus-leader-sync.integration.test.ts`: 35 pass / 0 fail / 124 assertions、exit 0。
- 同 focused test の lcov: `scripts/amadeus-leader-sync.ts` は LF 593 / LH 593、未被覆行 0。
- `bun run test:ci`(iteration 1 最終): 389 test files、5521 assertions、failed files 0、failed assertions 0、wall-clock drift 0、RESULT PASS、exit 0。iteration 2 は指定された focused 検証面を再実測した。
- `bun run typecheck`: exit 0。
- `bunx @biomejs/biome check --max-diagnostics=100`（実装と t245 の3ファイル）: warning 0、exit 0。revision 前の `handleCreate` complexity 39 は責務分割後に解消した。
- `bun tests/gen-coverage-registry.ts --check`: freshness / guards / ratchet 全て OK、exit 0。
- `bun run dist:check`: 6 harness 全て OK、exit 0。
- 禁止面 `GH_TOKEN|gh pr merge|--shell|shell:` の実装内ヒット: 0。
- `bun run promote:self:check`: exit 1。全 harness package check は OK だが、既存の非帰属未追跡ファイル `.codex/pr-review-1303.html` と `.codex/pr-review-1305.html` を ORPHAN として検出した。ユーザー所有物のため削除・変更していない。

## 計画逸脱

- 機能・scope の逸脱はない。
- coverage registry は再生成を要する差分がなく、`--check` で freshness / guards / ratchet 成立を確認したため変更していない。
- `promote:self:check` の非帰属 ORPHAN 以外に未解決の実装課題はない。
- 当初の約450行見積に対し実装は792 physical lines / 593 executable lines となった。内訳は、型・所有物列挙・M1〜M5/M7純関数が約332行、no-shell port・`SyncError` 完全写像が約100行、status/plan と Git 計測が約150行、create の予約・生成・cleanup・dispatch が約210行である。revision で単一 `handleCreate` の重複分岐は除去し、責務ごとの complexity は閾値15以内に収めた。増分は remote collision、全 fault cleanup、実測 seam というレビュー必須契約に由来し、追加機能は含まない。
