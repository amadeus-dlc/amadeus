# Bolt Plan — Election CLI 多問対応

## Planning basis

本planは [requirements](../requirements-analysis/requirements.md)、[components](../application-design/components.md)、[unit-of-work](../units-generation/unit-of-work.md)、[unit-of-work-dependency](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map](../units-generation/unit-of-work-story-map.md) に基づく。sequencing heuristicはrisk-first、Boltは直列、DAG上で非交差のunitだけBolt内並行可とする。walking skeleton専用BoltとWSJF点数化は採用しない。

## Bolt 1: Canonical Contract

- **Units:** U1 `election-canonical-schema`
- **Walking skeleton:** No
- **Definition of Done:** v2 definition/ballot/tally型、legacy `legacy-question`正規化、canonical ordering/digest、round-trip PBT、invalid-input reject PBTが成立する。
- **Confidence hypothesis:** legacy/newの双方が同じcanonical modelへ収斂し、後続unitがschema分岐を再実装せず構築できる。
- **Expected demo:** legacy単問と新規多問をdecodeし、canonical IDs/resultsとdigestを比較するCLIなしのtest demonstration。
- **Gate:** FR-DEF-1〜3、FR-COMP-1/2、NFR-3/4のunit testsがpass。

## Bolt 2: Question Engine and Durable Store

- **Units:** U2 `election-question-tally`、U3 `election-v2-store`
- **Walking skeleton:** No
- **Definition of Done:** voter × question resolution、per-question tally、mixed result、early/late、preserved digest、dual-read、pending blind lane、immutable run/current snapshot、same-run repairが成立する。
- **Confidence hypothesis:** question別business ruleとappend-only persistenceを分離しても、既存blind independenceとsingle writer contractを維持できる。
- **Expected demo:** 2問のうち1問established/1問holdを保存し、同runId repairと異content conflictを示すintegration test。
- **Gate:** U2/U3のunit/PBT/integration、linear processing assertion、legacy read-only assertionがpass。

## Bolt 3: End-to-End Mixed Election CLI

- **Units:** U4 `election-record-transport`、U5 `election-mixed-lifecycle-cli`
- **Walking skeleton:** No（このBoltは最初のend-to-end demoだが、risk-firstでB1/B2を先行させる）
- **Definition of Done:** multi-question blind view、record/verify、partial lifecycle、held[]/target IDs/digest directive、held-only rerun、established amend拒否を9 verb loopで完走する。
- **Confidence hypothesis:** conductorはmachine-readable directiveだけでmixed electionを完了でき、成立済みquestionはrerun前後で不変になる。
- **Expected demo:** open→notify→vote→mixed tally→record→hold-only vote/tally→all established→verifyのwalking demonstration。
- **Gate:** unit/integration/e2eでS2〜S6、single-question compatibility、record determinismがpass。

## Bolt 4: Compatibility and Formal Proof

- **Units:** U6 `election-legacy-migration`、U7 `formal-election-multiq`
- **Walking skeleton:** No
- **Definition of Done:** migration dry-run/approved moveのcanonical fidelity、FormalElectionのmulti-question invariants、TLC receipt、model-map identitiesが成立する。
- **Confidence hypothesis:** example-based CLI testとは独立に、legacy移動とstate-machine safetyの反証探索がIssueの保存・再実行不変条件を支持する。
- **Expected demo:** legacy corpusの移動前後digest一致と、TLC `NOT_DETECTED` + current model-map receipt。
- **Gate:** migration integration、formal completeness、TLC、model-map検査がpass。

## Bolt 5: Distribution, Regression, and Norm

- **Units:** U8 `election-distribution-and-verification`
- **Walking skeleton:** No
- **Definition of Done:** canonical skill、対象harness projection、FR trace matrix、full quality commands、single-question p95 benchmark、norm update、distillation source scanが成立する。
- **Confidence hypothesis:** sourceだけでなく配布物、CI、運用語彙、現行normまで一貫し、Issue #2813を再発可能なgapなしで完了できる。
- **Expected demo:** build後skill投影、full test/gate結果、baseline/treatment benchmark、`always-elect`差分、旧workaround 0-hit。
- **Gate:** `typecheck`、`lint`、`build`、`source-only:check`、`test:ci`、coverage/build reproducibility、performance thresholdがすべてpass。

## Sequence validation

| Bolt | Direct prerequisites satisfied by |
|---|---|
| B1 | none |
| B2 | B1 |
| B3 | B1, B2 |
| B4 | B1, B2, B3 |
| B5 | B3, B4 |

全Boltはunit DAGのtopological constraintsを満たす。Bolt順序の例外やcycleはない。
