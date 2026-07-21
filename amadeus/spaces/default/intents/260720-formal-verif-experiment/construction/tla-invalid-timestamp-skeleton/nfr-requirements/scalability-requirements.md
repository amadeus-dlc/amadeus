# Scalability Requirements — tla-invalid-timestamp-skeleton

## Closed capacity

`business-logic-model.md` のsingle-fixture walking skeleton、`business-rules.md` のexact attempts、`requirements.md` の#1252 risk-first、`technology-stack.md` のsingle-process harnessに従う。容量単位は`revisionId + CompositionHeadId + executionManifestIdentity`である。

## Cardinality model

- fixture aliases=1（#1252）、local attempts=2、CI rows=2、TLC workers=1、active composition worktree=1に固定する。
- branch / composition / execution manifest / CI artifact / summaryはrevisionごとに各1である。
- retryは新revisionへ切り、旧raw evidenceとfailureをappend-only保持する。同一revisionへattempt 3を追加しない。
- U1〜U4 handler / evidenceを専用integration harnessで結線し、U8 final rootやfull matrixを開始しない。

## Resource and growth policy

新revision開始前に2 local bundles + uncompressed CI artifact 72 MiB + compressed archive 128 MiB + 1 GiB reserveをexclusive harness lock下でreservationする。claimはreservation / revision / owner session / process-start identity、bytes、`ACTIVE` stateをdurableに持つ。同時active revisionは1とし、success / terminal failureで`CLOSED` eventをappendする。startupはsame revisionをresumeし、別revisionを開始しない。owner process-start identityがliveでないと検証した明示abortだけが`ABORTED`で解放できる。

別fixture、parallel attempts、workers増加、deployment target追加は別contract decisionとする。

## Verification

attempt 1/2 accept、0/3 reject、second active revision reject、crash後same-revision resume、live owner abort拒否 / stale owner abort、failure後new revision保持、cross-revision artifact拒否を検査する。active worktree / reservation / TLC process各1を合否とする。
