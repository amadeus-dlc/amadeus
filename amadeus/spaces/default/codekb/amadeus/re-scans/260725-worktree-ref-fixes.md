# 再スキャン記録 — 260725-worktree-ref-fixes（Issue #1482 / #1481 / #1455）

上流入力（consumes 全数）: 本 intent の reverse-engineering ステージ Step 2（Developer スキャン結果）

- Developer スキャン結果 — 区間サマリ、#1482 の患部実測（4-rung ladder、機序の訂正、hook 一族への波及）、#1481 / #1455 の患部実測（`currentGitSha` 三重複製、worktree の ref レイアウト、blame、テスト実測）を引き継いだ。**file:line・件数はすべて本 Step 3 で observed `11f1ad61f` に対して独立再実測し、一致を確認した**（不一致は下記「上流主張の再実測と訂正」に記録）。

## メタ

| 項目 | 値 |
| --- | --- |
| Date | `2026-07-26` |
| Base commit | `ec624022ff65cc8b3912001f768bd66ec41a0e39`（前 intent `260725-teamup-attach-latency` の observed） |
| Observed commit | `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（= 現 HEAD） |
| ブランチ | `worktree-bugfix-1482-1481-1455`（worktree `.claude/worktrees/bugfix-1482-1481-1455`） |
| 祖先性 / 距離 | `git merge-base --is-ancestor ec624022f 11f1ad61f` exit 0 / `git rev-list --count` = **10** |
| 区間規模 | **143 files changed, 22167 insertions(+), 725 deletions(-)** |
| Scope | `amadeus-bugfix`、Depth Minimal、Brownfield、単一 repo `amadeus` |
| 方式 | 差分リフレッシュ（cid:reverse-engineering:c1）。フルスキャン不実施 |
| 測定 ref | 全 file:line・件数は observed `11f1ad61f` の実ファイル直読、および worktree 上での git plumbing 実測（`rev-parse` / `ls` / `grep -c` / `wc -l` / `find`） |

## Focus

| Issue | 内容 | 本 scan での位置づけ |
| --- | --- | --- |
| [#1482](https://github.com/amadeus-dlc/amadeus/issues/1482) | EnterWorktree セッションの Stop hook が本線 state を読む | 機序を訂正。欠陥は Stop hook 固有でなく hook 一族12箇所が共有 |
| [#1481](https://github.com/amadeus-dlc/amadeus/issues/1481) | worktree で t257 / t258 / t259 が ref 解決失敗で常赤 | `currentGitSha` 三重複製の共通欠陥として確定 |
| [#1455](https://github.com/amadeus-dlc/amadeus/issues/1455) | t257 `currentGitSha` の common-dir loose ref 未解決 | #1481 と同根（同一 helper の複製1） |

## 区間サマリ

`git log --reverse ec624022f..11f1ad61f` 全10件:

| コミット | 内容 |
| --- | --- |
| `dcadcce17` | 前 intent（#1449）inception checkpoint |
| `294df1281` | fix(team-up): watcher 検証の適用可否ガード |
| `22829d0b8` / `a0febedd2` | 前 intent の construction 記録・phase check |
| `872919958` | Merge [PR #1477](https://github.com/amadeus-dlc/amadeus/pull/1477) |
| `c4c9531ee` | 前 intent の subagent audit shard |
| `6248fdac4` | feat(team-up): 初期プロンプトの agmsg actas 移行（[PR #1484](https://github.com/amadeus-dlc/amadeus/pull/1484)） |
| `f54ce2b5e` | chore(record): 工程記録の同期（[PR #1486](https://github.com/amadeus-dlc/amadeus/pull/1486)） |
| `8eeab33e5` | chore(record): R-3 配送計測と NFR-3 resume、スコープ縮小の訂正（[PR #1488](https://github.com/amadeus-dlc/amadeus/pull/1488)） |
| `11f1ad61f` | perf(team-up): メンバー worktree の checkout を上限付き並列化（[PR #1487](https://github.com/amadeus-dlc/amadeus/pull/1487)） |

実装面は **`team-up.sh` 系1系統のみ**（正本 + harness 表層4 + dist 6、tests 3件: `t-team-up-watcher-arming` 修正、t294 / t295 新規）。残り約22,000行は record / audit。ビルド／テスト構成・依存（`package.json` / `bun.lock` / `tsconfig` / `biome` / `scripts/` / `run-tests.sh` / `.github/`）の diff はいずれも空。

### 患部との交差なし（決定的確認）

```
git diff --name-only ec624022f 11f1ad61f -- \
  packages/framework/core/tools/amadeus-lib.ts \
  packages/framework/core/hooks/amadeus-stop.ts \
  tests/integration/t257-status-registry-migration.test.ts \
  tests/integration/t258-lifecycle-transaction.test.ts \
  tests/integration/t259-guard-integration.test.ts
