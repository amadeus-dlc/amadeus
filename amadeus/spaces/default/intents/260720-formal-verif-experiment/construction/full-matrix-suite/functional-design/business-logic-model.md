# Business Logic Model — full-matrix-suite

## 上流契約と依存状態

本Unitは、`unit-of-work.md` のfull-matrix-suite責務、`unit-of-work-story-map.md` のS-3/S-6/S-8、`requirements.md` のFR-4/FR-5/FR-9・NFR-1/NFR-2、`components.md` のCell Runner / Evidence Store、`component-methods.md` のcanonical input / benchmark methods、`services.md` の`benchmark` lifecycleを、両arm共通のfull matrix測定へ落とす。manifest生成、promotion判断、arm oracle、eligibility、winner、report表現は所有しない。

本UnitはU1 provenance、U2 promoted manifest、U3 evidence、U4 Arm T、U6 Arm Sをconsumeし、U5 skeleton passをfan-out preconditionにする。U3/U4/U5はE-FVEU3FD1/U4FD1/U5FD1によりmax-exhausted後是正の第三review未実施でREADYではない。U6はreviewer READYだが、最終FD人間裁定前にmatrix integration readiness、benchmark completion、code-generation可を主張しない。

## Preconditions and canonical input

開始時に次を同じsnapshotへ固定する。

1. U1 stateが`SKELETON_PASSED`後で、T/S両方のfreeze events、actual input manifest / forbidden path receiptsがvalid。
2. U2 promotion transactionのpermission claim、manifest identity、D-COUNTが7または5、ordered entries全件のproof / branch / scan / seal identitiesがvalid。
3. U3 runner / evidence schema、U4 TLA model / jar / JDK、U6 universe / PBT / Bun / fast-checkのfreeze identitiesが一致。
4. 同一healthy baseline、同一runner class、同一resource profile、network-off run policy、empty output revisionを使用する。

canonical subjectsは`HEALTHY_BASELINE`をindex 0に固定し、manifest `orderedEntries`のaliasをindex 1..D-COUNTへそのまま続ける。再sort、filesystem order、arm別orderを禁止する。schema version、baseline SHA、manifest identity、ordered subject / injection tree identitiesをcanonical hashして`InputSetIdentity`を作る。D-COUNT=7なら8 subjects、5なら6 subjectsで、それ以外を拒否する。

## Measurement schedule and execution

scheduleはarm / sample / run / orderを事前に固定しidentity化する。`firstArm`は`SHA-256(inputSetIdentity || "suite-order-v1")`の最下位bitが0ならT、1ならSとし、人間が有利なarmを先行指定できない。warmupは`opposite(firstArm) -> firstArm`の1回ずつ、その後measuredはodd runを`firstArm -> opposite`、even runを逆順にする。5 measuredでは先行回数が3対2となり完全対称ではないため、その残存偏りを明示し、各suiteのfirst / second position別raw durationを保存する。core比較値の5-run medianを順序補正・重み付けせず、scheduleと順序別raw値をU8へ渡す。scheduleを測定開始後に変更しない。

全12 suite entry（warmup 2 + measured 10）へglobal ordinal 0..11とentry identityを割り当てる。suite開始前にappend-only schedule ledgerへ`SuiteStartReceipt`を記録し、schedule ID、ordinal、entry identity、arm / sample key、expected predecessor receiptを結ぶ。ordinal 0以外は直前receiptがcommit済みの場合だけ開始する。validatorはschedule entriesとstart receiptsのbijection、strict ordinal、predecessor chain、arm / sample一致を検査し、欠落・重複・順序違反をmatrix findingにする。

1 suiteは1 armへ全subjectsをserial適用し、suite開始から最終cell evidence atomic flushまでをmonotonic clockで測る。timeoutはsuite単位120秒で、各cellは残時間をdeadlineとする。`HARNESS_ERROR` cellもexpected keyを満たすraw resultとして保存し、残時間があれば後続subjectを継続する。suite timeoutで未起動cellがあればU3 `IncompleteSuite`へmissing keysとtimeout findingを残す。

