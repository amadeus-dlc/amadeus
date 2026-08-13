# Build & Test Results — 260813-lifecycle-guard-runtime

対象 tree: conductor ブランチ HEAD `62516c324`(コード内容は bolt head `f6b291e4a` の squash 取込と同一 — `git diff --stat backup/pre-squash-intake HEAD` は record 7 ファイルのみ、コード差分 0 を実測)。

## Build(実測)

| コマンド | 結果 |
|---|---|
| `bun run build` | exit 0(追跡ファイル不変 — `git status --porcelain` 空) |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 |

## Tests(実測)

| 実行 | 結果 | 取得元 |
|---|---|---|
| guard スイート 5 ファイル(`bun test t2771×4 + t511`、conductor ツリー) | **90 pass / 0 fail / 210 expect** | 本ステージで再実行 |
| フルスイート `bash tests/run-tests.sh --ci`(bolt worktree、同一コード内容) | **RESULT: PASS — 990 files / 13341 assertions / 0 fail** | code-generation 段の実測(`/tmp/t2771-fullsuite2.log`) |
| フルスイート(conductor ツリー、コード同一内容の旧 head `82b479c65`) | Failed files **1**(t528 のみ)/ 13358 assertions | `/tmp/conductor-fullsuite.log` |

### t528 の帰属(自変更由来ではない)

conductor ツリーの t528 赤は既存の隔離バグ **#2981** 由来と実測で確定: 純正 `origin/main`(`7f1363938`)クリーン checkout で「素は 6 pass / `CLAUDE_PROJECT_DIR` を active full-autonomy workspace へ向けると 5 pass 1 fail」を再現。機序(`amadeus-orchestrate.ts:6021-6024` の ambient フォールバック + `runsQualityRepair`)は #2981 へ実測付きコメントで追記済み。本 diff は `amadeus-orchestrate.ts` / t528 に非接触。

## ゲート類(bolt worktree head `f6b291e4a` 実測、code-summary.md から転記)

source-only / distribution / coverage-registry `--check` / complexity-gate / no-silent-drop(base 相対): すべて exit 0。Patch/Project Coverage Gate と plugin-conformance-e2e は CI でのみ確定(PR #2986 — pr-convergence 段で実測)。

## 失敗と是正

- ビルド・テストの未解決失敗: 0 件(t528 は上記のとおり既存 #2981 へ帰属、本 intent では修正しない — スコープ膨張回避)。
- 起票: #2988(G9 sensor 真理値表 fail-open — 要件の既知逸脱の正式起票)、#2981 コメント(t528 根本原因)。
