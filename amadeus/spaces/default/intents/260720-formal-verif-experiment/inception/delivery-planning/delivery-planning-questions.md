# Delivery Planning — 実行計画判断(260720-formal-verif-experiment)

> **対話モード**: Guide me。Bolt grouping / sequenceとblind staffingはteam electionへ付議する。
> **E-OC1判定**: Q1はConstruction gate数・confidence hypothesis・実装経済性、Q2はarm独立性と担当分離を変えるため選挙必須。Q3は上流裁定で既決のため再選挙しない。
> **裁定記録**: 2026-07-20T09:18:33Z受領。E-FVEDP1 / E-FVEDP2はいずれもrecorded / verified、Aを3-0、GoA favor 3 / against 0で採用。留保は各[Answer]へ全文転記した。

上流入力: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。User Stories / Mockupsはplan上SKIPで存在しない。

## Q1: Bolt grouping / economic sequence

hard constraintsは、最初のBoltでTLA+/TLC × #1252 walking-skeletonをend-to-end完了すること、U1単独Bolt禁止、TS armはskeleton成功後に開始、U8はU1〜U7後に完成することである。

- A. 4 Bolts: B1=U1〜U5 walking-skeleton、B2=U6 TS arm、B3=U7 full matrix、B4=U8 eligibility/report/final wiring
- B. 3 Bolts: B1=U1〜U5、B2=U6+U7、B3=U8
- C. 2 Bolts: B1=U1〜U5、B2=U6〜U8
- D. 8 Bolts: 1 unit / Boltにする(U1単独とskeleton-firstを例外扱い)
- E. Value-firstでreport / TS armをskeletonより先に置く
- X. Other (please specify)

[Answer]: A(E-FVEDP1。4 Bolts: B1=U1〜U5 walking-skeleton、B2=U6 TS arm、B3=U7 full matrix、B4=U8 eligibility/report/final wiring。3-0、GoA favor 3 / against 0、recorded / verified)

留保: B1はU1〜U5を単一責務へ潰さず各Unitの所有・test境界を維持し、専用integration harnessによるTLA×#1252 skeletonのend-to-end成功をBolt closureとすること。B2はArm Sの独立authoring/freezeだけを閉じ、B3 full matrixへ統合する前にfreeze SHA・input allowlist・Arm T/B1 evidence非参照を機械確認すること。

## Q2: Blind staffing / mob boundary

Team FormationはSKIPだが、FR-3はarmごとに別author / worktreeを要求し、E-FVEADS13Rは後続armへ先行evidenceを漏らさない。

- A. Role-isolated AI mobs: B1のshared coordinator担当とArm T authorを分離し、B2はBolt1 evidence / Arm T pathへアクセスしない別Arm S author、B3/B4は両freeze後のintegration mob
- B. One mob: 同じdeveloper agentが全Bolt / 両armを担当する
- C. Two arm mobs only: shared coordinator / integrationのownerを置かない
- D. Human authors: Arm T / Sを人間が直接実装する
- E. StaffingはConstruction開始時まで未確定にする
- X. Other (please specify)

[Answer]: A(E-FVEDP2。role-isolated AI mobs。3-0、GoA favor 3 / against 0、recorded / verified)

留保: Arm T/Arm S authorへsealed registry、他arm実装、先行skeleton evidenceを渡さず、Coordinatorが公開input hash・clean worktree・freeze SHAをmintすること。B2 Arm SはB1 branchを含まない同一healthy baselineから作成し、integration mobは両armのfreeze成立後にだけ両成果物へアクセスすること。役割分離を名称だけでなく機械的に立証すること。別worktree・別session・入力allowlistを用い、B2のArm S作者prompt/contextにはB1証拠、Arm T path、sealed fixture詳細を0件とする。integration mobは両arm freeze後にのみ開始し、作者identity、worktree、base SHA、input hash、freeze SHAを記録する。

## Q3: Sequencing heuristic / WSJF

- A. Hard risk-first: walking-skeletonとblind state machineを先に満たし、数値WSJFは使わない。DAG内の同格候補だけrisk reduction / sizeを比較する
- B. Numeric WSJF: value + time criticality + risk reductionを等重みでsize除算する
- C. Value-first: report可視性を最優先する
- D. Pure shortest-job-first: LOC下限が小さいunitから始める
- E. Parallel-first: independent setを最大同時実行する
- X. Other (please specify)

[Answer]: A(E-FVERA3R、E-FVEADS13R、E-FVEUG2で既決。risk-first skeleton、fail-closed blind順序、U1単独Bolt禁止を数値scoreで上書きしない)
