# コード生成計画 — Issue #1663 member readiness 集約

## 対象と前提

- 対象 Issue: [#1663](https://github.com/amadeus-dlc/amadeus/issues/1663)
- 変更種別: `amadeus-bugfix`
- 依存 Bolt: Issue #1336 の safety supervisor readiness 修正を含むコミット `893349bd1`
- 正本: `packages/framework/core/tools/team-up.sh`
- 回帰テスト: `tests/integration/t295-team-up-worktree-parallel.test.ts`
- 要件入力: `amadeus/spaces/default/intents/260729-open-bug-batch/inception/requirements-analysis/requirements.md` の FR-CROSS-1〜3、FR-1663-1〜3

Issue #1336 の safety supervisor 待機は変更せず、`create_run()` 内の worktree 作成完了判定だけを対象とする。

## 診断と根因

GitHub Actions run `30405182938` attempt 1 では、通常 Tests job の t295 だけが `ERROR: worktree creation incomplete: engineer-4` で失敗した。同じ attempt の Coverage Report では同一ケースが成功し、再実行も成功した。失敗ログには checkout 固有エラーがない。

現行 `create_run()` は次の情報を member ごとに保持していない。

1. `git worktree add` が成功し、その member の登録後処理まで終わったこと
2. checkout 子プロセスが成功したこと
3. `path` と `branch` の record 書き込みが完了したこと

代わりに、全 checkout 後の `git worktree list --porcelain` を一度だけ読み、record ファイルの存在と組み合わせて完了集合を再構成する。この一回の全体観測から `engineer-4` が一時的に欠落すると、当該 member の登録・checkout・record が完了していても generic な未完了として失敗する。

本 Bolt で修正する根因は、固定時間や性能不足ではなく、**member ごとの完了証跡を集約せず、一回の全体観測を完了の唯一の権威にしていること**とする。CI 上で Git の全体観測が一時欠落した下位要因まではログから確定できないため、そこは断定しない。

## TDD 計画

### Red

`engineer-4` だけを最初の `git worktree list --porcelain` から除外し、次の観測では復帰させる Git shim を t295 に追加する。

- 旧実装の予測: 登録・checkout・record は実際には完了しているが、`worktree creation incomplete: engineer-4` で非ゼロ終了する
- 証拠: テスト側から real Git を直接呼ぶと `engineer-4` は登録済みで、`path` と `branch` も存在する
- 一意に特定する欠陥: 一回の全体 registry 観測による偽陰性

加えて、record 生成を失敗注入した既存テストを、member 名と停止段階 `record` が明示されることまで強化する。

### Green

最小修正として `create_run()` に member 単位の readiness 証跡を追加する。

1. serial な `git worktree add` の直後、同じ直列区間内で対象 worktree の登録を検証し、`registered` 証跡を保存する
2. checkout 子プロセスは成功後に `checked-out` 証跡を保存する
3. `path` と `branch` を両方保存した後にだけ `ready` 証跡を保存する
4. 親は起動した checkout PID を明示的に待ち、全 member の三段階証跡を集約する
5. 不足時は `member(stage)` の形式で停止段階を stderr に残す

登録は引き続き完全直列とし、固定 sleep、timeout 延長、worktree 作成全体の直列化、汎用 supervisor は追加しない。

## 受け入れ条件

- 制御した初回 registry 欠落でも、実完了済み member を未完了と誤判定しない
- 任意 member の `registration`、`checkout`、`record` のどこで止まったか stderr から判別できる
- 全 member に `registered`、`checked-out`、`ready` の証跡が揃うまで成功しない
- `git worktree add` の最大並列度は 1 のまま
- checkout の最大並列度は `WORKTREE_PARALLELISM=4` のまま
- Issue #1336 の safety supervisor readiness テストを壊さない

## 検証

1. Red の対象テストが修正前コードで意図した理由により失敗する
2. `bun test --timeout 120000 tests/integration/t295-team-up-worktree-parallel.test.ts`
3. Issue #1336 の対象回帰テスト
4. `bun run typecheck`
5. `bun run lint`
6. `bun scripts/package.ts`
7. `bun scripts/package.ts --check`
8. `bun run promote:self:check`
9. `git diff --check`

全体 CI は VM timeout の既知特性を考慮し、失敗時は対象ファイルを timeout 120 秒で単独再実行して実欠陥かを切り分ける。
