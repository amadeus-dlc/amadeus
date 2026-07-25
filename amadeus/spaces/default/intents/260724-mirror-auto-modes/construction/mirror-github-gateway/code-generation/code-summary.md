# Code Summary — mirror-github-gateway

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`logical-components.md`、`performance-design.md`、`security-design.md`、`reliability-design.md`、`scalability-design.md`、`nfr-requirements/*.md`、`unit-of-work.md`、`requirements.md`、`code-generation-plan.md`

## 概要

C5 Mirror GitHub Gateway（設計 G0〜G8）を、明示 repository への安全な remote request を行う process 境界として実装した。state／mode／provenance／landing／retry／warning／audit は所有せず、C0 型のみ import する。fake runner による決定的テストと、実 POSIX process の process-group termination を実測固定した。

## C0 async 化（within-Bolt 修正・裁定 A の明示申告）

**`packages/framework/core/tools/amadeus-mirror-types.ts` の `MirrorGitHubGateway` 6 メソッドを同期 `GatewayOutcome<T>` から `Promise<GatewayOutcome<T>>` へ変更した。** これは **github-gateway の reliability acceptance #4（deadline 後 descendant 残存 0 件・leader-first-exit の ≤5s `termination-failed` settle）を満たすための within-Bolt 修正**であり、**contract-policy Unit 成果（commit `5cf3c0397` の凍結 C0）への越境**である。理由: reliability/performance-design の termination state machine（SIGTERM→1s grace→SIGKILL→group 消滅確認、最大 5s budget、`kill(-pgid,0)` ESRCH 判定、leader-first-exit の遅延 settle）は event 駆動・多段・時限であり、同期メソッドの背後では実現不能。

- 越境の安全性: `MirrorExecutionContext.gateway`(mirror-types.ts:263)経由の消費側 C6 は**未実装（Unit 4）**で、gateway メソッドの**呼出し元は 0 件**（`grep -rn '\.readiness(\|\.createIssue(\|…'` で実測、mirror-types.ts 以外ヒットなし）。よって既存挙動を壊す呼出し元は存在しない。
- 影響確認: contract-policy の C1(`amadeus-mirror-config.ts`)／C2(`amadeus-mirror-policy.ts`)・既存テストは gateway interface を消費しないため、`bun run typecheck` exit 0 で無影響を確認した。
- 正本→配布: mirror-types.ts は正本のため `bun scripts/package.ts` + `bun run promote:self` で 6 harness dist と self-install の C0 コピーを再生成した（`dist:check`／`promote:self:check` green）。

## 実装したモジュールと公開 contract

### `packages/framework/core/tools/amadeus-mirror-capability.ts`（G2 Mutation Capability）
module-private `WeakSet<object>` を唯一の runtime authority とする。C0 phantom brand は compile-time の偽造防止、WeakSet は runtime の偽造防止。
- `createMirrorMutationPermit(binding: MirrorPermitBinding): MirrorMutationPermit` — binding を frozen object 化し WeakSet 登録（C6 専用 factory）。
- `validateMirrorMutationPermit(permit, expected: MirrorPermitExpectation): boolean` — membership ＋ operation ＋ repository canonical ＋ issueNumber（create=null／sync・close=positive 一致）を検査（Gateway 専用 validator）。

### `packages/framework/core/tools/amadeus-mirror-runner.ts`（G4 Process Runner）
- `interface MirrorProcessRunner { run(request: MirrorProcessRequest): Promise<MirrorProcessResult> }`
- `MirrorOperationProfile = "version-auth" | "single" | "paginated"`（deadline 10/30/60s、stdout cap 1/1/64 MiB）。
- `MirrorProcessResult = exited | spawn-error | timed-out | capacity-exceeded`、`MirrorTermination = clean | termination-failed{residualDescendantPossible}`。
- `createMirrorProcessRunner(overrides?: Partial<MirrorRunnerDeps>): MirrorProcessRunner` — POSIX は `spawn(..., {shell:false, detached:true})`、PID=PGID。deps（spawn/kill/now/setTimer/clearTimer/platform）を注入可能。

