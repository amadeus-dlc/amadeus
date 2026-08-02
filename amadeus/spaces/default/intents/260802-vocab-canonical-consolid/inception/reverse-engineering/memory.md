<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-02T10:20:00Z — RE 宣言センサー3種は codekb 出力が filter(**/{amadeus-docs,intents}/**, **/*-questions.md)に構造不適合のため発火不能(cid:re-sensors-codekb-filter-mismatch)。代替検証を conductor 手動で実施: 全9成果物の H2 実在(grep -c '^## ' 全て≥2)、現在マーカー降格の grep 確認(残存0)、新現行節の引用スポット再実測(stage-protocol 6段・package.ts:410-419・timestamp ブロック — 全件一致)
- 2026-08-02T10:20:00Z — クロスレビュー済み Issue の scan-mode(cid:c1-xrev-scan-mode)を適用: 患部8面の区間 touch=0 実測+xrev 引用の SHA 一致により行番号再解決を免除、verbatim スポット再実測で二重化
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-02T10:20:00Z — subagent 直列(Developer scan=Explore read-only → Architect synthesis=書込を codekb 限定)で実行(cid:reverse-engineering:c3/c4 準拠)。スキャナ・シンセサイザとも engine/state 操作禁止を prompt 明示(cid:c2-engine-mutation-ban)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-02T10:20:00Z — scan の「ロード順5段」を architect が6段(stage-protocol.md:637-642、6段目=Prior stage artifacts)へ訂正 — t34:310 の >=6 は閾値ちょうどの truthful green。ロード経路の追加は安全、削除・振り直しは赤(requirements の設計制約として引継ぎ)
- 2026-08-02T10:20:00Z — §9 の6語(aidlc/component/generation/module/planning/service)が正本に不在、⑥⑦は⑤の subset ですらない(固有4語) — subset マーカー設計と語彙昇格の裁定を requirements へ
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
