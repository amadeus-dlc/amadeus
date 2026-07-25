# Scope Definition Questions

**Mode:** chat  
**Captured:** 2026-07-25T04:02:00Z  
**ユーザー承認:** 2026-07-25T04:03:44Z  
**Primary evidence:** 承認済みIntent Capture、Feasibility Assessment、Constraint Register

## Q1. 利用価値を成立させる最小scopeは何か

[Answer]: solo modeの人間がactive intentに束縛されたstanding grantを発行・取消でき、対象となる通常stage gateでは追加の個別`HUMAN_TURN`なしに承認できること。route時に選択したGrant Idをcommitまで明示的に引き回して同じgrantを再検証し、無効化されていればstageやerror auditをcommitせず通常のhuman gateへ戻ること。このroute-to-commit vertical sliceに必要なdirective、state、audit、conductor、test、documentationを含める。

## Q2. Must／Should／Could／Won'tの境界は何か

[Answer]: MustはIssue #1466のsolo発行・取消・intent isolation、通常gate認可、正確なGrant Id、TOCTOU fallback、team非回帰、phase-boundary・walking-skeleton除外、per-unit最終gate、全ハーネス同義性、unit/integration/full/type/drift検証である。Shouldはdoctor/help/reference documentationの現行契約更新である。Couldは追加のoperator UX改善や新しいscope種類であり、今回含めない。Won'tは新設定model、擬似gate値、stderr文字列制御、team delegationのsolo流用、外部認可service、PR #1468の実装取り込みである。

## Q3. capability間の依存は何か

[Answer]: 現行team flowのreverse engineeringが全変更面の根拠となり、次にintent-bound grant lifecycleとgate eligibilityのrequirementsを定義する。その後にgate policyとauthorization sourceを分離するdomain/application model、directive carrier、commit再検証、typed fallbackを設計する。実装はaudit event拡張とresolver、directive、state transition、orchestrator fallback、conductor投影、testsの順に依存し、最終的に全生成物と全testを検証する。

## Q4. sequencing preferenceは何か

[Answer]: risk-firstかつdependency-firstとする。最初にcross-intent認可、route/commitのgrant差替え、失効時の誤`ERROR_LOGGED`／`STAGE_COMPLETED`という重大リスクを仕様とtestで固定する。次に最小のcore seamを実装し、team mode回帰と全ハーネスdriftを最後まで継続確認する。設計gate承認前には実装しない。

## Q5. hard deadlineまたは削減可能な品質条件はあるか

[Answer]: 明示deadlineはない。受け入れ条件、設計gate、型check、関連test、全test、生成物drift checkは削減不可である。scopeを縮小する必要が生じた場合でも、安全性やteam互換性を削らず、Issue外のUX改善・追加scope・新設定surfaceを除外する。