### `packages/framework/core/tools/amadeus-mirror-gateway.ts`（G1/G3/G5/G6/G7/G8）
- G1: `parseRepositoryIdentity(owner,name)`、`parseRepositoryUrlIdentity(url)`、`parseIssueNumber(value)`（ASCII `-_.`・lowercase canonical・positive safe integer・`api.github.com/repos/{o}/{n}` の 2 segment）。
- G3: `versionArgv/authArgv/createArgv/findArgv/viewArgv/editArgv/closeArgv`（exact immutable argv、`gh api ... repos/{canonical}/issues...`、`-f` 独立引数）。
- G5: `parseHttpEnvelope(stdout, "single"|"array")` → `ok | http-error | malformed`（反復 HTTP block byte 分離、非 2xx で http-error 短絡、page count・body shape）。
- G6: `scanBodies(text)`（parse 前 byte-level body ≤256 KiB scanner）、`parseIssueObject(el, repo)`（DTO 検証・null body→""・repo canonical 一致）、PR 除外＋marker substring filter。
- G7: classification 優先順位＋effect certainty＋固定 redaction template `GitHub unavailable ({classification}; {effect}; exit={n|none}; http={n|none})`。
- G8: `createMirrorGitHubGateway(runner: MirrorProcessRunner): MirrorGitHubGateway`（async）。mutation は spawn 前に `validateMirrorMutationPermit` を通し、偽造・binding 不一致は fail-fast throw。単一 `gh api` command・追加 view 0。

## reliability acceptance #4 の実装＋テスト対応（縮退なし）

| 契約 | 実装（runner.ts） | テスト（t273） |
|---|---|---|
| detached process group（PID=PGID） | `spawn(...,{detached:true})`、`pgid=child.pid` | 実 POSIX test で `sh -c 'sleep 30 & sleep 30'` を group kill |
| SIGTERM→1s grace→SIGKILL | `beginTermination`→`kill(-pgid,SIGTERM)`＋grace timer→`kill(-pgid,SIGKILL)` | 「SIGTERM grace escalates to SIGKILL」で signal 列を実測 |
| group 消滅確認・最大 5s budget | budget timer 5s、`groupAlive`=`kill(-pgid,0)` ESRCH 判定 | 「cleanup budget bounds…」で budget 発火→termination-failed |
| descendant 残存 0 件 | close 時 `groupAlive` ESRCH→clean | 実 POSIX test で `kill(-pgid,0)` が ESRCH 化するまで poll し 0 件確認 |
| leader-first-exit の settle | group 存続時 `termination-failed{residualDescendantPossible:true}`、**再 signal しない** | 「leader-first-exit…」で close 後 signal 増分 0 を実測 |
| reap 後 signal 0 件 | close で grace timer clear、以後 signal なし | 同上＋「deadline… settles clean on close」で SIGKILL 不送信を実測 |

fire-and-forget の偽グリーンは無し。termination テストは fake clock で実際に段階 signal／close／group probe を踏む。

## 使用テスト番号とファイル

| ファイル | size | 内容 |
|---|---|---|
| `tests/unit/t270-amadeus-mirror-repository.test.ts` | small | G1 canonicalization／issue number／remote URL golden |
| `tests/unit/t271-amadeus-mirror-capability.test.ts` | small | G2 membership／binding／偽造拒否／frozen |
| `tests/unit/t272-amadeus-mirror-gateway.test.ts` | small | G8 matrix: exact argv、envelope 1/2/100 page、PR 除外、marker 0/1/2、cross-repo invalid、capacity、oversize body（JSON.parse 0 回）、redaction sentinel、HTTP 429/401/403/404/500、permit 強制、effect |
| `tests/integration/t273-amadeus-mirror-runner.integration.test.ts` | medium | G4 deadline/capacity/termination 決定性（fake clock）＋実 POSIX process-group kill |

