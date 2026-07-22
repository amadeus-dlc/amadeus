# Business Logic Model — eligibility-report

## 上流契約と依存状態

本Unitは、`unit-of-work.md` のU8責務、`unit-of-work-story-map.md` のS-3/S-7/S-8、`requirements.md` のFR-4/FR-6/FR-7/FR-9・NFR-2/NFR-4、`components.md` のEligibility & Pareto Evaluator / Report Renderer、`component-methods.md` の`evaluate` / `report`契約、`services.md` の同名command lifecycleを、閉じた判定と再現可能なreportへ落とす。raw evidence、arm oracle、matrix、costを生成または書換えない。

U3/U4/U5はE-FVEU3FD1/U4FD1/U5FD1によりmax-exhausted後是正の第三review未実施でREADYではない。U7はiteration 2でREADY判定を得たが、`Schedule.compile`入力への明示的`InputSetIdentity`と`IncompleteSuite`へのschedule binding不足というMajor 2件が残存する。したがって本設計はこれらを解消済みと扱わず、最終FD人間裁定前にintegration readiness、walking-skeleton completion、report completion、code-generation可を主張しない。

## Evaluation input validation

EvaluatorはU7の`FullMatrixEvidence`、両armのfreeze / authoring provenance、U2のpromoted manifest、U3のcommand / CI / artifact refsをimmutable inputとして受け取る。最初にschema / algorithm version、D-COUNT、input set、baseline、schedule、arm freeze、runner、manifest、source ref、derived identityを再計算する。

U7 `CompleteMatrix`に加え、expected key / bundle / identity / chain / input / repeat agreementが全てvalidで、incomplete findingがverified expected cellの`HARNESS_ERROR_CELL`だけである場合を`StructurallyCompleteHarnessMatrix`へ正規化する。それ以外のmissing / duplicate / timeout / corruption / drift / disagreement / trace破損は`EvaluationFailure`を返す。missing cellを`NOT_DETECTED`へ、壊れたtraceを不適格へ丸めない。`FinalDecision`はこの構造検証を通ったevidenceに対してだけ生成する。

## Hard eligibility

armごとに全measured runの全D-COUNT defect cellsが`DETECTED`で一致し、`HARNESS_ERROR`が0件、healthy baselineが全runで`NOT_DETECTED`である場合だけ`ELIGIBLE`とする。defectの`NOT_DETECTED`、verified expected cellの`HARNESS_ERROR`、baselineの`DETECTED`はそれぞれreason code付き`INELIGIBLE`とする。baseline `HARNESS_ERROR`はfalse positiveへ数えずharness failureとする。

構造検証後、costに先行して両armをclassifyする。一方だけeligibleならそのarmをcandidateとし、両方ineligibleなら`BOTH_INELIGIBLE`とする。この2経路ではPareto costの欠損をdecision failureにしない。両方eligibleの場合だけ3軸costのidentity / completenessを検証し、欠損時は`EvaluationFailure`、成立時だけParetoへ進む。

## Closed Pareto decision

比較tupleは`(ARM_AUTHORED_LOC, authoringElapsedMs, suiteMedianMs)`で、全軸は小さいほど良い。arm AがBの全軸で以下かつ1軸以上で小さい場合だけAがBをdominateする。

- TだけがSをdominateする: `ARM_T_CANDIDATE`
- SだけがTをdominateする: `ARM_S_CANDIDATE`
- 相互trade-offまたは3軸完全同値: `BOTH_ELIGIBLE_NO_WINNER`
- weighted sum、単位換算、tie-break、SHARED_LOC按分は禁止する。

同じcanonical evaluation inputとalgorithm versionからdecision payloadを再計算し、content identity一致を要求する。

## Alloy trigger

valid matrixのdefect cellに`NOT_DETECTED`が1件以上あれば、alias / contract class / armをmiss registryへ列挙する。両armが同じcontract classを取りこぼした場合だけcommon blind spotとして別表へ載せ、`SEPARATE_DECISION_REQUIRED`を返す。0件なら`NOT_TRIGGERED`である。Alloy armの作成、実装、比較、現intentへの自動追加は行わない。

## Reproducible report and trace verification

Report modelはdefect registry、branch / commit対応、T/S freeze provenance、input / schedule identity、全cell matrix、healthy baseline、raw / aggregate cost、eligibility reasons、Pareto relation、FinalDecision、Alloy triggerをcanonical JSONへまとめ、同じdataからMarkdownをrenderする。さらに6体グリリング正本のidentityと、正本に存在する翻意条件のordinal / text hashを全数取り込み、各条件を非空の`SUPPORTS / REFUTES`実測cell refsへ対応付ける。正本条件とのbijectionを要求し、未対応条件と正本にない創作条件を拒否する。各matrix / cost / decision / 翻意条件mapping行はsource command receipt、CI run / job、artifact / evidence bundleへ辿れる。

`TraceVerifier`はreport rowとsource refsのbijection、content hash、arm / subject / sample / run、freeze / input / schedule continuityを再検証する。rendererはEvaluator出力を表示するだけでeligibilityやParetoを再計算しない。検証失敗時はreportをpublishせず`ReportFailure`を返す。

## Wiring-only final root

`final-cli-root`はU1 dispatcher portsと、U1 Coordinator / provenance、Registry、Evidence、TLA toolchain、skeleton gate、TS arm、matrix、evaluate、reportのconcrete handlersをdirect importして一度ずつinjectする。`authoring-start` / `freeze`はU1 Coordinator / provenance bindingが所有する。rootはhandler登録、runtime adapter、exit propagationだけを所有し、eligibility / Pareto / Alloy / report表示を実装しない。

独立wiring testはclosed command unionの全commandがexactly one handlerへ結線されること、重複 / 欠落 / accidental fallbackが拒否されること、handler error / exit codeが変更されず伝播することを検証する。U1〜U7の設計成立と最終FD人間裁定前はrootを`DESIGNED_BLOCKED`とし、完成扱いしない。

## Test boundary

testsはcomplete / HARNESS-only structurally complete / structurally incomplete evidence、defect miss、HARNESS_ERROR、baseline false positive、片方eligible時のcost不要、両方ineligible時のcost不要、両方eligible時のcost必須、T/S dominance、trade-off、完全同値、trace破損、Alloy miss / common blind spot、翻意条件mappingの全数 / 非空 / 非創作、同一input再計算、renderer非再実装、U1 Coordinatorを含む全handler一意配線、error propagation、未解決依存での完成主張禁止を固定fixtureで検証する。
