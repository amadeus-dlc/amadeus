# Reliability Requirements — reviewer-protocol

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。常駐serviceではないためavailability percentage、RTO、RPOを新設せず、review verdictの完全性・再現性・fail-closed性を信頼性境界とする。

## Correctnessとfailure containment

| ID | Failure | Required behavior | Evidence |
|---|---|---|---|
| REL-U08-01 | date command non-zero、空、複数行、不正形式 | Review headerを確定せずloud failure。推定値で補わない。 | date positive/negative fixture。 |
| REL-U08-02 | checker personaまたは4-field欠落 | READY証拠に使わない。 | architecture/product reviewer fixture。 |
| REL-U08-03 | pass-list外read要求 | 4条件decisionをread前に通せなければcontract findingへ閉じる。 | rejected fixtureで追加read 0。 |
| REL-U08-04 | rejected後、decision前、approved path外、2 file目のread | review全体を無効にし、独立review完了証拠へ数えない。 | violation fixture全数。 |
| REL-U08-05 | projection drift | authored sourceを正としgenerator checkを失敗させる。 | 6 harness drift test。 |
| REL-U08-06 | repeated decision | 既存記録面で同値追跡し、記録を増殖させない。 | idempotency fixture。 |

reviewerはprimary artifactのReview append以外を変更しない。scope violationを含むfinding内容が正しくても、そのreviewをREADYへ昇格させない。

## Determinismとobservability

- 同一UnitRef、passed consumes、実在artifact集合から同一closed pass-listを得る。
- Reviewには実checker persona、直前UTC、Verdict、Iterationを記録し、subagent result先頭でもidentityを機械抽出可能にする。
- spot-check decisionのpath、reason、integration ID、owner evidence、approved/rejectedをReviewと既存subagent/auditへ同値記録する。
- 新audit event、retention、metrics backend、trace collector、alert thresholdを追加しない。
- missing optionalやunreferenced sibling contract entryをfalse findingへ変換しない。

## Verification gate

targeted identity/read-scope tests、positive/negative spot-check、6 harness projection checkを通し、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施、非0、stale結果をgreenへ読み替えない。Issue #1313が未解消のままfull-CI-required gateへ到達した場合は停止する。

push前local lcovでpatch追加行の未カバー0を実測する。spawn blind spotは対象moduleの計測状況を実測後、既存の計測済みmoduleへin-process seamを置く。waiverは既決の二段判定と権威あるpatch集計・CI lcov証拠を満たす残余行だけに限定する。

## トレーサビリティ

REL-U08-01〜06は`business-rules.md`のBR-U08-01〜17、`business-logic-model.md`のFailure decisionsと検証シナリオ、`requirements.md`のFR-5、NFR-1〜6、`technology-stack.md`のgenerator/test境界に対応する。
