# Business Rules — ts-arm

## Traceability

以下は`unit-of-work.md` のU6完成条件、`unit-of-work-story-map.md` のS-2/S-3/S-5/S-6/S-8、`requirements.md` のFR-3/FR-4・NFR-1/NFR-4、`components.md` のArm S境界、`component-methods.md` のTS adapter、`services.md` のblind lifecycleを具体化する。

| Rule | Requirement / scenario |
| --- | --- |
| BR-01〜07 | FR-3/FR-4、S-3/S-5 |
| BR-08〜13 | FR-3、NFR-4、S-2/S-5 |
| BR-14〜19 | FR-4、NFR-1、S-3/S-6 |
| BR-20〜23 | Blind / Unit境界、E-FVEU3FD1 |

## Universe規則

- **BR-01 Closed axes:** 7 ordered axesと各value setをdescriptorに固定し、unknown axis / valueを拒否する。
- **BR-02 Exact cardinality:** direct productは5760 tuplesで、BigInt product、iterator count、unique key countが一致する。
- **BR-03 Round-trip:** index→tuple→indexが0..5759の全indexで恒等となる。
- **BR-04 Complete histogram:** 各axis valueの出現countが他axis cardinality productと一致する。
- **BR-05 Projection visible:** ORIGINALでref payloadを省略してもcoverage keyにref projection classを保持し、tuple重複を隠さない。
- **BR-06 Stateful ref:** ACCEPTED_REFは同一voterの実在accepted original、UNKNOWN_REFはledgerに不存在のrefだけを生成する。
- **BR-07 No partial success:** core 5760に加え、unknown election / voter / choice / timestamp precedenceの2×4×4×5=160 validation cellsを全数検証する。どちらかのmissing / duplicate / order / cardinality driftがあればarm runを開始しない。

## Timestamp / contract規則

- **BR-08 Separate brands:** SubmittedAtとReceivedAtはconstructor / parser / brandが別で、castやshared string aliasを許さない。T0/T1/T2を`2026-07-20T00:00:00/01/02Z`、invalid format / dateを固定raw bytesへ写像しdescriptor identityへ含める。
- **BR-09 Resolution axis:** per-voter resolutionはSubmittedAt最大・同値later arrivalだけを使い、ReceivedAtを読まない。
- **BR-10 Lateness axis:** latenessはReceivedAt > tally ReceivedAtだけを使い、SubmittedAtを読まない。
- **BR-11 Compile negative:** 両brandの逆接続fixtureはtype-check failureを必須とする。
- **BR-12 Error precedence:** 160-cell matrixでunknown election→unknown voter→unknown choice→invalid timestampの順を固定し、複数invalid入力でも最初のerrorとstate不変を検証する。
- **BR-13 Seven properties:** choice winner、unknown choice、receivedAt、invalid timestamp、amend、unknown ref、per-voter resolutionを独立property IDで記録する。

## Exhaustive / PBT規則

- **BR-14 Exhaustive first:** core 5760 tuplesとvalidation 160 cellsのobservation / coverage proofが揃ってからPBT completionを評価する。
- **BR-15 Fixed PBT:** fast-check 4.9.0、seed 20260720、100 runs、max 8 actionsを固定する。TALLYはexactly one、accepted後、RECORD_HOLDはhold tally後最大1とする。
- **BR-16 Shared generator:** arbitraryはuniverse descriptorからだけ生成し、別の隠れたdomainを持たない。
- **BR-17 Reproducible shrink:** property failureはminimal sequence、seed、run index、shrink pathを保存し再実行一致させる。
- **BR-18 Verdict proof:** reproducible exhaustive / property counterexampleだけを`DETECTED`、全coverage+PBT greenだけを`NOT_DETECTED`とする。
- **BR-19 Harness error:** import、tool、schema、coverage、shrink replay failureを`HARNESS_ERROR`とし、他verdictへ丸めない。

## Blind / boundary規則

- **BR-20 Blind allowlist:** freeze前入力はbaseline、public contract、universe、seed、Bun / fast-check versionsだけとする。
- **BR-21 Forbidden zero:** Arm T path、U5 evidence、fixture ID / branch / patch / expectation、sealed detailをactual input / forbidden scanで0件とする。
- **BR-22 No foreign ownership:** U6はTLA、Registry、Evidence Store、eligibility、reportを実装しない。
- **BR-23 U3 unresolved:** E-FVEU3FD1のmax-exhausted / 第三review未実施を保持し、最終FD裁定前にU3 READYやintegration readinessを主張しない。

## Negative scenarios

axis欠損 / 重複 / order drift、5760 / 160不一致、unknown election/voter precedence欠落、index round-trip failure、projection collapse、token mapping drift、brand cast / cross-wire、received/submitted axis swap、unknown ref受理、TALLY欠損 / 重複 / 位置違反、GoA hold precedence、resolution tie drift、winner tie誤確定、PBT seed / version drift、shrink再現失敗、blind forbidden input、U3未裁定でのintegration完成主張をred fixtureとして固定する。
