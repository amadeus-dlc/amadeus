# Units Generation — 分解判断(260720-formal-verif-experiment)

> **対話モード**: Guide me。真に未決のunit境界だけをteam electionへ付議する。
> **E-OC1判定**: Q1のgranularityは変更規模・Construction gate数・独立test境界を変えるため選挙必須。Q2はE-FVEADS13R、Q3はE-FVEAD3 / ADR-1で既決のため再選挙しない。
> **裁定受領**: E-FVEUG1=A(8 capability-aligned units)、3-0、GoA favor3 / against0、留保0、recorded / verified。裁定通知 2026-07-20T08:50:47Z。実装順は未決のままDelivery Planningへ委譲する。
> **blocker裁定**: E-FVEUG2=A(8 units維持・U8へconcrete composition root移管)、3-0、GoA favor3 / against0、全3票GoA2、recorded / verified。裁定通知 2026-07-20T09:04:23Z。e1の未来submittedAtはreceivedAt受理軸で正常、append-only recordを温存する。

上流入力: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。User Storiesはexecution planでSKIPされ、`stories.md`は存在しない。

## Q1: Unit granularity

blind state machineを壊さず、各unitを独立test可能にする分解数を決める。ここでは実装順や価値優先度を決めず、依存topologyだけを比較する。

- A. 8 units: contract/provenance、sealed fixture registry、execution/evidence、TLA arm/toolchain、TLA×#1252 skeleton integration、TS arm、full-matrix suite、eligibility/report
- B. 7 units: Aのfull-matrix suiteとeligibility/reportを1unitへ統合する
- C. 6 units: Bに加え、execution/evidenceをcontract/provenanceへ統合する
- D. 5 component groups: shared core、fixture、TLA、TS、evaluation/report
- E. Per-module fine grain: Application Designの各componentを1unitにして9以上へ分割する
- X. Other (please specify)

[Answer]: A(E-FVEUG1。8 capability-aligned units、3-0、GoA favor3 / against0、留保0、recorded / verified)

## Q2: Dependency / parallelism boundary

- A. TS arm authoringはTLA×#1252 skeleton成功後にのみ開始し、それ以外はDAG上の直接依存がないunitだけ並行可能とする
- B. TLA / TS armを同時にauthoringし、skeleton結果だけ後から確認する
- C. すべてserial dependencyにする
- D. dependencyをDelivery Planningまで未定にする
- E. implementation側で都度判断する
- X. Other (please specify)

[Answer]: A(E-FVEADS13Rで既決。sealed fixture→第1arm freeze / 限定開示→skeleton成功→第2arm blind freeze→両freeze後manifest公開のfail-closed state machine)

## Q3: Unit deployment model

- A. 全unitをrepo-local modular monolithへembeddedし、独立deploy targetを作らない
- B. armごとに独立packageとしてdeployする
- C. coordinatorをnetwork service化する
- D. evaluatorだけ独立packageにする
- E. CI reusable workflowを各unitのdeploy targetにする
- X. Other (please specify)

[Answer]: A(E-FVEAD3およびApplication Design ADR-1で既決。再利用codeはrepo-local scripts/tests、intent固有evidenceはrecord、外部service / AWS / UIなし)

## Q4: Contract / Coordinatorの意味的循環を解く所有境界

reviewer iteration 2で、U1にcontractとconcrete composition rootを同居させると、DAG外にU1→provider→U1循環が生じると反証された。

- A. 8 unitsを維持し、U1はports / generic injected dispatcher、U8が全handlerをdirect wireするfinal concrete composition rootを所有する
- B. 各unitを別CLIにして単一Coordinatorを撤回する
- C. 9番目のintegration unitを追加する
- D. U1 concrete rootを維持してDAGを組み直す
- E. Application Designへ戻ってcomponent境界から再設計する
- X. Other (please specify)

[Answer]: A(E-FVEUG2。3-0、GoA favor3 / against0、全3票GoA2、recorded / verified)

- 留保1: U8 rootは全handler direct import/wireのみのwiring-only module+独立test境界としeligibility/Pareto/report評価・表示を重複実装しない。
- 留保2: U5 skeletonは必要ports/handlersを専用integration harnessで結線し、U1〜U7完成前にU8完成を主張しない。
- 留保3: U1単独Bolt禁止、最初のconcrete handler群/walking-skeletonと束ねる。