property/table の期待値は独立 golden（被検実装の再利用なし）。fake runner は test 側のみ（production 分岐なし、GW-P04）。

## 検証結果（実測 exit code）

| コマンド | exit |
|---|---|
| `bun run typecheck`（source＋tests） | 0 |
| `bun run lint`（Biome） | 0 |
| `bun tests/complexity-gate.ts --check`（Lizard CCN ratchet） | 0（0 new violations／0 regressions） |
| 対象 4 test 直接実行 | 0（78 pass / 0 fail、4 files 照合一致） |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| coverage registry `--check` | 0（新規 test は CLI-spawn registry に非該当、drift なし） |
| `bash tests/run-tests.sh --ci` | FAIL（真の失敗 3 files = SUMMARY「Failed files: 3」、全て環境起因・下記分離） |

### `--ci` の帰属（conductor 独立再実測で確定）

**真の失敗は 3 files のみ**（SUMMARY「Failed files: 3 / Failed assertions: 3」）。coverage gate の `DROP_EXCEEDED`/`MISSING_BASELINE`/`MISSING_CURRENT` 出力や `refs/no-such-ref-for-t229` は、`coverage-project-gate.test.ts` / `t229-coverage-patch-gate-check.test.ts` が gate の fail-closed 挙動を検証する **fixture 出力（期待どおり）** であり実失敗ではない（red herring）。

- `t257-status-registry-migration` / `t258-lifecycle-transaction`(**integration 版**）/ `t259-guard-integration` — **worktree loose-ref（Issue #1455）**。3 件とも `currentGitSha`（t257 / t258-integration:455 / t259:96）が `Cannot/Unable to resolve Git ref refs/heads/team/…engineer-2`。worktree common-dir の loose ref を解決できない共有ヘルパー欠陥で、solo 3 回とも決定的に fail。mirror/orchestrate modules 非 import・git 未変更。#1455 に t258/t259 を追記済み。
  - **訂正**: 初版で t258 を「fanout flaky・solo 21 pass」と記したのは誤り。solo で pass するのは同名の **unit 版**（`tests/unit/t258-lifecycle-transaction.test.ts`、21 pass）で、`--ci` の赤は **integration 版**（`tests/integration/t258-lifecycle-transaction.test.ts:455`、loose-ref 決定的 fail）。reviewer が solo 3/3 fail を実測して指摘（numbers-from-command-output-only 準拠、conductor 再実測で確認）。
- **complexity-gate** — 本 bolt 由来の唯一の実欠陥だったが **是正済み**（`readJsonString` CCN 16→`readEscape` 抽出で ≤15、gate 再実行 exit 0）。

**訂正記録**: 初版で builder は `t265-engine-boundary.integration` の 12 赤を「pre-existing #1418」と帰属したが、conductor 独立検証で **本 intent の contract-policy 契約変更（boolean→三モード）による回帰**と判明（`seedBoundary` が `{"auto-mirror": <boolean>}` を書き、新 C1 三モード parser が boolean を拒否 → `error`）。batch1 reviewer が見逃した潜在回帰。`seedBoundary` を三モード語彙（true→`auto`／false→`prompt`）へ是正し **27 pass / 0 fail** で緑復帰（fixture-propagation-grep）。C0 async 化は無関係（type-only）。

## 逸脱

- **C0 async 化 = 承認済み逸脱**（leader 裁定 A、within-Bolt 修正として本 summary に明示申告）。それ以外の設計逸脱なし。
- 複雑度: 当初 `readJsonString` が CCN 16 で complexity gate NEW_VIOLATION → `readEscape` 抽出で ≤15 化し gate green（縮退でなく分解）。他 parser（parseHttpEnvelope=15、scanBodies=12、parseIssueObject=13、readEscape=11）は threshold 以内。

## 非対象の維持

state codec／write、provenance／landing guard、executor／lifecycle coordinator、status／prompt renderer、既存 `amadeus-mirror.ts`、周辺 refactor は変更していない。C0 型の新規追加・再定義はしていない（async 化は既存メソッドの return 型変更のみ）。
