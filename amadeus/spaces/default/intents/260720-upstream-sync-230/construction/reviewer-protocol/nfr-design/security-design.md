# Security Design — reviewer-protocol

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。reviewer prompt、artifact path、integration ID、owner evidenceをtrust-boundary入力として扱う。

## Trust boundaries

| Boundary | Accepted input | Control | Rejected behavior |
|---|---|---|---|
| engine→orchestrator | `stage_file`、current Unitの実在`produces`、present consumes。Q&Aは`directive.consumes`明示時だけ | `reviewerReadScope`によるauthoritative declared pass-list | memory/plan/reasoning/record root/sibling/未宣言Q&Aの混入 |
| current artifact→spot-check | concrete integration ID | `check-read`のrequest前4条件AND | IDなし、owner 0/複数、reason空、path不一致 |
| owner contract→追加request | 単一owner file | invocation限定1 path + transcript | directory/glob/grep/wildcard/browse/search、2 file目、bypass/tamper |
| runtime→Review | 実checker personaと直前UTC | `runtimeReviewIdentity`の4-field検証 | producer persona、固定・推定日付、欠落field |
| authored source→projection | generator input | 6 harness drift check | dist手編集、scope拡張 |

## Least-privilege decision flow

orchestratorはrequest前に`decision=approved | rejected`、path、reason、integration ID、owner evidenceを固定し、`check-read`だけが受理する。owner解決根拠はcurrent Unitとpassed consumesだけであり、探索による候補発見を行わない。approved時だけ単一pathを当該invocationへ追加する。

scope decisionは同じpath/reason/ID/evidenceをsubagent prompt/result間のtransient transcriptとして渡す。`complete-review`はdirective/current artifacts/passed consumesから全entryを再計算し、bypass、改竄、rejected/outside/2 file目requestを含むresultを拒否したうえで、再検証済みScope decision projectionをprimary artifactの最終Reviewへ永続記録する。同一decisionの再実行でprojectionを増殖させず、新audit event、payload dump、read ledger、別provenance storeを追加しない。actual invisible readは非要件で、全6 harness read proxy/sandboxを追加しない。

## Identity・data protection

`runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader`は実際に起動されたchecker personaと直前に実測したUTCだけを受理し、Verdict、Reviewer、Date、Iterationの4 fieldを一体で生成する。invalid date、persona欠落、field欠落はREADY証拠にしない。

builderのdiaryやreasoningをreviewerへ渡さず、reviewerが変更できるのはprimary artifactへの`## Review`追記だけとする。credential、secret、network送信面、database、service、UI、IAM、暗号化層、保持期間は追加しない。

## 検証

positive fixtureは4条件成立、request前decision、`check-read`受理、single owner path、invocation限定、prompt/result transcriptとReview projectionの一致を検査する。negative fixtureはIDなし、owner 0/複数、reason空、path不一致、directory/glob/grep/wildcard、browse/search、2 file目、事後記録、rejected/outside request、bypass、transcript改竄を全数拒否する。

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U08-01〜04、`performance-requirements.md`の有界read、`scalability-requirements.md`の単一file容量、`reliability-requirements.md`のreview無効化、`tech-stack-decisions.md`の既存provenance、`business-logic-model.md`のFlow B/Cへ対応する。
