# Security Requirements — reviewer-protocol

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。reviewer prompt、artifact path、integration ID、owner evidenceをtrust boundary上の入力として扱い、least privilegeとmaker-checker provenanceを守る。

## Least-privilege read scope

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U08-01 | sibling data exposure | 既定scopeをcurrent Unit、stage、Q&A、passed consumesへ閉じ、memory/plan/reasoning/record rootを除外する。 | file open、grep、glob、shell patternによるsibling readを全て拒否。 |
| SEC-U08-02 | scope escalation | concrete integration ID、passed contractの単一owner path、非空reason、non-browse/search単一file pathの4条件ANDをread前に評価する。 | 一条件欠落、owner 0/複数、path不一致、2 file目は追加read 0。 |
| SEC-U08-03 | post-hoc authorization | decision、path、reason、ID、owner evidenceをread前に固定し、approved pathだけをinvocation限定listへ追加する。 | decision前、rejected後、approved path外のreadでreview全体が無効。 |
| SEC-U08-04 | identity spoofing | `runtimeReviewIdentity`は実checker personaと直前実測UTCから4-field Reviewを作る。 | producer persona、推定日付、欠落fieldをREADYとして受理しない。 |

passed contractのowner解決にcurrent Unitとpassed consumes以外を使わない。directory、glob、grep、shell wildcard、browse、searchからowner候補を発見する行為は承認経路にならない。

## Data protection・audit

- builderの非成果物diaryやreasoningをreviewerへ渡さず、必要最小のartifact contentだけを読む。
- scope decisionは既存Review、subagent prompt/result、audit記録で同値追跡し、新しいaudit eventやpayload dumpを追加しない。
- 同一decisionの再実行で記録を増殖させず、次iterationへapprovalを暗黙継承しない。
- credential、secret、network送信面、database、service、UIを追加しない。監査保持期間を本Unitで決めない。
- reviewerはprimary artifactへのReview append以外を変更しない。

## Failure・compliance

invalid date、persona欠落、4-field欠落、scope violationはloud failureまたはreview無効とし、READY証拠へ使わない。owner解決不能はshared contract findingに閉じ、permissionを拡張しない。

`requirements.md`のC-7により追加規制要件はない。既存auditability、human approval、license境界を維持し、未根拠な規制適合を主張しない。

## 検証

positive fixtureは4条件成立、read前decision、single owner path、invocation限定、Review/subagent/audit追跡を検証する。negative fixtureはIDなし、owner 0/複数、reason空、path不一致、directory/glob/grep/shell wildcard、browse/search、2 file目、事後記録、拒否後readを全数含める。

## トレーサビリティ

SEC-U08-01〜04は`business-rules.md`のBR-U08-01〜17、`business-logic-model.md`のFailure decisions、`requirements.md`のFR-5、NFR-2、NFR-3、NFR-8、`technology-stack.md`の既存dependency境界に対応する。
