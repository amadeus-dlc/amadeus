# Kiro Native Driver Tech Stack Decisions

## 上流とbrownfield制約

本成果物はU-05の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、CodeKB `technology-stack.md`を消費する。Kiro native driverはinstalled `kiro-cli`のV2 headless/session/agent JSON surfaceを既存Bun/TypeScript frameworkへ接続し、Kiro SDK、direct API、別serviceを追加しない。

## Decision table

| Concern | Decision | Rationale | Rejected |
|---|---|---|---|
| provider runtime | installed `kiro-cli 2.x`、`chat --agent-engine v2 --no-interactive` | local/official headless agent/session surface | V3 silent retry、browser TUI、SDK/API |
| topology | deterministic balanced waves、2〜4 Unit、serial parent process | provider上限4とUnit drop 0を両立 | all-at-once、1件wave、dynamic rebalance |
| adapter/registration | TypeScript ESM immutable `kiro-subagent` view、set exactly 1 | closed production mapping | dynamic plugin、other provider change |
| runtime agents | project-local reserved JSON、1 parent role/wave、1 worker role/Unit | non-interactive discoveryとrole binding | global agent、hidden config |
| trust | closed parent/worker tool sets + `toolsSettings.*.allowedPaths` | least privilege、prepared worktree confinement | `--trust-all-tools`、shell/nested agent |
| capture | U-02 baseline inventory/fixed session root observer | arm/fencingとnew sessionだけを束縛 | adapter内部scan、raw session正本 |
| schema | versioned `KiroSessionSurfaceProfileV1` + closed normalized events | parent/terminal drift fail-closed | permissive/V3 profile reuse |
| tests | `bun:test`、fast-check、fake CLI/session、macOS CLI/IDE live | wave property + deterministic failure + native proof | fakeだけ、credentialed Linux CI |
| dependencies | Bun/Node標準API、existing Git/framework、runtime package 0件追加 | packaging/supply-chain最小化 | session/parser/process package追加 |

## Placement and ownership

- authored C-07 adapter、balanced split、agent config/profile/session projectionは`packages/framework/core/`の既存構造へ置く。
- C-01 selector/lifecycle、U-02 supervisor/capture、C-08 common verifier、C-11 refereeをC-07へ複製しない。
- Kiro CLI/Kiro IDE conductorは同じversioned C-01/C-11 envelopeを媒介し、C-01/C-07/C-08↔C-11 direct edgeを0件にする。
- runtime agent path patternだけをdistribution `.gitignore`へ同期し、生成物はframework正本からpackageする。
- existing Kiro auth/provider/modelを維持し、worker modelをhard-codeしない。

## Security, portability, and operations

agent config validationとbehavior handshakeはversionだけでなく、本runと同じcwd/config/headless shape、non-interactive session creation、stdin ingestionを実証する。parent relation/terminal fieldがprofile化できないCLIはparkする。

credentialed live proofはmacOSのKiro CLI/IDE、Linuxはfake/profile/package、Windowsは対象外とする。live artifactへraw session、prompt、message、summary、credentialを保存しない。運用signalはCLI exit、redacted wave/session audit、C-08/C-11 envelopeを使う。

## Decision consequences

4 Unit上限をbalanced serial waveへ変換するため、大batchは複数parent processになるが、各waveをC-08/C-11でgateして未収束の後続実行を防げる。V3や不明session schemaへ自動追従せずparkするため対応version追加にはfixture更新が必要だが、default childやsummaryをnative証拠と誤認しない。
