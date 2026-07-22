# Business Logic Model — ts-arm

## 上流契約と依存状態

本Unitは、`unit-of-work.md` のts-arm責務、`unit-of-work-story-map.md` のS-2/S-3/S-5/S-6/S-8、`requirements.md` のFR-3/FR-4・NFR-1/NFR-4、`components.md` のArm S Adapter、`component-methods.md` のTS prepare / run / normalize、`services.md` のlocal Bun lifecycleを、blindで独立した決定論的判定器へ落とす。TLA implementation、skeleton evidence、fixture identity / 期待値、eligibility、winnerを知らない。

Arm SはU1 public contractとU3 execution/evidence portをconsumeする。U3はE-FVEU3FD1によりreviewer max-exhausted後是正の第三review未実施でREADYではない。本設計はU3 public portへの出力形だけを定義し、最終FD人間裁定前にintegration readinessやcode-generation可を主張しない。U4/U5の成果物はArm S inputへ含めない。

## Closed universe and direct-product proof

public universe descriptorは次のordered axesを持つ。

| Axis | Ordered values |
| --- | --- |
| voter | `V1, V2, V3` |
| choice input | `C1, C2, C3, UNKNOWN_CHOICE` |
| submitted token | `T0, T1, T2, INVALID_FORMAT, INVALID_DATE` |
| received token | `T0, T1, T2` |
| ballot kind | `ORIGINAL, AMEND` |
| ref class | `ACCEPTED_REF, UNKNOWN_REF` |
| GoA | `1..8` |

axis順と各value順をidentityへ含め、core expected cardinalityを`3 × 4 × 5 × 3 × 2 × 2 × 8 = 5760`としてBigIntで計算する。mixed-radix iteratorはindex 0..5759を各axis tupleへ一意にdecodeし、tupleをcanonical keyへencodeし直したindexが元と一致することを検証する。全tupleのunique key set、axis histogram、first / last key、rolling content hashを`CoreUniverseCoverageProof`へ記録する。

identity error precedenceは別のclosed validation matrixで完全化する。axesはelection input `{VALID_ELECTION, UNKNOWN_ELECTION}`、voter input `{V1,V2,V3,UNKNOWN_VOTER}`、choice input 4件、submitted token 5件で、`2 × 4 × 4 × 5 = 160` cellsである。各cellは`UNKNOWN_ELECTION -> UNKNOWN_VOTER -> UNKNOWN_CHOICE -> INVALID_TIMESTAMP`の最初のerrorとledger / budget不変を検査する。`ValidationMatrixProof`は160 unique cells、各error class count、precedence pair coverageを持つ。core 5760とvalidation 160の両proofが揃わない場合はrun completionを評価しない。

ref classはstateful adapterで具体化する。`ACCEPTED_REF`は同一voterへ先に受理したoriginalのrefを生成し、`UNKNOWN_REF`はaccepted ledgerに存在しないcanonical refを生成する。ORIGINALではref classを判定入力として保持するがruntime payloadへrefを付けず、AMENDだけに適用する。この差をexpected tuple projectionへ記録し、異なるtupleが同じruntime payloadへ射影される場合もprojection classを含むcoverage keyで重複を隠さない。

## Timestamp brands and adapter boundary

`SubmittedAt`と`ReceivedAt`はconstructor非公開の別opaque brandである。universe descriptorはtoken mappingを固定する: `T0=2026-07-20T00:00:00Z`、`T1=2026-07-20T00:00:01Z`、`T2=2026-07-20T00:00:02Z`、`INVALID_FORMAT=__INVALID_FORMAT__`、`INVALID_DATE=2026-02-30T00:00:00Z`。Submitted parserはsecond-precision UTC `Z`の実在時刻だけを成功させ、invalid tokensは上記raw bytesのままvalidation propertyへ渡す。Received mintはCoordinator test portがT0/T1/T2の固定UTCだけからbrandを生成する。token mapping identityをtuple / replay identityへ含める。

APIは`resolvePerVoter(ballots: SubmittedBallot[])`だけがSubmittedAtを比較し、`classifyLate(tallyAt: ReceivedAt, receivedAt: ReceivedAt, ballot)`だけがReceivedAtを比較する。brand cast、shared alias、string比較helperの共用を禁止する。compile-time negative fixtureはSubmittedAtをlateness引数へ、ReceivedAtをresolution keyへ渡すコードがtype-check failureになることを固定する。

