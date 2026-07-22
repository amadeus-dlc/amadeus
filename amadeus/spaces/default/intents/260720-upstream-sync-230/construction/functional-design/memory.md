<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-20T13:45:55Z — U06ではparse可能な`.gitmodules`もroot signalに含めた; U06の「top-level signal時は走査しない」制約を既存5 signalだけに限定せず、第6 signalへ同じく適用した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-20T13:45:55Z — upstreamの複数nested hitをcomma-joined `nestedRoot`へ入れるshapeを採用しなかった; AmadeusのC3/U06は複数候補を自動選択しない契約なので、単一だけ`nestedRoot`、複数は`nestedCandidates`とadvisoryへADAPTした。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-20T13:45:55Z — unreadable nested entryはscan全体のfatal errorよりpath付きadvisoryを選んだ; read-only観測を継続できる一方、分類は読めた証拠だけに限定し、source treeへの書込0を検証条件にした。
- 2026-07-20T13:58:52Z — E-USSU06FD1で`classified | inconclusive`判別unionを3–0採用した; projector guardだけの小変更や保守的Brownfieldより型変更は広いが、birth/stateのexhaustive matchでguard漏れと誤Greenfield mutationを表現不能にすることを優先した。GoA 1x2 / 2x1、e1留保どおりC3境界内に閉じ、classified既定bytes不変を必須にした。
- 2026-07-20T15:07:42Z — E-USSU01FD3で追加frontmatter 5 fieldのupstream exact-shapeを3–0採用した; compatibility緩和やstrong canonicalizationより、`e89162f`とのsource fidelity、追加canonicalizationなし、field absent時の既存bytes不変を優先した。
- 2026-07-20T15:07:42Z — E-USSU08FD1でspot-checkの4条件closed predicateによる決定的自動承認を3–0採用した; 都度の人間gateやcarve-out廃止より、single owner pathへ限定したupstream互換とread前のpath/reason/ID/evidence/decision固定を両立し、既存review/subagent/auditだけで追跡することを優先した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
