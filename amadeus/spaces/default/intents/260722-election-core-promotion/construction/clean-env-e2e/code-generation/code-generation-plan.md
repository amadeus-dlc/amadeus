# Code Generation Plan — U4 clean-env-e2e

## スコープと前提

- 本計画はPART 1のみであり、実装コード・テスト・生成物には触れない。
- U4はテスト専用Unitである。本番コード、配布正本、manifest/emitter、docs、release資産を変更しない。
- user-storiesステージはSKIPのため、各Stepは `requirements.md` FR-6a〜6c、`unit-of-work.md` U4、current unitのBR/NFRへ直接トレースする。ストーリーは捏造しない。
- 被検体は直前U2/U3が生成したself-install配布コピーのみとし、`packages/framework/core/` やrepo内canonical toolを直接実行・importしない。
- nfr-design performance-design Review iteration 2の申し送りについて、consumes外の `logical-components.md` は読まず、current consumesのFD/NFRに記載された `beforeEach` 再生成／`afterEach` 全削除を正とする。`beforeAll` は導入しない。
- 固定5ケースは happy path、herdr不在、agmsg不在、非対応OS、doctor advisoryで閉じる。Codex、instance、resume等のShouldバリエーションは追加しない。
- API、repository、DB/migration、UI、IaC、アプリケーション設定の変更は存在しない。

## テストファイルと構成

- 新規候補: `tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts`（実装開始時に番号衝突を再確認）
- テスト専用型:
  - `CleanEnv = { root; home; binDir; workspace; harnessDir; agmsgRoot; env; logs }`
  - `FakeCall = { tool: "herdr" | "agmsg" | "uname"; argv: string[] }`
- ライフサイクル:
  - `beforeEach`: temp root、HOME、隔離bin、workspace、self-installコピー、fake群を毎ケース新規生成
  - `afterEach`: 起動プロセスを停止してからtemp rootを `rmSync(..., { recursive: true, force: true })`
- 子プロセス環境は `process.env` をspread・素通ししない。必要キーだけを列挙した `Record<string,string>` を構築する。

## 固定5ケース

| ケース | 配布コピーからの実行 | 主なassert |
|---|---|---|
| happy path | `team-up.sh` → `team-msg.sh send` → election `open` / `vote` / `tally` | fake herdr workspace/pane/send呼出し列、fake agmsg引数、選挙registry/storeとtally成立 |
| herdr不在 | fake herdrを隔離PATHから除外して `team-up.sh` | exit 1、stderrにherdr・入手先・guide、run/session副作用0 |
| agmsg不在 | `AGMSG_ROOT`を存在しないtemp配下へ向けて `team-up.sh` | exit 1、stderrにagmsg・入手先・guide、run/session副作用0 |
| 非対応OS | PATH先頭のfake `uname`がPlan9を返して `team-up.sh` | exit 1、stderrにunsupported/Plan9、herdr/agmsg呼出し0 |
| doctor advisory | temp配布コピーのdoctorをfound/missing構成で実行 | Team Mode prerequisite行、found path/missing guidance、advisory前後でexit semantics不変 |

## 実装計画

- [x] **Step 1: 共有worktreeと公開契約のベースラインを固定する。** `git status --short` でU2/U3・監査ログ・`.agmsg-ballots` 等の既存変更を記録し、変更禁止面として保護する。dist/self-installに `team-up.sh`、`team-msg.sh`、`amadeus-election.ts`、`amadeus-utility.ts` が存在すること、launcherの `HERDR` / `AGMSG_ROOT`、messageの `AGMSG_SEND`、doctor seam、election CLIの公開引数を現物再確認する。既存関連E2E/launcherテストを変更前に実行し件数・wall-clockを記録する。**トレース:** FR-6a〜6c、BR-1〜6、Performance、Security、Reliability。

- [x] **Step 2: serial E2Eファイルと固定5ケースの骨格を作る。** 未使用番号を再確認して `tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts` を新設し、`describe` 内に固定5ケースだけを定義する。`.serial.cli.test.ts` 命名でrunnerの直列bandとCLI mechanismを明示し、Codex/instance/resume等の追加journeyを作らない。**トレース:** FR-6a〜6c、BR-4、BR-5、Performance、Scalability。

