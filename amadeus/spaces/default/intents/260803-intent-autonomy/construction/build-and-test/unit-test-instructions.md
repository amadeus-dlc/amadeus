# Unit Test Instructions — intent-autonomy

## 入力とframework

5 Unitすべての `code-generation-plan.md` と `code-summary.md` に記載された公開contractを `bun:test` で検証する。件数quotaではなく、要件・risk・NFRに基づくComprehensive coverageを採用する。

## Command

```sh
bun test --timeout 120000 \
  tests/unit/t426-loop-monitor.test.ts \
  tests/unit/t427-loop-monitor-runtime.test.ts \
  tests/unit/t428-quality-repair.test.ts \
  tests/unit/t431-intent-autonomy.test.ts \
  tests/unit/t433-autonomy-review-observability.test.ts \
  tests/unit/t434-intent-completion.test.ts
```

Unit間でfilesystem fixtureを共有しないため、これらは分割して並列実行してよい。

## Coverage expectations

- U1: manifest compiler、bounded reducer、reservation-first Judge、reconcile-first、evidence latch。
- U2: activation、blocking evidence、T+1 convergence、replan-first、repair-stalled。
- U3: mode / Intent-scoped grant、事前裁定、exact effect、park / resume、audit replay。
- U4: decision list / detail / queue、real-human review、completed seal、redaction。
- U5: canonical cohort、credential-attested permit、receipt検証、atomic terminal transaction。

negative pathでは、不正なeffect、Judge、review、completionが0件であることを確認する。live credentialやraw evidenceはfixtureへ保存せず、stable IDとdigestだけを使う。

## 合否

全assertion成功を必須とする。live seamはunit testのtest doubleでcontractを検証し、実credentialの有無をunit testのpass条件へ混ぜない。
