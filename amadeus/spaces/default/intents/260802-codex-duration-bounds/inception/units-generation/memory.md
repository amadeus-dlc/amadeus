<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-02T04:17:56Z — 技術DAGとdelivery順を分離した; #1999と#1919はどちらも#1998へ直接依存するが互いには非依存と記録し、実着手は承認済みの直列delivery契約で制御する。
- 2026-08-02T04:27:15Z — mutationの正準経路をEngine/Interaction Adapter→C2→C3/C5に統一した; C4やswarmがPolicy/Poolを直接呼ばず、C2だけが読取・評価・ID採番・commitをlock内で行う。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-02T04:27:15Z — Unit dependency成果物から実着手順・rebase・labelの具体policyを除いた; FR-07/FR-08をStage 2.8が満たす上流制約として手渡し、Stage 2.7は技術topologyだけを所有する。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-02T04:17:56Z — 1 Issue = 1 Unit = 1 Boltの4 Unitを選んだ; #1602はXLだが、baselineと正本contractを分断せず1つの受入境界に保つ。
- 2026-08-02T04:17:56Z — distribution専用の第5 Unitを作らない; 各Issueの変更が影響するpackage・self-install・docs・testを同じ変更単位で完了させる。
- 2026-08-02T04:27:15Z — C5をID非保有のpure proposal moduleにした; C2がimmutable projection/cap/DAGを渡し、queue-entry/sequence/attempt/slot IDはproposal受理後にC2だけがmintする。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
