# Deployment Architecture: U001-failure-evidence-foundation

## 上流文脈

この deployment-architecture は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、Telemetry facade、Error Audit、Hook Drop Doctor、Doctor Composition の処理予算を定義している。

`security-design` は、stdout JSON 非干渉、secret 非表示、file-backed evidence、OpenTelemetry no-op default の境界を定義している。

`scalability-design` は、`.drops` file と audit row の増加を bounded summary と verbose detail 分離で扱う方針を定義している。

`reliability-design` は、audit append failure、malformed drops、telemetry failure を相互に波及させない方針を定義している。

`logical-components` は、Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition を CLI 内 component として定義している。

`components` は、OpenTelemetry collector、dashboard、cloud export、production AWS topology を component にしない判断を定義している。

`services` は、新しい deployable service を追加せず、`.agents/aidlc/tools` 内の logical service boundary として扱う方針を定義している。

`business-logic-model` は、command execution から telemetry、audit、doctor output へ進む処理順序を定義している。

## 配置方針

U001 は deployable service を追加しない。

実行形態は、既存の Bun と TypeScript による `.agents/aidlc/tools` の CLI 実行である。

compute resource は、target workspace または CI runner のローカル process であり、ECS、Lambda、EC2、Kubernetes は新設しない。

network topology は新設しない。

storage は、既存 workspace 内の audit shard、`.aidlc-hooks-health/*.drops`、Intent artifact、`aidlc-state.md`、`runtime-graph.json` を使う。

OpenTelemetry collector、dashboard、cloud telemetry export infrastructure は core 計装の必須配置に含めない。

## 環境定義

| Environment | 実行場所 | 役割 | 差分 |
|---|---|---|---|
| Local | target workspace | 開発者と Agent が CLI を実行する。 | file-backed evidence を直接確認できる。 |
| CI | pull request runner | deterministic test、validator、stdout JSON parse、no-op default no-send を検証する。 | 外部 telemetry export を使わない。 |
| Review | PR と Intent artifact | Requirement、Issue、verification、PR readiness を追跡する。 | 実行環境ではなく証拠確認面である。 |

Local と CI は topology を分けない。

差分は入力 fixture、環境変数、検証コマンドだけに限定する。

## Infrastructure as Code

U001 では IaC を作成しない。

新しい AWS resource、VPC、subnet、IAM role、database、message broker、container image がないため、CDK、CloudFormation、Terraform の定義対象が存在しない。

IaC scanning は、IaC が追加された場合の後続 Unit または別 Intent の検証対象である。

今回の Infrastructure Design では、作らない理由を記録することを deployment architecture の一部として扱う。

## Resource Sizing

U001 の sizing 対象は process と file read である。

Telemetry facade は command 単位の軽量 object にする。

Hook Drop Doctor は 100 files、各 100 lines の `.drops` fixture を基準に summary aggregation を検証する。

Audit append は active workflow がある場合だけ行う。

No active workflow では no-op result にし、追加 storage lookup を増やさない。

## Security and Compliance

新しい IAM、network permission、secret store は作らない。

secret、token、full stack trace は標準表示と telemetry attribute に含めない。

SOC 2 相当の auditability は、`ERROR_LOGGED` audit row、deterministic test、Intent artifact、PR checklist で支える。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing は追加しない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:01:20Z

Iteration: 1

U001 の deployment architecture は、既存 CLI 内の実行時基盤に限定されている。

新しい AWS 配置、collector、dashboard を必須化しないため、core 計装の境界と一致している。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| AmadeusValidator | PASS | Intent record の構造条件を満たしている。 |
| required-sections | PASS | Markdown structure は stage sensor 条件を満たしている。 |
| upstream-coverage | PASS | `performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` への参照がある。 |
