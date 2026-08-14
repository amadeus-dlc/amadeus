# Business Rules — election-mixed-lifecycle-cli

## Sources

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) からU5 orchestration ruleを抽出する。

## Directive rules

- BR-D1: directiveはelectionId、targetQuestionIds、preservedResultDigest、verb、reportを持つ。
- BR-D2: holdは単一reasonへ丸めずheld[]を持つ。
- BR-D3: partial targetはcurrent hold IDsだけ。
- BR-D4: directive generationはread-only。
- BR-D5:同一state/snapshotは同じdirective semanticを返す。

## Command rules

- BR-C1: voteはcurrent target coverageだけを受理。
- BR-C2: established questionへのvote/amendを拒否。
- BR-C3: tallyはU2へtarget/preservedを明示入力し、CLIで再集計しない。
- BR-C4: render/verifyはU4へ委譲し、raw castしない。
- BR-C5: notifyはU4 transportへ委譲する。

## Transition rules

- BR-T1: reportはexpected state一致必須。
- BR-T2: tally reportはrunId、targets、digest一致必須。
- BR-T3: any holdならpartial、all establishedならtallied。
- BR-T4: partialからはheld question再配布/collectionだけを許す。
- BR-T5: verification findingsが0になるまでrecordedへ進めない。
- BR-T6: stale directive、異run、digest mismatchをfail-closed。
- BR-T7: same-run repairはU3 contractに従い、historyを削除しない。

## Error and output rules

- BR-O1: stdoutはmachine-readable JSON、stderrはerror。
- BR-O2: error exit 1、success exit 0。
- BR-O3: question referencesはstable ID、text matchを使わない。
- BR-O4: errorは安全なnext actionを一つ示すが自動破壊repairしない。

## Traceability

FR-RER-1〜4、FR-TAL-2/5/6、FR-COMP-3、NFR-3/4を被覆する。
