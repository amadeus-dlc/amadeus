# Business Rules — tla-invalid-timestamp-skeleton

## Traceability

以下は`unit-of-work.md` のU5完成条件、`unit-of-work-story-map.md` のS-2/S-4/S-8、`requirements.md` のFR-3/FR-8・NFR-1/NFR-2、`components.md` のblind state machine、`component-methods.md` のTLC / evidence methods、`services.md` の中央順序を具体化する。

| Rule | Requirement / scenario |
| --- | --- |
| BR-01〜06 | FR-3/FR-8、S-2/S-4 |
| BR-07〜13 | FR-4/FR-8、NFR-1、S-4 |
| BR-14〜18 | FR-8、NFR-2、S-8 |
| BR-19〜23 | Unit境界、E-FVEU3FD1/U4FD1 |

## Preconditions / disclosure規則

- **BR-01 Frozen T only:** U1 stateが`T_FROZEN`で、Arm T freeze / input proofが一致する場合だけ開始する。
- **BR-02 #1252 only:** U2のindependent proof / branch / scan / sealがvalidな#1252 opaque aliasだけを開示する。
- **BR-03 No early copy:** DisclosureEventとtarget-bound grantのatomic commit前にpayloadをworktreeへmaterializeしない。
- **BR-04 Identity continuity:** CompositionHead / resulting commit / tree、freeze、injection、model、jar、JDK、profile、subject identitiesをprecondition snapshotから全runへ固定し、起動直前にHEAD / tree / cleanを再検証する。
- **BR-05 Fresh evidence:** 新しいskeleton run identityへappendし、既存bundleを上書き・再利用しない。
- **BR-06 No extra handler:** dedicated harnessにArm S、残fixture、promotion、benchmark、evaluate、report handlerを登録しない。

## Execution / verdict規則

- **BR-07 Two serial runs:** 同じfrozen inputを別run numberで2回serial実行する。
- **BR-08 Detected proof:** named `InvalidTimestampRejected` violation、完全trace、valid U3 receiptが揃う場合だけ各runを`DETECTED`とする。
- **BR-09 Replay equality:** 2 runのverdict、counterexample、model / subject / tool identitiesが完全一致する。
- **BR-10 No exit inference:** non-zero exitや既存regression redだけから`DETECTED`を作らない。
- **BR-11 Fail-closed result:** `NOT_DETECTED`、`HARNESS_ERROR`、timeout、parse / store / chain failureをpassへ丸めない。
- **BR-12 Raw preservation:** composition / HEAD / tree-bound process receipt、argv、stdout / stderr、exit、duration、CellResult、bundle / ledger identitiesをrunごとに保存する。
- **BR-13 No benchmark substitution:** skeleton 2-run replayを後続1 warmup + 5 measured benchmarkのsampleへ流用しない。

## CI / transition規則

- **BR-14 Same composition CI:** baselineへArm T owned diff、次に#1252 allowed patchをoverlayした専用resulting commitをlocal / CIの単一headとし、base / source SHAs / intermediate treesを記録する。
- **BR-15 Complete trace:** freeze、reveal / materialization、composition head、branch / injection、local 2 bundles、CI artifact 2 rows、CI run、summaryを双方向に辿れる。CI rowsはexpected run 1/2とのbijectionを持つ。
- **BR-16 Pass all-or-nothing:** CI receiptを含まないexecution manifestへCIをbindし、receipt検証後のfinal summaryで閉じる。全条件validな場合だけtransaction ID付き`SkeletonPassed`をappendする。
- **BR-17 Explicit failure:** precondition / disclosure / verdict / determinism / evidence / CI / traceの確定的不成立だけがverified partial evidence付き`SkeletonFailed`を生成できる。transport / head conflict / lookup / corruptionは外部commit errorで、failure eventをmintしない。
- **BR-18 Stop after failure:** failure event後のArm S start、残fixture reveal、promotion、benchmark event countを0件とする。

## Boundary / unresolved dependency規則

- **BR-19 Dedicated harness:** U5は専用composition rootだけを持ち、U8 final rootやfull handler registryを実装しない。
- **BR-20 No fan-out:** pass後もArm S start / 残fixture実行を自動開始せずpermissionだけ返す。
- **BR-21 U3 unresolved:** E-FVEU3FD1のmax-exhausted / 第三review未実施を保持し、U3 READYやintegration readinessを主張しない。
- **BR-22 U4 unresolved:** E-FVEU4FD1のmax-exhausted / 第三review未実施とU3依存を保持し、U4 READYを主張しない。
- **BR-23 No completion before gate:** U3/U4を含む最終FD人間裁定前にwalking-skeleton completionやcode-generation可を報告しない。

## Negative scenarios

wrong freeze / injection / model SHA、overlay順 / resulting tree drift、freeze前copy、別worktree grant、#1252以外の開示、evidence overwrite、2 run drift、NOT_DETECTED / HARNESS_ERROR、counterexample欠損、CI head / artifact mismatch、identity循環、pass append応答喪失、pass-fail二重outcome、trace欠損、failure後transition、U3/U4未裁定での完成主張をred fixtureとして固定する。
