# #1336 Code Generation結果

## 結果

[Issue #1336](https://github.com/amadeus-dlc/amadeus/issues/1336)について、Codex safety-wait supervisorの起動成功条件を、一回限りのPID生存確認からrun・role・PIDに結び付いた明示的ready証拠へ変更した。launcherは各roleについてready、ready前exit、有限timeoutを区別し、全roleのreadyを再確認するまで成功を返さない。

固定`sleep 0.05`の延長は行っていない。50ms間隔は期限内の状態ポーリングにだけ使い、成功条件はexact ready証拠である。ready証拠はmember record配下へ一時ファイルからrenameして原子的に発行し、stale証拠、別run、別role、別PID、不完全payloadを拒否する。

## 根本原因

`packages/framework/core/tools/team-up.sh`はsupervisor起動後に50ms待ち、`kill -0`と`ps`のcommand一致を一度確認しただけでroleを起動済みとしていた。この確認はprocessの瞬間的な生存しか証明せず、引数検証、active run確認、Herdr adapter生成、roleの一意解決が完了したことを証明しない。

そのため、processが生存確認直後に初期化失敗してもlauncherは成功を返せた。また、既に確認したroleを最終的に再確認せず、失敗時のrollbackもready証拠を扱っていなかった。

## 実装内容と要件追跡

- FR-1336-1: supervisorは引数、production activation、exact active run、初回の一意なrole解決を通過した後だけ、`schemaVersion`、run、role、PIDを持つready証拠を原子的に発行する。
- FR-1336-2: launcherはroleごとのexact ready、ready前exit、設定可能な有限timeoutをポーリングし、失敗roleと`early-exit`または`timeout`をstderrへ出す。全roleのprocess ownershipとready証拠を成功直前に再確認する。
- FR-1336-3: early exitまたはtimeout時は今回起動した全supervisorを停止・reapし、PID、lock、ready、一時readyファイルを除去する。他runのprocessをsignalしない既存のfail-closed境界は維持した。
- NFR-1/NFR-2/NFR-4〜6: BashとBunの既存境界へ最小追加し、固定待機時間の単純延長を避け、macOSの決定的fixtureで同一ケースのRed→Greenを証明した。

## Red→Green証拠

修正前Redでは、fake `ps`が対象roleの最初のliveness probeを記録するまでfake supervisorを生存させ、その後の再確認でbarrierを解放して`exit 9`させた。旧launcherは一回目のprobe後に対象roleを再確認せず、誤ってexit 0を返した。

- Red: `bun test --timeout 120000 tests/integration/t-team-up-codex-resume.serial.test.ts --test-name-pattern 'a safety-wait exit after the liveness probe'`
  - 期待値は非0だったが、旧実装の実測はexit 0で1 fail。
  - `e3.probed`が存在し、旧launcherのliveness probe通過後に失敗を起こしたことを確認した。
- Red: `bun test tests/unit/t-team-up-codex-safety-wait.test.ts --test-name-pattern 'ready evidence'`
  - ready evidence APIが未実装のためnamed export不足で失敗した。
- Green: 同じbarrier fixtureで、launcherが`early-exit while waiting for ready for e3`を検出し、全7 roleのPID、lock、ready資産が残らないことを確認した。
- Green: readyを通知せず生存し続けるe3を1秒timeoutにし、role付きtimeout診断と全7 roleのrollback cleanupを確認した。
- Green: stale ready markerを起動前に除去し、run-001・e3・実PIDの新しい証拠だけが残ることを確認した。
- Green: fresh、resume、killで全7 roleのexact readyと重複起動なし、kill後のPID・lock・ready除去を確認した。

## 検証結果

- 対象baseline: 71 tests / 620 expects / 0 fail。
- 最終対象suite: `bun test --timeout 120000 tests/unit/t-team-up-codex-safety-wait.test.ts tests/integration/t-team-up-codex-resume.serial.test.ts`
  - 76 tests / 707 expects / 0 fail。
- `bun run typecheck`: 成功。
- `bun run lint`: 成功。既存baselineと同じ293 warnings / 21 infosで、新規errorなし。
- `bash -n packages/framework/core/tools/team-up.sh`: 成功。
- 対象3 TypeScriptファイルのBiome check: 成功。
- `git diff --check`: 成功。
- `bun scripts/package.ts --check`: 7 harnessすべて成功。
- `bun run promote:self:check`: 5 self-install面すべて成功。
- `bun run test:ci`: 変更対象のteam-up統合テストは56 tests / 619 expects / 0 fail。全体は652ファイル中1ファイル、8997 assertions中1 assertion失敗で非0だった。
- `bun tests/run-tests.ts --all --verbose`: 全体737ファイル中1ファイル、9237 assertions中2 assertions失敗で非0だった。失敗は変更範囲外の`tests/e2e/t341-plugin-conformance-journey.serial.test.ts`で、plugin drop後の`tools/data/stage-graph.json`ハッシュ復元不一致と、先行失敗による計測値0だった。単独120秒timeoutでも同じ2 assertionsが再現したため、CPU timeoutではなく既存の別障害として切り分けた。

## 生成物と変更範囲

- 正本: `packages/framework/core/tools/team-up-codex-safety-wait.ts`、`packages/framework/core/tools/team-up.sh`
- テスト: `tests/unit/t-team-up-codex-safety-wait.test.ts`、`tests/integration/t-team-up-codex-resume.serial.test.ts`
- 配布生成物: `dist`の7 harness面へ正本2ファイルを同期した。
- self-install生成物: `.claude`、`.codex`、`.cursor`、`.opencode`、`.kimi-code`の5面へ正本2ファイルを同期した。
- 記録: 本`code-summary.md`と`code-generation-plan.md`

## 未実行・制約

- 実Herdr・実Codexを用いたlive E2Eは、CI fixtureによる決定的検証を対象とするBoltであり、外部process substrateを要求するため実行していない。
- Linux実機では実行していない。実装は既存のBash/Bun移植境界に限定し、macOSでshell構文、型、対象統合、全配布面のドリフトを検証した。
- 本Boltではpushおよび[Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)作成を行っていない。
