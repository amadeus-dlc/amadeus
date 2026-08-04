<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-03T10:34:23Z — Issueと承認済み成果物にある決定を再質問せず、矛盾または実装を阻む要件欠落だけを質問する; implementation choiceはArchitectが一次資料と既存seamから推奨案を選び、比較案・可逆性をADRと承認ゲートで示す

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-03T10:38:53Z — application-design-questions.mdを成果物として残さない; engine directiveのproducesは5設計文書の閉集合であり、Issue・requirements・CodeKB間に質問が必要な矛盾または実装阻害の欠落がないため、実装選択はADRの比較案として承認ゲートへ載せる

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-03T10:49:14Z — RPCをhuman presenceの証明に使わずinteractive TUIだけをHUMAN_TURN対象にする; RPCは自動化可能なtransportであり、remote human provenanceをPi公開APIが証明できない現状ではfail-closedを優先する
- 2026-08-03T10:49:14Z — setup複数file更新にwrite-ahead journalとmandatory recoveryを設ける; 単file atomic renameだけではprocess interruption後の全体rollbackを保証できないため、Pi payloadに限定せずpackages/setupのtransaction coordinatorが所有する

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
