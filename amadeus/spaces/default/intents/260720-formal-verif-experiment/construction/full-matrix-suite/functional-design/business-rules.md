# Business Rules — full-matrix-suite

## Traceability

以下は`unit-of-work.md` のU7完成条件、`unit-of-work-story-map.md` のS-3/S-6/S-8、`requirements.md` のFR-4/FR-5/FR-9・NFR-1/NFR-2、`components.md` のRunner / Evidence境界、`component-methods.md` のbenchmark契約、`services.md` のfull-suite lifecycleを具体化する。

| Rule | Requirement / scenario |
| --- | --- |
| BR-01〜06 | FR-4/FR-5、S-3/S-6 |
| BR-07〜13 | FR-4、NFR-1/NFR-2、S-3/S-6 |
| BR-14〜19 | FR-5、S-6/S-8 |
| BR-20〜23 | Unit / unresolved dependency境界 |

## Input / schedule規則

- **BR-01 Fan-out precondition:** skeleton pass、両freeze、promoted manifest、closed D-COUNT、runner / arm identitiesがvalidな場合だけ開始する。
- **BR-02 Canonical subjects:** baselineを先頭、manifest alias順を後続とし、再sortやarm別順序を禁止する。
- **BR-03 Closed count:** D-COUNT 7なら8 subjects / 96 total cells、5なら6 subjects / 72 total cellsだけを許す。
- **BR-04 Same conditions:** 両armでbaseline、input set、runner class、resource profile、network policyを一致させる。
- **BR-05 Fixed schedule:** input set hashからfirstArmを決め、warmupはopposite→first、measured oddはfirst→opposite / evenは逆とする。5回の3対2残存偏りとposition別raw値を明示し、開始後に変更・補正しない。
- **BR-06 Serial suite:** arm内subjectをcanonical順でserial実行し、parallel cellを許さない。

## Execution / matrix規則

- **BR-07 Suite deadline:** suite全体を120秒とし、cell deadlineは残時間以下とする。
- **BR-08 Complete duration:** suite開始から最終cell evidence flushまたはtimeout確定までを測る。
- **BR-09 HARNESS_ERROR preservation:** expected cellのHARNESS_ERRORを保存し、残時間中は後続subjectを継続する。
- **BR-10 Exact cell keys:** 12 suite entriesをschedule ID / global ordinal / predecessor chainへbindしたstart receiptと、sample / arm / subjectごとのverified exactly one bundleを要求する。
- **BR-11 No implicit evidence:** orphan / handwritten / chain未検証bundleをmatrixへ採用しない。
- **BR-12 No drift:** baseline / freeze / manifest / input set / runner / subject order driftを拒否する。
- **BR-13 Repeat agreement:** measured 5 runsの対応cell verdict / counterexampleが一致しなければcomplete比較を成立させない。

## Cost規則

- **BR-14 Owned LOC:** baseline→freezeのnumstat additions+deletionsをarm-owned source / test / configだけで合計する。
- **BR-15 Shared separation:** shared harness / schema / configをSHARED_LOCとして別掲しarmへ按分しない。
- **BR-16 Event elapsed:** Coordinatorのstart / freeze UTC event差だけをauthoring elapsedとする。
- **BR-17 Five complete median:** armのmeasured 5 suiteが全てcompleteかつschedule-validな場合だけsort後index 2を代表値とする。warmup / timeout / partial elapsedを含めず、不完全ならmedianを生成しない。
- **BR-18 Raw preservation:** unsorted / sorted durations、median source、LOC rows、event refs、preparation costsを保存する。
- **BR-19 Symmetric exclusion:** one-time preparationを両armともsuite timer外にし、除外前raw costをarm別に併記する。

## Boundary / unresolved規則

- **BR-20 No eligibility:** U7はhard gate、Pareto、winner、Alloy triggerを計算しない。
- **BR-21 No raw mutation:** derived matrix / costはraw identityを参照し、raw bundleを書換えない。
- **BR-22 Unresolved propagation:** U3/U4/U5のmax-exhausted / 第三review未実施を保持し、各UnitをREADYへ読み替えない。
- **BR-23 No completion claim:** 最終FD人間裁定前にmatrix integration readiness、benchmark completion、code-generation可を主張しない。

## Negative scenarios

manifest件数 / order drift、baseline非先頭、arm別input、firstArm hash drift、3対2偏り隠蔽、schedule ordinal / predecessor欠損・重複・順序違反、sample key衝突、suite timeout、HARNESS_ERROR後停止、missing / duplicate / handwritten / orphan cell、runner / input drift、verdict非一致、binary / shared LOC混入、commit時刻elapsed、warmup / partial median混入、preparation非対称除外、未裁定依存での完成主張をred fixtureとして固定する。
