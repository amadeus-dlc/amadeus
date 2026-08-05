# Amadeus API ドキュメント

## TLA+ authoring関連契約（260804-tla-authoring、現在、observed `7172aea8d`）

### 現存する契約

- `model-map.json` schema v2: sorted nonempty models、model/cfg identity、canonical implementation entries、optional auxiliaries、`namedInvariants`、`traceStateVariables`。rebase後は既存2 rowのimplementation SHA pinのみ更新され、schema・model数・vocabularyは不変。
- `ModelCheckReceipt`: `FormalElection`はfrozen receipt、その他はverified-source receipt。PR #2176でselected model/config、registered identity、aux transcriptとの束縛が追加された。
- `AdvisoryIdentity`: plugin / code / checkpoint / target / specIdentity / intentRun / advisoryInstance。
- `run-model-check.ts` と `run-model-check-ci.ts run|verify`: 登録モデルを局所または全件実行。outcomeはexit 0=`NOT_DETECTED`、1=`DETECTED`、2=`HARNESS_ERROR`。
- `amadeus-sensor-model-completeness.ts check|updateModelMap [--impl-only]`: 既存map rowのdrift検査・再発行・意味不変宣言。

### 不在の契約

- 要求・FR・cid・裁定・design identityから適用判定を作るAPI。
- 新規model rowと `.tla` / `.cfg` / reduction / trace evidenceを一つのtransactionで登録するAPI。
- requirement/designからnamed invariantまでの全数coverageを検証するAPI。
- proof、独立review、人間承認をregistrationへ束縛するauthoring receipt API。

`updateModelMap`は既存 `map.models.map(...)` の再発行器であり、新規row生成APIではない。既存CLIを新規authoring APIと見なしてM1/M5/M7を満たしたことにはできない。また、plugin manifestに `tla-model-receipt.ts` / `tla-module-deps.ts` がないため、canonical APIがgreenでもcomposed Codexではimport解決前にexit 1となる。

## 観測メタデータ

- 観測日: 2026-08-04
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- 外部HTTPサービスやDB APIは持たず、主要境界はCLI、filesystem、hook stdin/stdout、ACP JSON-RPCである。

## 利用者向けCLI面

| 面 | 入口 | 契約 |
|---|---|---|
| Workflow | `bun <harness>/tools/amadeus-orchestrate.ts next/report/park` | typed directiveをstdoutへ返し、reportが状態遷移を所有 |
| Utility | `amadeus-utility.ts` | status/doctor/help、intent/space、codekb-path等 |
| Setup | `bunx @amadeus-dlc/setup install|upgrade --harness <name>` | Release Assetをtransactionalに導入 |
| Package | `bun scripts/package.ts [harness]` | manifestから`dist/<harness>`生成 |
| Self promotion | `bun scripts/promote-self.ts --apply` | project-local生成面更新、Kimi managed hooks merge |
| Tests | `bun tests/run-tests.ts --ci|--all` | tier/profileに基づくBun test実行 |

## Common live E2E TypeScript contract

`tests/harness/live-e2e/adapter.ts` の `LiveAdapter` は次を公開する。

- `preflight(context): PreflightResult`: binary/version/dist/auth/capabilityを測定し、readyまたはcanonical skip findingsを返す。
- `prepare(context): Result<PreparedRun, AdapterError>`: scratch、credential、resourceを束ね、実行可能なargvと遅延評価envを返す。
- `execute(run, signal): AdapterExecution`: exit、timeout/abort、bounded digest、任意のstructured anchorを返す。
- `cleanup(target): CleanupReceipt`: process、credential、scratch等の解放結果を返す。

`runLiveJourney(adapter, journey, context)` は `Result<LiveRunReceipt, LiveRunError>` を返す。`contract.ts` の statusは `success|skip|timeout|failure`、codeは `AMADEUS_LIVE_E2E:*` の閉集合である。

## Phase 2 adapter候補の現行契約

### Kimi print

`tests/harness/kimi-print-drive.ts`:

- `skipReason(env)`: `AMADEUS_KIMI_PRINT_LIVE=1`、binary、`dist/kimi`を検査するが、GitHub Actions hard denyとcanonical codeは未実装。
- `prepareKimiHome(home, realHome?)`: source `credentials`/`oauth`をscratch homeへsymlinkする。
- `writeKimiConfig(home, model?)`: managed provider/modelの非秘密configを作成する。
- `runPrintSession({cwd,prompt,env,timeoutMs,bin})`: `kimi -p`を同期spawnし、stdout/stderr/exit/timeoutを返す。

### Kiro ACP

`tests/harness/kiro-acp-drive.ts`:

- `AcpSession`: `kiro-cli acp --agent <name> [--trust-all-tools]`をspawnし、`initialize`、`session/new`、`session/prompt`、`session/cancel`をJSON-RPCで扱う。
- `driveKiroAcp(options)`: tool calls、assistant text、permission requests、state/audit観測を返す。`stopAfterToolTitle`はtool output取得直後にcancelするdeterministic anchorである。

### Kiro TUI

`tests/harness/tui-drive.ts`/`tui-client.ts` は `start/send/wait/capture/kill/answer-gate` を提供する。backendはprivate tmux serverを用い、painted paneとon-disk stateを観測する。

## 環境変数と安全契約

| Key | 現行用途 |
|---|---|
| `AMADEUS_KIMI_PRINT_LIVE` | Kimi print opt-in |
| `AMADEUS_KIRO_ACP_LIVE` | Kiro ACP opt-in |
| `AMADEUS_KIRO_TUI_LIVE` | Kiro TUI opt-in |
| `KIMI_CODE_HOME` | Kimi config/auth解決home。source pathとして直接childへ漏らさずscratch値へ置換が必要 |
| `GITHUB_ACTIONS` | common policyでは`true`をhard deny。legacy Kimi/Kiro gateには未配線 |
| `AMADEUS_TUI_TMUX_SOCKET` | legacy TUI private tmux label override |

## 配布manifest API

`scripts/manifest-types.ts` の `HarnessManifest` が、name、harnessDir、coreDirs、harnessFiles、frontmatterAdditions、onboarding、rulesRename、resources/emitを定義する。Kimi/Kiroはいずれも`emit: null`で、共通packagerのgraph compileとrunner generationを利用する。
