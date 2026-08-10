# Business Rules — issue-2833-failure-transition

入力: [`unit-of-work.md`](../../../inception/units-generation/unit-of-work.md)、[`unit-of-work-story-map.md`](../../../inception/units-generation/unit-of-work-story-map.md)、[`requirements.md`](../../../inception/requirements-analysis/requirements.md)、[`components.md`](../../../inception/application-design/components.md)、[`component-methods.md`](../../../inception/application-design/component-methods.md)、[`services.md`](../../../inception/application-design/services.md)。

## Invariants

- BR-OUT-1: terminal outcomeは`succeeded | failed | cancelled`だけ。
- BR-OUT-2: 1 halt occurrenceは1 failed Unit Zを対象とし、Retry/SkipはZだけ、AbortはConstruction全体。
- BR-OUT-3: original batchの全Task帰還前に裁定を出さない。
- BR-OUT-4: intent/stage/unit/attempt/batchが一致しないevidenceを混入しない。
- BR-OUT-5: same UnitKey/same seqの矛盾、missing join key、ambiguous attemptはfail-closed。
- BR-OUT-6: successful/cancelled siblingを別Unitの裁定で上書きしない。
- BR-OUT-7: Abort後の`next`は同じbatchを再提示せず`parked`。
- BR-OUT-8: autonomy grantを降格せず、generic user park guardを経由しない。
- BR-OUT-9: Retry後のswarm directiveはprepared batch / retry Unitを機械可読なoptional fieldで示し、既存worktreeを再prepareしない。
- BR-OUT-10: `resolve-failure`はnative dispatch前のattemptを先行acquireせず、permit取得とconfirmをconductor protocolへ一続きで委譲する。
- BR-OUT-11: solo相関は既存BOLT event familyへ明示batch / attemptをthreadし、solo Unit Poolや新event familyを作らない。

## Decision Table

| Ruling | Target change | Siblings | Cursor | Preservation |
|---|---|---|---|---|
| Retry(Z) | new attempt eligible | byte-semantic unchanged | current stage | old failure/worktree retained |
| Skip(Z) | current attempt cancelled | unchanged | next eligible Unit | reason/evidence retained |
| Abort(Z) | trigger remains failed | all outcomes unchanged | parked, not completed | all evidence/worktrees retained |

## Validation and Error Policy

- malformed audit inputを既定値で補完しない。
- `BOLT_FAILED` / `SWARM_BATON_RETURNED`はemit存在でなくselectorが実際にconsumeするtestで証明する。
- checkbox `[?]`、stage-level skip、continuation budget exhaustionを正式裁定に使わない。
- `report --result failed` testは非zero exitを期待せず、exit 0と`kind:error`を同時assertする。

## TDD Scenarios

- Red: swarm/soloのRetry・Skip・Abort全遷移、multi-failure順序、stale attempt、cross-intent contamination、autonomous parked、Stop hook1回。
- Green:最小projection/selector配線で各Redを個別に閉じる。
- Regression: Stop hook source不変、新workflow state 0、failure evidence/worktree保持。
