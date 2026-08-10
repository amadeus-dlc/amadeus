# Code Generation Plan — population-interval-accounting

## 方針

U-03 は U-01 の domain contract だけへ依存する pure interval algebra と population accounting library である。half-open integer-second interval、same intent/stage window matching、intent別idle subtraction、candidate disposition、category/global union、window/population invariant transactionだけを所有する。event field解釈、candidate decode、statistics、outlier、renderer、filesystem、process、generated surfaceは変更しない。User Stories stage は scope 上生成されていないため、`requirements.md`、`unit-of-work.md`、Functional Design、NFR Design へ代替 trace する。Depth は Standard、Test Strategy は Comprehensive である。

## 実装チェックリスト

- [x] Step 1: `amadeus-stage-attribution-intervals.ts` に入力非破壊の `clipInterval`、`unionIntervals`、`subtractIntervals`、`intervalSeconds` を実装する。
- [x] Step 2: window/candidate ID、一意性、safe integer、positive net、集合前提をaccounting開始前にfail-closed検査する。
- [x] Step 3: idle spanをintent別にunionし、candidateをsame intentかつsame stageの全eligible windowへ決定的順でclipする。
- [x] Step 4: clip後にidleを差し引き、positive fragmentが1件以上あるcandidateだけを1つのaccounted dispositionへ集約する。
- [x] Step 5: contribution 0件をoutside-windowまたはempty-after-idleへちょうど1回rejectし、candidate/disposition全単射を維持する。
- [x] Step 6: window/category内unionと全category global unionを分離し、observable、overlap、unattributable、finite rateの恒等式を計算する。
- [x] Step 7: window/population参照整合とbijectionを最終invariant transactionで検証し、違反時は部分結果なしのtyped errorを返す。
- [x] Step 8: `t486-stage-attribution-intervals.test.ts` にhalf-open境界、nested/adjacent/overlap、idle、複数window、別intent/stage非干渉、bijection、順序不変、入力非破壊のexample testとfast-check PBTを実装する。
- [x] Step 9: focused test、repository typecheck、lintを実行し、所有source/testだけをConventional Commitにする。

## 要件トレーサビリティ

| Step | 要件・設計契約 | 期待証拠 |
|---|---|---|
| 1 | FR-INT-1、interval primitives | half-open clip、canonical union/subtract、safe integer test/PBT |
| 2、7 | FR-STAT-2、population invariants | duplicate/unsafe/参照不整合でpartial resultなしのtyped err |
| 3〜5 | FR-EVT-3/5、FR-INT-2〜3、FR-OUT-3 | same intent/stage、全eligible window、accounted/outside/idle-empty単一disposition |
| 6 | FR-INT-4、FR-STAT-2 | category/global union、observable+unattributable=net、finite rate |
| 8、9 | FR-TEST-1〜2、NFR-1〜6のaccounting側 | example/PBT、shuffle、snapshot、typecheck、lint |

U-03 は interval/accounting の supporting slice のみを実装する。Issue #2695 の FR 25件、NFR 7件、完了条件1〜10は U-01〜U-04 と Build and Test の全体 mappingを維持し、U-02のdecoderとU-04のservice/report責務を削減・先取りしない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T03:00:15Z
- **Iteration:** 1
- **Scope decision:** none

FR-INT-1〜4、FR-EVT-3/5、FR-STAT-2、FR-OUT-3、FR-TEST、適用NFRおよびIssue #2695全体scopeは縮小されていない。same intent/stageの全window評価、単一disposition、intent別idle差引、category/global union、candidate/window全単射、partial result禁止はplan・summary・設計成果物から追跡でき、提示されたtest/PBT/typecheck/lint evidenceとも整合する。PR未作成もnot-applicable-yet/converged=falseと明記され、PASSの代用にはされていない。ただしU-03実装の公開error型がaccepted contractと不一致のためREADYにはできない。

### Findings

- BLOCKER | accepted method contractは`AttributionResult<AttributionPopulationAccounting, AccountingInvariantError>`であり、domain-entitiesも`AccountingInvariantError`をU-01から再利用してU-03では別shapeを定義しないと明記する。一方、実装はU-01 unionで表現できないduplicate candidate、idle canonicality、net mismatch、overflow、population bijectionのため、U-03所有の`PopulationAccountingInvariantError`を追加して公開戻りerror unionを拡張している。これはU-01のdomain contract ownership、U-03のdependency boundary、consumerが受けるaccepted public method contractを変更する未承認のarchitecture deviationである。共通discriminator維持やtypecheck Greenは契約一致の代用にならない。U-01のclosed unionとaccepted設計を必要なpopulation invariantまで正式に拡張してconsumer/testを同期するか、情報を失わずaccepted `AccountingInvariantError`へ収められる契約へ再設計するまでNOT-READY。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T03:16:46Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のBLOCKERは解消された。U-01がAccountingInvariantErrorの正式ownerとしてinvalid-population-accounting variantとpopulation invariant vocabularyを追加し、U-03は独自error shapeを削除してaccepted public contractであるAttributionResult<AttributionPopulationAccounting, AccountingInvariantError>を再利用している。これによりU-01 ownership、U-03 dependency boundary、consumerのclosed unionが一致する。same intent/stage限定、intent別idle差引、candidate単一disposition、複数window contribution、category/global union、window/candidate全単射、observable・unattributable・overlap・finite rateのFR-INT/FR-STAT/accounting不変条件にも未解決の逸脱はない。U-01/U-03 focused、統合test、typecheck、lintおよびreferee evidenceは修正後契約と整合し、PR未作成もnot-applicable-yetかつconverged=falseとして適切に扱われている。

### Findings

- None
