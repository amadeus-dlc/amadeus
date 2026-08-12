# Delivery Planning Questions

入力: [`requirements.md`](../requirements-analysis/requirements.md)、[`components.md`](../application-design/components.md)、[`unit-of-work.md`](../units-generation/unit-of-work.md)、[`unit-of-work-dependency.md`](../units-generation/unit-of-work-dependency.md)、[`unit-of-work-story-map.md`](../units-generation/unit-of-work-story-map.md)。Stories / mockups / team-practices は本 scope で非実行。

ユーザー承認: 2026-08-10T14:24:00Z — 「並行実装＋#2833先行ゲート」を選択。

## Strategic Decisions

### Q1. Sequencing heuristic

[Answer]: risk-first。P1/S2-CRITICAL の #2833 を walking-skeleton / 先行 gate とし、P2/S3-MAJOR の #2834 を後続 gate とする。

[Evidence]: Issue ラベルと requirements の priority、2026-08-10のユーザー指示。

### Q2. Bolt granularity and PR boundary

[Answer]: 1 Issue = 1 Unit = 1 Bolt = 1 PR。#2833と#2834を別vertical sliceとし、横断 acceptance は Build and Test 工程で行う。

[Evidence]: `project.md` のUnit/PR規範、2026-08-10のユーザー裁定「並行実装＋#2833先行ゲート」。

### Q3. Parallelism and walking skeleton

[Answer]: Bolt 1 / Bolt 2 を同一 Construction swarm batchで実装する。Bolt 1だけをwalking-skeletonとして先に収束・承認し、Bolt 2は承認を先行させない。self-featureのBolt 1単独実行は、今回intentに限り並行実装を許す。

[Evidence]: 2026-08-10のユーザー裁定「並行実装＋#2833先行ゲート」。`unit-of-work-dependency.md` は2 node / 0 edge。

### Q4. WSJF and external dependencies

[Answer]: formal WSJFは使用せず、severity/time-criticalityを優先するrisk-firstを使う。外部runtime/API/data依存はない。PR mergeだけはno-AI-mergeによりleaderセッションのユーザー承認が必要。

[Evidence]: requirements NFR/Constraints、team memoryのno-AI-merge、ユーザー制約。

## Per-Bolt Decisions

- Bolt 1: Unit `issue-2833-failure-transition`、walking skeleton、amadeus-developer-agent swarm worker。confidence hypothesisは「Abort後のselectorが再dispatchせずengine-owned parkedへ到達する」。
- Bolt 2: Unit `issue-2834-consume-fanout`、非walking skeleton、別amadeus-developer-agent swarm worker。confidence hypothesisは「7 consumer / 19 edgeが全effective Unitへconcrete fan-outしplaceholderを残さない」。
