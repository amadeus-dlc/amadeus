# コード要約 — Issue #1663 member readiness 集約

## 結果

`create_run()` の worktree 作成完了判定を、一回の `git worktree list --porcelain` 全体観測から、member ごとの永続的な三段階証跡へ変更した。

| 段階 | 証跡 | 保存タイミング |
|---|---|---|
| Git 登録 | `registered` | serial な `git worktree add` 後、対象 worktree の個別検証と同じ直列区間内 |
| checkout | `checked-out` | 当該 member の checkout 成功直後 |
| record 完了 | `ready` | `path` と `branch` の両方を書き終えた後 |

親プロセスは起動した checkout PID を明示的に待ち、全 member の証跡を集約する。不足時は `engineer-2(checkout)` や `engineer-3(record)` のように、member と停止段階を stderr に残す。

## 根因と Red 証拠

元 CI run `30405182938` attempt 1 の通常 Tests job では、t295 が `ERROR: worktree creation incomplete: engineer-4` で失敗した。同じ attempt の Coverage Report と再実行では成功し、失敗ログに checkout 固有エラーはなかった。

旧実装は member ごとの成功結果を保持せず、全 checkout 後の `git worktree list --porcelain` を一度だけ読み、record ファイルの存在と合わせて完了集合を再構成していた。このため、一回の全体観測から任意 member が一時的に欠落すると、実際の登録・checkout・record が完了していても未完了として失敗する。

t295 に、最初の全体 registry 観測から `engineer-4` だけを除外し、次回観測では復帰させる制御 shim を追加した。修正前の実測は次のとおり。

- 新規回帰: `ERROR: worktree creation incomplete: engineer-4`、exit 1
- real Git の直接観測: `engineer-4` は登録済み
- record の直接観測: `path` と `branch` は存在
- record 失敗注入: generic な `engineer-3` だけで停止段階は不明
- 対象ファイル全体: 11 pass / 2 fail

したがって Red は timeout や負荷の再現ではなく、一回の全体観測が作る偽陰性を一意に示す。

CI 上で Git の全体観測が一時欠落した下位要因は当時のログだけでは確定できない。本 Bolt は断定可能なコード上の根因である「member ごとの完了証跡を集約せず、一回の全体観測を唯一の権威にしたこと」を修正した。

## 実装

### serial 登録

- `git worktree add --no-checkout` の直列性を維持
- add 成功後に `git -C <member-worktree> rev-parse --show-toplevel` で対象 member を個別検証
- symlink 差を吸収するため、期待パスと Git のパスを `pwd -P` で物理パスへ正規化
- 次の add へ進む前に `registered` を保存

### parallel checkout

- checkout の並列度 `WORKTREE_PARALLELISM=4` を維持
- 引数なし `wait` をやめ、起動した PID をバッチごとに明示待機
- 子プロセスが `checked-out`、`path`、`branch`、最後に `ready` を保存
- record 書き込み失敗を `ERROR: worktree record failed for <member>: <path>` として明示

### 完了集約

- 全体 `git worktree list` の一回観測を削除
- 全 member の `registered`、`checked-out`、`path`、`branch`、`ready` を検査
- 不足している最初の段階を `registration`、`checkout`、`record` に分類
- 全 member の証跡が揃わなければ成功しない

固定 sleep、timeout 延長、worktree 登録の並列化、worktree 作成全体の直列化、汎用 supervisor は追加していない。

## Issue #1336 との統合

本 Bolt は Issue #1336 のコミット `893349bd1` を親にして実装した。safety supervisor の `safety-wait.ready`、起動、停止、再開処理には変更を加えていない。worktree record に追加した証跡名とも衝突しない。

## 変更ファイル

- 正本: `packages/framework/core/tools/team-up.sh`
- 回帰テスト: `tests/integration/t295-team-up-worktree-parallel.test.ts`
- self-install: `.claude`、`.codex`、`.cursor`、`.kimi-code`、`.opencode` の `tools/team-up.sh`
- dist: Claude、Codex、Cursor、Kimi、Kiro、Kiro IDE、OpenCode の `tools/team-up.sh`
- 日本語成果物: 本 plan / summary

正本、self-install 5 面、dist 7 面の計 13 コピーは SHA-256 が一致している。

## 検証結果

| 検証 | 結果 |
|---|---|
| `bun test --timeout 120000 tests/integration/t295-team-up-worktree-parallel.test.ts` | 13 pass / 0 fail |
| `bun test --timeout 120000 tests/unit/t-team-up-codex-safety-wait.test.ts` | 20 pass / 0 fail |
| 全 CI 内の `tests/integration/t-team-up-codex-resume.serial.test.ts` | 56 pass / 0 fail |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0。既知の cognitive-complexity 警告のみ |
| `bun scripts/package.ts --check` | 7 harness 全面 OK |
| `bun run promote:self:check` | 5 self-install 全面 OK |
| `bash -n packages/framework/core/tools/team-up.sh` | exit 0 |
| `git diff --check` | exit 0 |
| `bun run test:ci` | 652 files / 8,998 assertions / 0 fail、RESULT: PASS |

## 要件対応

| 要件 | 対応 |
|---|---|
| FR-CROSS-1 | Issue #1663 専用 Bolt、plan / summary、Red / Green / 検証を記録 |
| FR-CROSS-2 | 初回 registry 欠落の制御注入で修正前 Red を確立。timeout 延長だけでは完了としていない |
| FR-CROSS-3 | 正本だけを編集し、package / promote-self で配布面を再生成 |
| FR-1663-1 | registration / checkout / record を member ごとに追跡し、停止段階を stderr に表示 |
| FR-1663-2 | add の直列性を維持し、登録後処理完了前に次 member へ進まない。一回観測を廃止 |
| FR-1663-3 | #1336 の修正上に構築し、safety supervisor readiness の unit / integration を回帰確認 |

## 逸脱

なし。Issue #1663 の member readiness 集約に限定し、team-up 全体の再設計は行っていない。
