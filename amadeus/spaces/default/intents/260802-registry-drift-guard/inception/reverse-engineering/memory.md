<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-02T18:05:20Z — Field reference の完全性と詳細解説を分離した; schema accepted 全25 field は machine registry で機械検査し、既存H3は判断を要する項目の narrative として維持する解釈を次段候補とした。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-02T18:05:20Z — preflight の trunk 統合を実施しなかった; 開始時から存在する plugin 関連の未追跡ファイルとユーザー変更を保全するため、観測断面を HEAD `64b44a9f8c8c79aff876d3275b194f39ead62a49` に固定した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-02T18:05:20Z — core 正本だけを新 guard の検査対象とした; 7 dist と5 promoted tree を個別走査する案より、既存 `package.ts --check` と `promote:self:check` に投影整合を委ねる方が第二の正本を作らない。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-02T18:05:20Z — CLI verb の表示順まで契約化するか、集合・重複・cardinality 一致だけにするかを Requirements Analysis で裁定する。
- 2026-08-02T18:05:20Z — authoritative spec の欠落9 field、active `when` の reserved 誤記、stale `t62` 前提を再発防止と同一 Intent で是正する範囲を Requirements Analysis で裁定する。
