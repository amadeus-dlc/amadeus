# Claude Native Driver Tech Stack Decisions

## 上流とbrownfield制約

本成果物はU-03の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、CodeKB `technology-stack.md`を消費する。Claude native driverはinstalled `claude` CLIのinteractive Agent Teams surfaceとheadless Dynamic Workflow surfaceを既存Bun/TypeScript frameworkへ接続し、Claude SDK、API client、別serviceを追加しない。

## Decision table

| Concern | Decision | Rationale | Rejected |
|---|---|---|---|
| provider runtime | Agent Teamsはinteractive `claude` + PTY、Ultra Codeは`claude -p` + stream-json |利用者の既存auth/live native surfaceをmode-specific transportで使う | Claude SDK、direct API、mock production |
| Agent Teams mode | experimental env=1、`--teammate-mode in-process`、execution-derived `--session-id` |実team/task stateとhookを相関 | Task floor、旧TeamCreate、team name指定 |
| Ultra Code mode | `--effort ultracode` + versioned `ClaudeSurfaceProfile` |実workflow run/task/agentを証明 | xhigh、通常Agent tool、自己申告 |
| adapter | TypeScript ESMのimmutable 2 mode view + shared family |1 provider/2 driver、logic重複なし | mutable driver、2独立実装 |
| registration | generic driver-keyed `DriverAdapterSet` | Claude 2、Codex/Kiro各1のbuild-time cardinality | single adapter slot、dynamic plugin |
| capture | U-02 `EvidenceCapturePlan`/supervisor + exact-path observer | cleanup前state、identity/arm/fencingを統合 | hidden polling closure、root scan |
| hook/settings | attempt-owned ephemeral 0600 settingsとexclusive event file | global設定を汚さず並行write分離 | global `.claude/settings.json`、shared JSONL |
| schema | closed `NormalizedDriverEvent` v1 + version-range surface profile | raw data非保存、schema drift fail-closed | permissive parser、raw fixture |
| tests | `bun:test`、fast-check、fake CLI/temp HOME、macOS opt-in live | deterministic failure matrix + native proof | fakeだけ、credentialed Linux CI必須化 |
| dependencies | Bun/Node標準APIと既存framework modules、runtime package 0件追加 | packaging/security最小化 | process/path/schema library追加 |

## Placement and projection

- authored C-05 adapter/profile/parser/hookは`packages/framework/core/`の既存tool/harness構造へ置く。
- C-01 lifecycle、capture/process supervisor、C-08 verifier、C-11 refereeは各ownerを維持し、C-05へ複製しない。
- Claude harness conductorはprepare/run/check/record request/finalize/record resultをversioned JSONで媒介し、C-01↔C-11 direct edgeを0件にする。
- sourceからClaude skill、manifest、`dist`、self-installを`scripts/package.ts`で生成し、generated treeを正本にしない。
- project/user global settingsを正本や必須変更対象にしない。

## Security, portability, and operations

CLI/auth/surface probeはversionだけで成功にせず、非破壊handshakeとsentinel hookを要求する。state pathはAgent Teamsの予約済みexact pathまたはUltraのstream-bound exact run pathだけを使用し、realpath/ownerを検証する。

credentialed live proofはmacOS必須、GitHub Actions Linuxはfake suite必須、Windowsは対象外とする。個人credentialをCI secretやartifactへ新規保存しない。操作signalは既存CLI exit、redacted audit、live evidence indexを使い、新telemetry serviceを追加しない。

## Decision consequences

surface profileの更新とmacOS live proofがreleaseに必要になるが、Claudeの非公開・変動schemaを推測してfalse native successを出すより安全である。public/stable mappingを確定できないUltra Codeはparkし、floorで同名driverを偽装しない。1 coordinator process内でnative coordinationを使うため、Unitごとのprovider process floorとは観測可能に区別できる。