- [x] **Step 3: CleanEnvのケース単位ライフサイクルを実装する。** `beforeEach` で毎回 `mkdtemp` 配下へhome/bin/workspace/harness/agmsg/logsを生成し、`afterEach` で子プロセス停止後に全削除する。`beforeAll`、fixture共有、ケース間状態持越しを禁止する。各ケース開始時に全パスが同じtemp root配下であり、`home !== homedir()`、workspaceがrepo root外であることをassertする。**トレース:** FR-6a、BR-2、BR-5、Performance、Security、Reliability。

- [x] **Step 4: self-install配布コピーだけをtemp workspaceへ展開する。** 生成済み配布物 `dist/claude/.claude` をtemp workspaceの `.claude` へコピーし、必要なworkspace-root補助面も生成器の実配置どおりコピーする。全被検パスがtemp配布コピー配下であることを共通assertし、canonical `packages/framework/core/`、repo内 `.claude/tools`、`scripts/` を実行・importするコードを禁止する。**トレース:** FR-6a、BR-1、BR-2、Security、Reliability。

- [x] **Step 5: process.env非継承の明示環境を構築する。** 子プロセス用envを `HOME`、`PATH`、`SHELL`、`HERDR`、`AGMSG_ROOT`、`AGMSG_*`、`TEAM_*`、`AMADEUS_*`、テストログpath等の必要キーだけから新規構築する。hostのHOME/PATH/credentials/configをspreadしない。Bun/bash/git/mise等、被検スクリプトが必要とする実行ファイルは絶対pathまたは隔離bin内の明示shim/symlinkで許可し、意図しないhost herdr/agmsgへ到達できないことをassertする。**トレース:** FR-6a〜6b、BR-1〜2、Security。

- [x] **Step 6: fake uname/herdr/agmsg seamを実装する。** temp binへ0755のfake `uname` と `herdr`、temp `AGMSG_ROOT/scripts` へ `join.sh` / `send.sh` / `history.sh` 等、公開契約上必要な最小shimを作る。fake herdrは既存0.7.1 seamと同じworkspace/pane/agent verbだけを受理し、未知verbはexit 2、全argvを単一ログ形式へ記録する。fake agmsgはteam/from/to/bodyを記録してexit 0とし、本番コードにテスト分岐を追加しない。**トレース:** FR-6b、BR-2〜3、Reliability、Security。

- [x] **Step 7: happy pathを配布コピーだけで完走させる。** temp workspaceで配布 `team-up.sh` をClaude単一チーム・既定サイズで起動し、fake herdrのworkspace create／pane／agent列を確認する。続いて配布 `team-msg.sh send` でfake agmsgへの配送を確認し、配布 `amadeus-election.ts` の `open` → ballot `vote` → `tally` を実行する。registry-backed選挙pathをresolver経由で特定し、tally結果とstore/timelineをassertする。canonical直接実行や選挙機能の再実装は行わない。**トレース:** FR-6a〜6b、BR-1〜4、Performance、Reliability。

- [x] **Step 8: herdr不在・agmsg不在のfail-fast 2ケースを実装する。** herdrケースは隔離PATHからfake herdrだけを除外し、agmsgケースは `AGMSG_ROOT` を存在しないtemp pathへ向ける。それぞれ配布 `team-up.sh` のexit 1、stderrの対象名・公式入手先・guide文言、fake log未生成、run/session/worktree副作用0をassertする。**トレース:** FR-6c、BR-1〜3、BR-6、Security、Reliability。

- [x] **Step 9: 非対応OSケースをfake unameで実装する。** PATH先頭のfake unameをPlan9応答へ切り替え、配布 `team-up.sh` がexit 1となりunsupported/Plan9/guideをstderrへ出すことを確認する。検査順序の証拠としてherdr/agmsgログ0とrun副作用0をassertする。**トレース:** FR-6c、BR-2〜3、BR-6、Security、Reliability。

- [x] **Step 10: doctor advisoryケースとTS分岐到達を実装する。** temp配布コピーの `amadeus-utility.ts` を動的importし、found/missingを制御する注入probeまたはtemp環境の公開doctor seamを用いてTeam Mode prerequisite出力を得る。foundとmissingで既存doctor exit code・passed/failed集計が同一であること、missing guidanceとfound pathをassertする。spawnされたcanonicalでない配布コピーではなく、temp配布TSをin-process実行してLCOV `DA` 到達可能にする。**トレース:** FR-6c、BR-1〜2、BR-6、Security、Reliability。

