# Deployment Architecture: U002-subagent-status-audit

## 上流文脈

この deployment-architecture は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、payload classification、old/new row normalization、additive field construction、stdout JSON parse、audit append failure の処理予算を定義している。

`security-design` は、trusted source、message excerpt 最小化、event 名維持、`skills/` 配布境界を定義している。

`scalability-design` は、payload 単体の field access、3 状態 outcome、U003 read-only consumer の境界を定義している。

`reliability-design` は、success、failure、unknown、old row compatibility、audit append failure の検証条件を定義している。

`logical-components` は、Subagent Status Classifier、Subagent Audit Field Builder、Subagent Audit Reader、Evidence Recording Adapter を定義している。

`components` は、Subagent Status と Error Audit を `.agents/aidlc/tools` 内の component として定義している。

`services` は、Evidence Recording Service と Doctor Diagnostic Service の logical service boundary を定義している。

`business-logic-model` は、hook payload から `SUBAGENT_COMPLETED` additive fields と normalized outcome へ進む処理順序を定義している。

## 配置方針

U002 は deployable service を追加しない。

実行形態は、既存 hook integration と Bun/TypeScript の in-process helper である。

新しい ECS、Lambda、EC2、Kubernetes、daemon、message broker、database は作らない。

Subagent Status は parse 済み hook payload を受け取り、classification と audit field construction だけを行う。

U002 は U003 を呼び出さない。

U003 は U002 の audit evidence を read-only に読む。

## 環境定義

| Environment | 実行場所 | 役割 | 差分 |
|---|---|---|---|
| Local | target workspace | hook payload fixture と audit row を確認する。 | message text classifier を使わない。 |
| CI | pull request runner | success、failure、unknown、old/new row fixture を実行する。 | cloud resource を使わない。 |
| Review | PR と Intent artifact | event 名維持、additive field、scope boundary を確認する。 | 実行環境ではなく証拠確認面である。 |

Local と CI は同じ TypeScript helper を使う。

環境差分は fixture と command input だけに限定する。

## Infrastructure as Code

U002 では IaC を作成しない。

新しい AWS resource、IAM role、database、queue、network topology がないため、CDK、CloudFormation、Terraform の定義対象が存在しない。

IaC scanning は U002 の required gate ではない。

## Resource Sizing

Sizing target は hook payload 1 件の classification と audit row normalization である。

Payload classification は top-level `subagent_status` と top-level `status` だけを読む。

1000 rows の old/new row normalization fixture を CI target とする。

Audit field construction は outcome、source、evidence ref の小さな object に限定する。

## Security and Compliance

`tool_input.status`、message text、transcript、last assistant message は classification source にしない。

Message excerpt は最小化し、secret、token、full stack trace を標準出力に出さない。

PCI-DSS、HIPAA、GDPR の直接対象となる data processing は追加しない。

SOC 2 相当の auditability は、event 名維持、additive field、old row compatibility、deterministic fixture で支える。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Date: 2026-07-04T09:03:22Z

Iteration: 1

U002 の deployment architecture は、hook integration と CLI 内 helper に限定されている。

新しい cloud deployment を要求せず、trusted status source と audit evidence の境界を維持している。
