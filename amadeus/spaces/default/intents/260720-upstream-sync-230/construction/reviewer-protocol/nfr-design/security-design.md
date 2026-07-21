# Security Design — reviewer-protocol

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。reviewer prompt、artifact path、integration ID、owner evidenceをtrust-boundary入力として扱う。

## Trust boundaries

| Boundary | Accepted input | Control | Rejected behavior |
|---|---|---|---|
| engine→orchestrator | current Unit、stage、Q&A、実在成果物、passed consumes | `reviewerReadScope`によるclosed pass-list | memory/plan/reasoning/record root/siblingの混入 |
| current artifact→spot-check | concrete integration ID | read前4条件AND | IDなし、owner 0/複数、reason空、path不一致 |
| owner contract→追加read | 単一owner file | invocation限定1 path | directory/glob/grep/wildcard/browse/search、2 file目 |
| runtime→Review | 実checker personaと直前UTC | `runtimeReviewIdentity`の4-field検証 | producer persona、固定・推定日付、欠落field |
| authored source→projection | generator input | 6 harness drift check | dist手編集、scope拡張 |

## Least-privilege decision flow

orchestratorはread前に`decision=approved | rejected`、path、reason、integration ID、owner evidenceを固定する。owner解決根拠はcurrent Unitとpassed consumesだけであり、探索による候補発見を行わない。approved時だけ単一pathを当該invocationへ追加し、rejected後、decision前、approved path外、2 file目のreadが発生したreviewは全体を無効化する。

scope decisionは同じpath/reason/ID/evidenceを既存subagent prompt/resultとprimary artifactのReviewへ残し、既存auditから追跡可能にする。同一decisionの再実行で記録を増殖させず、新audit event、payload dump、別provenance storeを追加しない。

## Identity・data protection

`runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader`は実際に起動されたchecker personaと直前に実測したUTCだけを受理し、Verdict、Reviewer、Date、Iterationの4 fieldを一体で生成する。invalid date、persona欠落、field欠落はREADY証拠にしない。

builderのdiaryやreasoningをreviewerへ渡さず、reviewerが変更できるのはprimary artifactへの`## Review`追記だけとする。credential、secret、network送信面、database、service、UI、IAM、暗号化層、保持期間は追加しない。

## 検証

positive fixtureは4条件成立、read前decision、single owner path、invocation限定、Review/subagent/audit同値追跡を検査する。negative fixtureはIDなし、owner 0/複数、reason空、path不一致、directory/glob/grep/wildcard、browse/search、2 file目、事後記録、拒否後readを全数拒否する。

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U08-01〜04、`performance-requirements.md`の有界read、`scalability-requirements.md`の単一file容量、`reliability-requirements.md`のreview無効化、`tech-stack-decisions.md`の既存provenance、`business-logic-model.md`のFlow B/Cへ対応する。
