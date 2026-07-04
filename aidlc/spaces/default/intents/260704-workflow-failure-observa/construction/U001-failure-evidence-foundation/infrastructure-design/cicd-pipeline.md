# CI/CD Pipeline: U001-failure-evidence-foundation

## 上流文脈

この cicd-pipeline は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、Telemetry facade、Error Audit、Hook Drop Doctor、Doctor Composition の deterministic fixture を定義している。

`security-design` は、secret 非表示、audit taxonomy diff、no-op default no-send、`skills/` と `.coderabbit.yml` または `.coderabbit.yaml` の非変更確認を定義している。

`scalability-design` は、100 files、各 100 lines の `.drops` fixture と malformed entry fixture を定義している。

`reliability-design` は、error directive、top-level catch、audit failure、missing directory、malformed drops、no-send、JSON parse の検証を定義している。

`logical-components` は、Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の検証観点を定義している。

`components` は、各 component の traceability と verification focus を定義している。

`services` は、AI-DLC CLI Tooling Service、Evidence Recording Service、Doctor Diagnostic Service、Telemetry Core Service の境界を定義している。

`business-logic-model` は、command execution から telemetry、audit、doctor output へ進む処理順序を定義している。

## Pipeline Scope

U001 は deployable service を追加しないため、deployment stage は作らない。

CI/CD の対象は、TypeScript 実装、deterministic test、validator、stdout JSON contract、OpenTelemetry no-op default no-send の検証である。

PR 作成前には対象 Intent validator と標準検証を実行する。

PR 作成後は、CI failure を review comment より先に扱う。

## Pipeline Stages

| Stage | Check | Evidence |
|---|---|---|
| Install | package manager の lock に従い依存を解決する。 | CI log |
| Typecheck | `.agents/aidlc/tools` の TypeScript strict compatibility を確認する。 | typecheck result |
| Unit test | Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の deterministic fixture を実行する。 | test result |
| JSON contract | `next` と `report` の stdout が JSON として parse できることを確認する。 | JSON parse assertion |
| No-send | exporter 未設定時に OpenTelemetry が network export しないことを確認する。 | no-op default no-send test |
| Validator | 対象 Intent の構造を検証する。 | Amadeus validator result |
| Full suite | `npm run test:all` を実行する。 | standard verification result |

## Security Gates

Secret、token、full stack trace が標準表示に混ざらないことを snapshot または assertion で確認する。

Audit taxonomy の既存 event 名を削除または改名しないことを差分で確認する。

`skills/` は配布物境界であるため、今回の PR では直接変更しない。

`.coderabbit.yml` または `.coderabbit.yaml` は人間の明示許可なしに変更しない。

IaC が追加されないため、cfn-lint、cdk-nag、Checkov は U001 の required gate にしない。

## Deployment and Rollback

U001 は runtime deployment を持たない。

Rollback は Git の差分 revert または PR の修正で扱う。

Environment promotion、blue-green、canary、rolling deployment は対象外である。

Feature flag は不要である。

OpenTelemetry exporter は明示設定がある場合だけ後続拡張として扱う。

## Secrets Management

U001 は新しい secret を要求しない。

Telemetry no-op default は credential を必要としない。

Test exporter seam は local deterministic test のための注入点であり、外部 credential を扱わない。

CI では telemetry exporter の secret を必須にしない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:01:20Z

Iteration: 1

U001 の CI/CD pipeline は、deployment ではなく verification pipeline として設計されている。

OpenTelemetry core 計装の no-op default と stdout JSON 契約を同時に守る検証が含まれている。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| AmadeusValidator | PASS | Intent record の構造条件を満たしている。 |
| required-sections | PASS | Markdown structure は stage sensor 条件を満たしている。 |
| upstream-coverage | PASS | `performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` への参照がある。 |