- [x] **Step 11: error-path reachabilityをcoverageとstderrで二重確認する。** `bun test ... --coverage --coverage-reporter=lcov` でserial E2Eを単独実行し、temp配布から正規化されたdoctor prerequisite分岐のLCOV `DA` hitを機械確認する。bashのherdr/agmsg/OS分岐はそれぞれ固有stderrとfake未呼出しで弁別し、同一exit 1への偽greenを排除する。coverage source normalizationがtemp pathをcanonical sourceへ折り畳む既存設定を使い、手編集metadataを作らない。**トレース:** FR-6c、BR-6、NFR-1、Security、Reliability。

- [x] **Step 12: test configurationとComprehensive量を確認する。** `tests/run-tests.ts` のauto-discoveryと `.serial.test.ts` 判定を利用し、vitest/jest configを新設しない。U4はFDにより全ケースE2Eへ割付済みのためunit/integrationを捏造せず、固定5 journey内のassert群でhappy/error/advisoryを網羅する。coverage registry/ratchetに新規ファイル登録が必要な場合のみ生成コマンドで同期し、mechanism honesty guardを通す。**トレース:** FR-6a〜6c、BR-4〜6、Comprehensive test strategy、Performance。

- [x] **Step 13: 段階検証と最終差分監査を行う。** 新規serial E2E単独、関連U2/U3回帰、coverage到達、`bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bun tests/gen-coverage-registry.ts --check`、`bash tests/run-tests.sh --ci`、`git diff --check` を実行する。wall-clock、5ケース件数、LCOV/stderr証拠、skip/advisoryをsummaryへ記録する。差分がtests/e2e、必要なcoverage metadata、plan/summaryだけであり、本番コード、canonical配布正本、U2/U3、U5/docs、release、監査ログ、`.agmsg-ballots` を変更・巻き戻していないことを確認する。**トレース:** FR-6a〜6c、BR-1〜6、全NFR。

## Comprehensive Test Strategy

| 層 | U4での扱い |
|---|---|
| Unit | 新規なし。CleanEnv/fakeを共有production abstractionへ昇格させず、E2E内のtest helperに限定 |
| Integration | 新規なし。既存U2/U3 integrationを回帰実行し、公開seamの単体契約を再利用 |
| E2E | serial 1ファイル、固定5ケース。happy path 1＋error 3＋doctor 1 |
| Coverage | doctor TS分岐はtemp配布コピーのin-process実行でLCOV DA、bash分岐は固有stderr |
| Performance | beforeEach生成／afterEach削除、固定5ケース、wall-clock記録 |
| Security | temp prefix、明示env、host HOME/PATH/credentials非継承、canonical直接実行禁止 |
| Configuration | Bun auto-discovery、serial band、既存coverage normalization/registryを再利用 |

## 予定変更面

- 新規: `tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts`
- 必要時のみ: coverage registry/ratchet、mechanism honesty list
- 成果物: 本plan、PART 2完了時の `code-summary.md`
- 非対象: `packages/framework/`、`scripts/`、`dist/`、self-install生成物、docs、release、アプリケーションコード

## 完了条件

- FR-6a〜6c、BR-1〜6、performance/security/reliability/scalabilityの各契約がStep 1〜13へ全数トレースされる。
- 固定5ケースが全て配布コピーだけを使い、temp HOME・隔離PATH・明示env・fake seamで決定的にgreenとなる。
- `beforeEach` 再生成と `afterEach` 全削除が対になり、`beforeAll` とprocess.env素通しが存在しない。
- doctor TS分岐のLCOV DAとbash 3分岐の固有stderrが実測される。
- 本番コード変更ゼロで、U2/U3の公開契約を利用し、共有worktreeの他者変更を保護している。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T11:15:27Z
- **Iteration:** 1
- **Scope decision:** none

FR-6a〜6cとBR-1〜6を固定5ケースで満たし、beforeEach/afterEach隔離、配布コピー限定実行、fake境界、LCOV DA・固有stderr、本番変更ゼロの証拠が整合している。

### Findings

- None
