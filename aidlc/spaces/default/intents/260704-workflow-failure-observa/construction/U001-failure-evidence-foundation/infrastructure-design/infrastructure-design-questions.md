# Infrastructure Design Questions: U001-failure-evidence-foundation

## Q1. Deployment boundary

U001 の deployment boundary をどこに置くか。

- A. AWS runtime service として新規に設計する。
- B. containerized service として切り出す。
- C. local CLI から独立した daemon にする。
- D. cloud export 前提の telemetry gateway にする。
- E. 既存 `.agents/aidlc/tools` の Bun/TypeScript CLI 内 component として扱う。

[Answer]: E

## Q2. Infrastructure services

U001 で新規に設計する infrastructure service をどう扱うか。

- A. database を追加する。
- B. message queue を追加する。
- C. cache service を追加する。
- D. collector と dashboard を必須にする。
- E. 追加 service は作らず、既存 file-backed evidence と optional exporter seam に閉じる。

[Answer]: E

## Q3. Monitoring approach

OpenTelemetry と診断情報の monitoring boundary をどう扱うか。

- A. collector 送信を常時必須にする。
- B. dashboard 作成を release gate にする。
- C. cloud telemetry export を必須にする。
- D. stdout JSON command に診断文を混ぜる。
- E. core 計装は必須、collector と dashboard は任意、default は no-op にする。

[Answer]: E

## Q4. CI/CD guardrail

U001 の CI/CD 検証をどう構成するか。

- A. cloud deploy pipeline を新設する。
- B. manual smoke test だけにする。
- C. production approval gate を設計する。
- D. IaC scan を必須にする。
- E. TypeScript/Bun の deterministic test、stdout JSON parse、validator、diff inspection を PR gate にする。

[Answer]: E

## Q5. Secrets and compliance

U001 の secret と compliance boundary をどう扱うか。

- A. secret store を新設する。
- B. IAM role を追加する。
- C. regulated personal data の保存を許可する。
- D. full stack trace を標準出力へ出す。
- E. secret、token、full stack trace を標準出力へ出さず、local internal evidence として扱う。

[Answer]: E

## Q6. Scaling policy

U001 の scaling policy をどう扱うか。

- A. horizontal scaling を設計する。
- B. database sharding を設計する。
- C. load balancer を設計する。
- D. autoscaling policy を設計する。
- E. bounded read、summary aggregation、verbose detail 分離で local workload を制御する。

[Answer]: E

## Ambiguity Analysis

すべての回答は E であり、上流の `performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components` と矛盾しない。

U001 は deployable service ではなく、`components`、`services`、`business-logic-model` が定義する CLI 内 logical component として扱う。

追加 follow-up は不要である。
