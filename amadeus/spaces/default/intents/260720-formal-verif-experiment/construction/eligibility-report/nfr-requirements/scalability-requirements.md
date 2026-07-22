# Scalability Requirements — eligibility-report

## Closed capacity

`business-logic-model.md` の2-arm decision、`business-rules.md` のclosed outcome / report、`requirements.md` のfixed experiment、`technology-stack.md` のsingle-process CLIに従う。容量単位は`revisionId + FullMatrixEvidenceId + evaluationAlgorithmVersion`である。

## Cardinality model

- arms=2、cells=96または72、cost axes=3、FinalDecision variants=4、Alloy assessment=1、report outputs=JSON 1 + Markdown 1に固定する。
- trace rowsは256以下、reversal mappingsは正本condition countとexact equality、handler bindingsはclosed command countとexact equalityを要求する。
- evaluation / report active processは1で、raw evidenceをaggregate outputへ複製しない。

## Multi-revision lifecycle

matrix / runtime / algorithm / report schema変更は新revisionとし、旧decision / report / traceをappend-only保持する。開始前に32 MiB output + staging copy + 1 GiB reserveをU8 report store lock下でdurable reservationする。

claimはrevision manifest identity、`FullMatrixEvidenceId`、evaluation algorithm version、report / trace schema identities、capacity reservation identity、owner session / process-start identityへbindした`ACTIVE -> RESUMED* -> CLOSED | ABORTED` ledgerである。live owner競合を拒否し、non-live確認後のatomic ownership transferだけresumeを許す。transfer後はtrusted publisherが全bound identitiesとreserved bytesを正本から再読し、完全一致しない場合はresumeせずABORTEDへ閉じる。

## Verification

72 / 96 accept、71 / 73 / 95 / 97 reject、trace 256 accept / 257 reject、2 revision分離、claim競合 / resume、matrix / algorithm / schema / reservation cross-revision drift拒否を検査する。third arm、5th decision variant、dynamic handler追加を0件とする。
