# Codex Native Driver Tech Stack Decisions

## 上流とbrownfield制約

本成果物はU-04の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、CodeKB `technology-stack.md`を消費する。Codex native driverはinstalled Codex CLIの`app-server`と`codex exec --json`を既存Bun/TypeScript frameworkへ接続し、OpenAI SDK、Responses API、別serviceを追加しない。

## Decision table

| Concern | Decision | Rationale | Rejected |
|---|---|---|---|
| provider runtime | installed Codex CLI、app-server JSON-RPC stdio、`codex exec --json --ephemeral` | effective config/catalog/authとnative JSONLを公式surfaceから取得 | SDK/direct API、daemon |
| model resolution | unpinned handshakeでruntime exact IDを解決し、本runだけ`--model <resolved>`へpin | alias/defaultとcatalog Ultraを一意に束縛 | hard-coded `gpt-5.6-sol`、display name |
| effort/multi-agent | `model_reasoning_effort=\"ultra\"`、`features.multi_agent=true` | explicit Ultra + native delegation | xhigh/max、存在しない`--ultra` |
| adapter/registration | TypeScript ESM immutable `codex-ultra` view、driver-keyed set exactly 1 | closed production mapping | mutable adapter、dynamic plugin |
| role | attempt固有dynamic role + 1 generic worker config | Unit全単射、model/effort継承 | Unit別config/model pin |
| capture | U-02 fixed-path capture + process JSONL + static hook records | identity/arm/fencingとterminal join | private observer、provider-state scan |
| tool isolation | official `shell_environment_policy.inherit=\"none\"`とworkspace sandbox | provider authとmodel toolを分離 | env全継承、custom sandbox service |
| schema | versioned `CodexSurfaceProfile` + closed `NormalizedDriverEvent` | wire drift fail-closed、raw非保存 | permissive parser、raw fixture |
| tests | `bun:test`、fast-check、fake app-server/exec/hook、macOS opt-in live | deterministic matrix + native evidence | fakeだけ、credentialed Linux CI |
| dependencies | Bun/Node標準APIと既存framework、runtime package 0件追加 | packaging/supply-chain最小化 | JSON-RPC/process/schema package追加 |

## Placement and ownership

- authored C-06 adapter、ProbeBinding/profile、role/launch builder、hook projectionは`packages/framework/core/`の既存構造へ置く。
- C-01 selector/lifecycle、U-02 supervisor/capture、C-08 common verifier、C-11 refereeをC-06へ複製しない。
- Codex harness conductorはresolve/prepare/run/check/record request/finalize/record resultを媒介し、C-01↔C-11 direct edgeを0件にする。
- static hook definition、generic worker config、Codex skill/config example、`dist`/self-installはframework正本から生成する。
- user provider/model/auth configは維持し、driver所有overrideだけをsessionへ明示する。

## Security, portability, and operations

app-serverは1 probe内のstdio processとして終了し、daemon化しない。hook trust/definition hash、provider/tool env分離、evidence sandboxをbehavior sentinelで実証できないCLI profileはparkする。

credentialed live proofはmacOS、GitHub Actions Linuxはfake/failure/package検査、Windowsは対象外とする。live artifactへraw JSONL、prompt、message、credential、transcriptを保存しない。運用signalは既存CLI exit、redacted audit、evidence summaryを使う。

## Decision consequences

current environmentで`gpt-5.6-sol`がUltra対応でもslugを固定しないため、将来のdefault/alias変更をexact catalog/session bindingで安全に追従できる。一方、official collaboration/hook/env isolation surfaceがprofile化できないversionはparkとなる。このfail-closed制約はfloorやSubagentStopだけをnative Ultraと誤認しないために必要である。