```

→ **出力は空**。3 Issue はいずれも本区間の退行ではなく、区間より前から存在する欠陥である。

## 患部実測の要約

### #1482 — hook project-dir 解決の 4-rung ladder

`packages/framework/core/tools/amadeus-lib.ts`:

| rung | 行 | verbatim |
| --- | --- | --- |
| 1 | `:249` | `  if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;` |
| 2 | `:258` / `:259` | `  const markerDir = findWorkspaceMarkerAncestor(process.cwd());` / `  if (markerDir) return markerDir;` |
| 3 | `:263-265` | `stripHarnessLeaf(scriptDir, "hooks")` |
| 4 | `:268-273` | cwd 直下の既知 harness dir |

補助: `:227` `function hasWorkspaceMarker(dir: string): boolean {`、`:235` `function findWorkspaceMarkerAncestor(startDir: string): string | null {`、エントリ `:247` `export function resolveProjectDirFromHook(importMetaUrl: string): string {`。

**機序（Issue 記載の訂正）**: Issue 推定「env 未設定 → rung2 が本線解決」は誤り。`.claude/settings.json:154` verbatim `            "command": "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-stop.ts"` の `$CLAUDE_PROJECT_DIR` 展開が成立してフックが起動している以上 env は設定済み。実機序は **EnterWorktree が cwd だけを切り替え env は本線に固定 → rung1 が本線を無条件採用し rung2 に到達しない**。rung2 自体は健全で、cwd が worktree なら worktree を返す。

**裁定点**: `tests/unit/t202-hook-project-dir-worktree-marker.test.ts:105` verbatim `  test("2: CLAUDE_PROJECT_DIR env still outranks the marker rung", () => {`（`:113` で `expect(resolved).toBe("/from/env")`）がこの順序を**意図的に固定**している。一方同ファイル `:1-3` が宣言する #641 の設計意図は「worktree を返すこと」であり、両者は矛盾する。rung 順序の変更は t202 の契約変更を伴うため要件段での明示裁定を要する。

**波及**（`grep -rn 'resolveProjectDirFromHook' packages/ --include='*.ts'` 実測、import 行を除く実呼び出し **12箇所**）: core hooks 11 ファイル（`amadeus-audit-logger.ts:23` / `amadeus-log-subagent.ts:22` / `amadeus-mint-presence.ts:72` / `amadeus-runtime-compile.ts:45` / `amadeus-sensor-fire.ts:40` / `amadeus-session-end.ts:20` / `amadeus-session-start.ts:46` / `amadeus-statusline.ts:32` / `amadeus-stop.ts:167` / `amadeus-sync-statusline.ts:25` / `amadeus-validate-state.ts:24`）+ `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts:64`。**Stop hook 固有ではなく hook 一族全体の症状**。

**engine 経路が救われている理由**: `resolveProjectDir`（`:170`）は `:172` verbatim `  if (explicitDir) return explicitDir;` により `--project-dir` 明示引数が第1順位。hook 側にこの上位 rung が無い（非対称）。

**配布面**: `amadeus-lib.ts` / `amadeus-stop.ts` とも 11 コピー（正本 + harness 表層4 + dist 6）。

### #1481 / #1455 — `currentGitSha` の三重複製

`grep -n 'function currentGitSha'` 実測:

| ファイル | 定義 | throw 行 verbatim |
| --- | --- | --- |
| `tests/integration/t257-status-registry-migration.test.ts` | `:193` | `:214` ``  if (!packed) throw new Error(`cannot resolve Git ref ${ref}`);`` |
| `tests/integration/t258-lifecycle-transaction.test.ts` | `:434` | `:455` ``  if (!packed) throw new Error(`Cannot resolve Git ref ${ref}`);`` |
| `tests/integration/t259-guard-integration.test.ts` | `:77`（`repositoryRoot` 引数版） | `:96` ``  if (!line) throw new Error(`Unable to resolve Git ref ${ref}`);`` |

**共通欠陥**: loose ref 探索が worktree gitDir 配下のみ（t257 `:205-206`）、commondir 解決後（`:207-210`）は `packed-refs` しか読まない（`:211`）→ worktree のブランチ ref は common dir の loose ref のため必ず throw。

**worktree 実測**（`.claude/worktrees/bugfix-1482-1481-1455`）:

| 観測 | 値 |
| --- | --- |
| `git rev-parse --git-dir` | `<main>/.git/worktrees/bugfix-1482-1481-1455` |
| `git rev-parse --git-common-dir` | `<main>/.git` |
| HEAD ref | `refs/heads/worktree-bugfix-1482-1481-1455` |
| worktree gitDir の loose ref | **不在**（`ls` が ENOENT） |
| common dir の loose ref | **実在**、41 バイト |
| `packed-refs` 総行数 | 733（`wc -l`） |
| `packed-refs` の当該 ref エントリ | **0 件**（`grep -c " refs/heads/worktree-bugfix-1482-1481-1455$"`） |

**導入と原因の所在**: 3ファイルとも `2e157d7fe`（2026-07-23、`archived intent statusと誤resume防止を導入 (#1424)`）。helper 全24行が単一コミット帰属・後続修正なし。原因の所在は **#1424 の実装判断**（git plumbing でなく FS 直読を選び、かつ3複製した）。設計成果物が FS 直読を指示した形跡はない。

**既習の正しい様式**: `amadeus-lib.ts:4131` `export function resolveMainCheckout(gitCwd?: string): MainCheckout | null {`（`:4132` `rev-parse --show-toplevel`、`:4135` `rev-parse --git-common-dir`）。同型前例に `codex/tools/amadeus-codex-hooks-migration.ts:590`。

**同根棚卸し**: git 内部レイアウトの FS 直読はこの3件のみ。他はすべて git サブプロセス経由で worktree 安全 — 修正対象は閉じている。

**現症状**（worktree、パイプなし exit 捕捉）: t257 exit 1（10 pass / 1 fail）、t258 exit 1（25 / 1）、t259 exit 1（9 / 1）。本 Step 3 で t259 を再実行して追認（exit 1、`9 pass` / `1 fail`、`error: Unable to resolve Git ref refs/heads/worktree-bugfix-1482-1481-1455`）。各スイートで赤いのは helper を通る provenance 記録テスト1件のみ。

**テスト番号の生態**（`find tests -name "tNNN-*" -type f`）: **t257 = 6 件、t258 = 8 件、t259 = 4 件**。引用はフルパス必須。

## 上流主張の再実測と訂正

| 上流（Developer スキャン）の記載 | 本 Step 3 の再実測 | 扱い |
| --- | --- | --- |
| rung2 = `:258-259` | `:258` が `markerDir` 代入、`:259` が `if (markerDir) return markerDir;` — 範囲は正しい | 追認 |
| 「packed-refs 0件」 | ファイルは **733 行実在**、当該 ref に一致するエントリが **0 件** | **精密化**（両数値を記録） |
| 「core hooks 11箇所 + kiro-ide adapter」 | 実呼び出しは core hooks 11 + kiro-ide 1 = **12箇所**。grep 行数 22 は import 行を含む数 | 追認（数え方を明記） |
| `t257-*` 4 / `t258-*` 3 / `t259-*` 3 | `find tests -name ...` で **6 / 8 / 4** | **訂正**（`find` による全数） |
| t259 throw が `packed` 変数 | t259 のみ変数名は `line`（`:96`） | 追認（別名を明記） |

## センサー不適用と代替検証

RE ステージが宣言する3センサー（`required-sections` / `upstream-coverage` / `answer-evidence`）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**であるため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch）。

**センサー成功として扱わない。** 代替として以下を実施した:

1. 更新した9成果物すべてに `grep -c '^## '` を実行し、H2 見出しが 2 以上であることを機械確認（結果は本 scan の最終報告に転記）
2. 上流入力（Developer スキャン結果）の主張を本文で直接参照し、file:line・件数はすべて observed `11f1ad61f` に対して独立再実測（不一致は上表に訂正として記録）

## Delivery boundary

本 scan の成果物は codekb の差分更新のみ。患部コードへの修正は行わない。3 Issue の修正方針 — #1482 の rung 順序裁定（t202 test 2 の契約変更を伴う）、#1481 / #1455 の helper 共有化と git plumbing 化 — は後続の requirements-analysis 以降で確定する。
