# Deployment Architecture: U003-workflow-warning-traceability

## 上流文脈

この deployment-architecture は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、warning evaluation、Requirement evidence map、PR readiness checklist の処理予算を定義している。

`security-design` は、read-only evidence、state 非変更、secret 非表示、scope-out 境界を定義している。

`scalability-design` は、stage artifact 数、audit row 数、実行時 graph entry 数、verification evidence 数の成長対象を定義している。

`reliability-design` は、false-positive guard、non-mutating doctor、missing evidence warning、stdout JSON 非干渉を定義している。

`logical-components` は、Workflow Evidence Snapshot、Conductor Warning Evaluator、False-Positive Guard、Requirement Evidence Mapper、PR Readiness Checklist Builder、Doctor Warning Renderer を定義している。

`components` は、Conductor Warning、Verification Traceability、Doctor Composition を component として定義している。

`services` は、Doctor Diagnostic Service と Verification Traceability Service を中心にした logical service boundary を定義している。

`business-logic-model` は、state、audit、`runtime-graph.json`、stage artifact を read-only snapshot にし、warning と checklist へ変換する処理順序を定義している。

## 配置方針

U003 は deployable service を追加しない。

実行形態は、既存の doctor path と traceability helper を使う `.agents/aidlc/tools` 内の CLI 実行である。

Compute resource は、target workspace または CI runner の local process に限定する。

Network topology、container orchestration、AWS runtime infrastructure は新設しない。

Storage は、既存の `aidlc-state.md`、audit shard、`runtime-graph.json`、stage artifact、verification result を read-only に参照する。

Doctor warning は state transition を実行しない。

## 環境定義

| Environment | 実行場所 | 役割 | 差分 |
|---|---|---|---|
| Local | target workspace | warning fixture と PR readiness checklist を確認する。 | file-backed evidence を直接参照できる。 |
| CI | pull request runner | non-mutating assertion、JSON parse、evidence map fixture を検証する。 | 外部 service を使わない。 |
| Review | PR と Intent artifact | Issue、Requirement、validator、parity、scope-out を確認する。 | 証拠確認面である。 |

Local と CI は topology を分けない。

差分は fixture と検証コマンドだけに限定する。

## Infrastructure as Code

U003 は IaC を作成しない。

AWS resource、database、message broker、dashboard hosting、collector deployment がないため、CDK、CloudFormation、Terraform の対象は存在しない。

`engineFileExceptions` と `.coderabbit.yml` または `.coderabbit.yaml` は変更しない。

## Resource Sizing

Workflow Evidence Snapshot は、state、audit、実行時 graph、artifact path を 1 回集約する。

Warning evaluation は snapshot を読む pure helper にする。

Requirement evidence map は R001-R009 の固定集合で構築する。

PR readiness checklist は Issue #431、#432、#433、#435 の固定集合で構築する。

Unbounded audit scan は避ける。

## Security and Compliance

Conductor 自己申告を failure evidence の trusted source にしない。

Doctor standard output と PR checklist に secret、token、full stack trace を混ぜない。

Missing evidence は pass ではなく warning item にする。

SOC 2 相当の auditability と change traceability は、non-mutating doctor、append-only audit、deterministic verification、PR checklist で支える。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing は追加しない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

U003 の deployment architecture は、read-only evidence aggregation に限定されている。

State mutation と deployment infrastructure を追加しないため、warning と traceability の責務が分離されている。
