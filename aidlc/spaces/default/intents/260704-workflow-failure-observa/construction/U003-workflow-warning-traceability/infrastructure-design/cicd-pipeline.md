# CI/CD Pipeline: U003-workflow-warning-traceability

## 上流文脈

この cicd-pipeline は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、mismatch、abandonment、contradiction、Requirement evidence map、PR readiness checklist、JSON parse の fixture を定義している。

`security-design` は、conductor 自己申告へ依存しないこと、non-mutating assertion、secret 非表示、scope-out boundary を定義している。

`scalability-design` は、fixed rows と read-only dependency review を定義している。

`reliability-design` は、REL001 から REL009 までの warning と traceability coverage を定義している。

`logical-components` は、Workflow Evidence Snapshot、Conductor Warning Evaluator、False-Positive Guard、Requirement Evidence Mapper、PR Readiness Checklist Builder、Doctor Warning Renderer の検証を定義している。

`components` は、Conductor Warning、Verification Traceability、Doctor Composition の component 境界を定義している。

`services` は、Doctor Diagnostic Service と Verification Traceability Service の read-only connection を定義している。

`business-logic-model` は、workflow evidence から warning と checklist へ進む処理順序を定義している。

## Pipeline Scope

U003 は runtime deployment を持たない。

CI/CD の対象は、warning detection、false-positive guard、non-mutating assertion、Requirement evidence map、PR readiness checklist、stdout JSON 非干渉の検証である。

PR 作成前には対象 Intent validator、標準検証、parity、stdout JSON、OpenTelemetry no-op default no-send を evidence として確認する。

PR 作成後は、CI failure を review comment より先に扱う。

## Pipeline Stages

| Stage | Check | Evidence |
|---|---|---|
| Typecheck | snapshot、warning、evidence map、checklist の型を確認する。 | typecheck result |
| Warning test | mismatch、abandonment、contradiction fixture を実行する。 | warning fixture result |
| False-positive test | pending question と approval gate fixture を実行する。 | guard fixture result |
| Non-mutating test | state、audit、`runtime-graph.json` の before and after を比較する。 | snapshot assertion |
| Evidence map test | R001-R009 rows と missing evidence warning を確認する。 | evidence map result |
| PR checklist test | Issue #431、#432、#433、#435 の rows と scope-out を確認する。 | checklist result |
| JSON contract | warning path が stdout JSON に診断文を混ぜないことを確認する。 | JSON parse assertion |
| Validator | 対象 Intent の構造を検証する。 | Amadeus validator result |
| Full suite | `npm run test:all` を実行する。 | standard verification result |

## Security Gates

Conductor 自己申告を trusted source にしないことを fixture で確認する。

Doctor warning が state、audit、`runtime-graph.json` を変更しないことを non-mutating assertion で確認する。

Secret、token、full stack trace が output に混ざらないことを inspection で確認する。

`engineFileExceptions`、`skills/`、`.coderabbit.yml` または `.coderabbit.yaml` が変更されていないことを diff inspection で確認する。

## Deployment and Rollback

U003 は deployment stage を持たない。

Rollback は Git の差分 revert または PR 修正で扱う。

Blue-green、canary、rolling deployment、environment promotion は対象外である。

Feature flag は不要である。

## Secrets Management

U003 は新しい secret を要求しない。

State、audit、実行時 graph、artifact fixture は secret を含めない。

CI では外部 credential を必須にしない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

U003 の CI/CD pipeline は、warning の非破壊性と PR readiness の証拠不足を直接検証する。

Deployment gate を作らず、PR 前検証の証拠化に集中している。
