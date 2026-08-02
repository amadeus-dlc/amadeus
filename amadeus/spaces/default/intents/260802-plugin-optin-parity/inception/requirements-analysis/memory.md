<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-02T07:48:01Z — plugin の導入対象は project root の `amadeus/config.json` だけに記録する; intent 選択前にも起動する全ハーネスの開始処理が同じ情報を読めるよう、space・intent の設定継承から分離した。
- 2026-08-02T07:48:01Z — OpenCode の `manual-only` は製品制約ではなく未配線として扱う; 公式 plugin フックとセッションイベントがあるため、他ハーネスと同じ初回自動導入契約へ揃える。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-02T07:48:01Z — 未定義の英語略称を質問と要件から除去した; 利用者が正式定義のない用語では理解不能と指摘したため、ユーザー向け成果物では定義済みの用語または平易な日本語を使う。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-02T07:48:01Z — plugin の初回導入成功と形式検査成功を分離した; 仕様0件でもpluginは利用可能にする一方、対象が揃うまでは未準備とし、成功記録を残さず明示検査をエラーにする。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
