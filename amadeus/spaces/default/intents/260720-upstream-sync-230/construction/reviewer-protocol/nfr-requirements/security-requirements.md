# Security Requirements — reviewer-protocol

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。reviewer prompt、artifact path、integration ID、owner evidenceをtrust boundary上の入力として扱い、least privilegeとmaker-checker provenanceを守る。

## Least-privilege read scope

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U08-01 | sibling data exposure | §12aのauthoritative declared scopeを`stage_file`、current Unitの実在`produces`、present `consumes`へ閉じ、Q&Aは`directive.consumes`明示時だけ含める。memory/plan/reasoning/record rootを除外する。 | file open、grep、glob、shell patternによるsibling requestをReview/READY証拠として拒否。 |
| SEC-U08-02 | scope escalation | concrete integration ID、passed contractの単一owner path、非空reason、non-browse/search単一file pathの4条件ANDを`check-read`でrequest前に評価する。 | 一条件欠落、owner 0/複数、path不一致、2 file目はaccepted request 0。 |
| SEC-U08-03 | post-hoc authorization / transcript tamper | `check-read`を唯一の受理経路とし、decision、path、reason、ID、owner evidenceをrequest前に固定する。`complete-review`がdirective/artifacts/consumesからtranscriptを全件再検証する。 | bypass、改竄、rejected、approved path外、2 file目requestを含むresultはReview/READY不受理。 |
| SEC-U08-04 | identity spoofing | `runtimeReviewIdentity`は実checker personaと直前実測UTCから4-field Reviewを作る。 | producer persona、推定日付、欠落fieldをREADYとして受理しない。 |

passed contractのowner解決にcurrent Unitとpassed consumes以外を使わない。directory、glob、grep、shell wildcard、browse、searchからowner候補を発見する行為は承認経路にならない。

## Data protection・audit

- builderの非成果物diaryやreasoningをreviewerへ渡さず、必要最小のartifact contentだけを読む。
- scope decision transcriptはsubagent prompt/result間だけのtransient carrierとし、最終Reviewへは`complete-review`が再検証した同内容のScope decision projectionを永続記録する。既存auditはinvocation identity/completionを保持し、新しいaudit event、payload dump、read ledger、storeを追加しない。
- 同一decisionの再実行で記録を増殖させず、次iterationへapprovalを暗黙継承しない。
- credential、secret、network送信面、database、service、UI、全6 harness read proxy/sandboxを追加しない。監査保持期間を本Unitで決めない。actual invisible readの完全捕捉は要件にしない。
- reviewerはprimary artifactへのReview append以外を変更しない。

## Failure・compliance

invalid date、persona欠落、4-field欠落、Scope decision transcriptのbypass・改竄・境界外requestはloud failureまたはReview/READY不受理とする。owner解決不能はshared contract findingに閉じ、permissionを拡張しない。

`requirements.md`のC-7により追加規制要件はない。既存auditability、human approval、license境界を維持し、未根拠な規制適合を主張しない。

## 検証

positive fixtureは4条件成立、request前decision、`check-read`受理、single owner path、invocation限定、prompt/result transcriptとReview projectionの一致を検証する。negative fixtureはIDなし、owner 0/複数、reason空、path不一致、directory/glob/grep/shell wildcard、browse/search、2 file目、事後記録、rejected/outside request、bypass、transcript改竄を全数含める。

## トレーサビリティ

SEC-U08-01〜04は`business-rules.md`のBR-U08-01〜17、`business-logic-model.md`のFailure decisions、`requirements.md`のFR-5、NFR-2、NFR-3、NFR-8、`technology-stack.md`の既存dependency境界に対応する。