runtime propertyは、submittedAtを早くしてreceivedAtを遅くしたballotがlate、submittedAtを遅くしてreceivedAtを早くしたballotがon-timeであることを検証する。一方per-voter resolutionはreceivedAtに依存せず、submittedAt最大・同値時later arrivalを選ぶ。

## Exhaustive and property execution

各direct-product tupleはfrozen subject moduleに対してvalidation / append / resolve / tally adapterを実行する。期待契約はpublic error precedence `unknown election/voter/choice -> invalid timestamp -> GoA/reservation`と、amend store boundaryのunknown-ref rejectionであり、fixture固有期待値を持たない。次の7 property classへobservationを分類する。

1. choice winnerはresolved ballots上でGoA hold precedenceを通過した後、non-abstain ballotsの`choiceInternalNo` unique argmaxで、top同数はtie hold。
2. unknown choiceはledger / budgets不変でreject。
3. latenessはreceivedAtだけで`receivedAt > tallyAt`。
4. invalid submitted timestampはledger / budgets不変でreject。
5. valid amendはrefを保存して1件appendし、amend budgetだけ消費。
6. unknown refはledger / budget不変でreject。
7. per-voter resolutionはsubmittedAt最大、同値はlater arrival、voterごとに高々1件。

single-step core 5760 tuplesとidentity validation 160 cellsに加え、fast-check 4.9.0をseed `20260720`、`numRuns=100`で実行する。action unionは`SUBMIT_ORIGINAL / SUBMIT_AMEND / TALLY / RECORD_HOLD`である。voter別initial最大3件合計、amend最大3件合計、TALLY exactly one、tally outcomeがholdの場合だけRECORD_HOLD最大1件なのでclosed max sequence lengthは8である。TALLYは少なくとも1 accepted ballot後の位置1..6に置き、残budgetのsubmissionはtally後にも生成してreceivedAt latenessを検査する。RECORD_HOLDはtally後だけに置く。arbitraryは同じuniverse / validation descriptorsからだけ値を生成し、unknown extra valueを作らない。

TALLYはper-voter resolved集合について`blocks=count(goa=8)`、`discuss=count(goa=5)`、`favor=count(goa∈{1,2,3,6})`、`against=count(goa∈{7,8})`を計算し、block、discussion-needed、quorum-short (`favor+against=0`) の順にholdする。通過後の`Eligible={b | b.goa≠4}`でchoice countを作り、unique topをwinner、top同数をtie holdとする。propertiesはaction sequenceごとのledger append-only、error precedence、resolution idempotence、hold precedence、winner shuffle invariance、two-clock separationを検証する。

failureはfast-checkのcanonical shrink pathを完走し、seed、run index、shrink path、minimal action sequence、property ID、expected / actual observationを保存する。同じinputで同じminimal counterexample identityを再実行確認する。exhaustive cell failureまたはreproducible property failureを`DETECTED`、core 5760 proof、validation 160 proof、100 property runsが全greenの場合だけ`NOT_DETECTED`とする。runner / import / schema / coverage / shrink replay failureは`HARNESS_ERROR`であり検出へ丸めない。

## Blind freeze and evidence handoff

freeze input manifestはhealthy baseline、public contract、universe descriptor、seed / run constants、Bun / fast-check versionsだけを許す。Arm T path、U5 skeleton evidence、fixture ID / branch / patch /期待failure、sealed detailが0件であることをactual input manifest / forbidden path scan receiptで証明する。

freeze後、subject aliasとinjection checkoutはCoordinatorから初めて渡される。run manifestはArm S freeze SHA、subject tree、universe / seed / tool identitiesを固定する。raw exhaustive coverage、property runs、counterexample / completion proofをU3へ渡すが、U3未READYのため最終FD裁定前にintegration完成を主張しない。

## Failure flowとtest境界

universe、brand、adapter、property、normalization errorはclosed discriminatorとinput / tool identityを保持する。fast-check failureを再現できない場合やuniverse proof欠損を`NOT_DETECTED`へしない。

unit testsは5760 core cardinality、160 validation cardinality、unknown election/voter複合invalid precedence、mixed-radix round-trip、duplicate projection、token mapping drift、brand cross-wire type failure、received/submitted axis swap、unknown ref、TALLY位置 / max length、GoA block/discussion/quorum/tie、resolution tie、fixed-seed replay、shrink identity、blind forbidden pathを検証する。U3最終gate前はport integration readinessを主張しない。