expected execution countはD-COUNT=7なら`2 arms × 8 subjects × 6 suites = 96 cells`、D-COUNT=5なら`2 × 6 × 6 = 72 cells`である。warmup keysは`WARMUP/0`、measured keysは`MEASURED/1..5`とし衝突させない。各keyはrunner/store両ledgerのverified receiptとexactly one bundleを持つ。filesystem上のorphan / handwritten bundleを採用しない。

U3 matrix validatorでmanifest、input set、arm / freeze / baseline、runner class、sample key、ordered subjects、bundle identitiesを再検証する。missing、duplicate、unknown、identity / chain / input hash driftをtyped incomplete findingにする。5 measured runsの対応cell verdict / counterexample identityが一致しない場合はnon-deterministic findingとし、medianやeligibility入力を成立させない。

## Cost measurement

`ARM_AUTHORED_LOC`は各arm freeze commitと共通baselineの`git diff --numstat`をarm-owned source / test / config allowlistへ限定し、additions + deletionsを合計する。binary `-`、rename ambiguity、allowlist外path、shared harness pathを拒否する。共通schema / runner / Registry / reportは`SHARED_LOC`として別計上し、armへ按分しない。依存 / config file countsもarm-owned / sharedを分ける。

authoring elapsedはU1の対応する`ARM_AUTHORING_STARTED`と`ARM_FROZEN`のCoordinator UTC差を使う。event identity、arm / author / worktree / public input hash連続性を検証し、commit timestampや会話時刻を使わない。負値、時刻形式 / order不正はcost resultを作らない。

suite durationはarmごとに5 measured suiteが全て`CompleteMeasuredSuite`で、各suiteが全subject flushまで完了し、schedule receiptsがvalidな場合だけ昇順sortしてindex 2をmedianとする。raw order、sorted order、median source run、first / second positionを保存する。timeout / missing / incomplete suiteのpartial elapsedはraw trace専用で、median inputへ含めず`IncompleteTimingAggregate`を返して比較指標を生成しない。one-time dependency preparationは両armともsuite timer外とし、TLC acquisition / verification、Bun dependency verificationをarm別preparation raw costとして併記する。除外規則identityを両armへ同じく適用し、取得失敗はcost優位へせず`HARNESS_ERROR`として残す。

## Matrix and raw output

`FullMatrixEvidence`はinput set、schedule、warmup / measured suites、cell bundles、completeness result、raw cost、derived medianをcontent-addressed refsで結ぶ。raw evidenceを書換えず、derived artifactはsource identitiesとalgorithm versionを持つ。complete / incomplete、DETECTED / NOT_DETECTED / HARNESS_ERRORを保持し、U7はeligibilityを決定しない。

同じraw inputsからmatrix key set、verdict agreement、LOC、elapsed、medianを再計算し、derived identity一致を検証する。report rowは後続U8がcommand / CI / artifactへ辿るためのtrace refsを受け取るが、U7は表示や採否文を作らない。

## Failure flowとtest境界

precondition、schedule、suite、matrix、LOC、elapsed、cost errorはclosed discriminatorとsource identityを保持する。missing cellを`NOT_DETECTED`へ、timeoutを遅いdurationだけへ、HARNESS_ERRORをfalse negativeへ丸めない。

testsはD-COUNT 7/5 count、baseline-first / alias order、hash-derived firstArm、3対2偏りの明示、warmup順、schedule ordinal / predecessor欠損・重複・順序違反、warmup / measured key非衝突、120秒suite timeout、HARNESS_ERROR後続継続、missing / duplicate / handwritten bundle、input / runner drift、verdict disagreement、binary / shared LOC混入、event elapsed drift、complete 5-value median、不完全suite median禁止、preparation exclusion symmetry、U3/U4/U5未裁定でのcompletion主張を検証する。
