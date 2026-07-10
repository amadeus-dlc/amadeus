<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-10 [Interpretation] diff-refresh(base 584262c1a → observed fc5a34cf1、フォーカス面のコード diff 空)。Developer→Architect 直列(c3)。
- 2026-07-10 [Interpretation] 3 者食い違い(B 形式: e1/e5=鋳造、e6=抑止)を二重測定で確定: 合成 stdin では B は鋳造する(startsWith は任意前置きで失敗)が、本番 amadeus transcript では B は 0/439 で不在(A 裸形式で配信され抑止)— 「合成のみ真、本番非該当」。確定ベクタは D(teammate-message、本番 18 件実注入)。
- 2026-07-10 [Open question] B 形式を修正カタログに含めるか — 本番 amadeus 不在だが合成到達可能・外来ハーネス artifact として存在。防御的包含のコストはほぼゼロ(要 requirements 判断)。
- 2026-07-10 [Interpretation] stop.ts tier-3 transcriptIsConversational は marker チェック皆無で mint hook より露出大 — 同根欠陥として requirements のスコープ判断対象。
- 2026-07-10 [Tradeoff] codekb 更新は 3 件(cqa/architecture/鮮度ポインタ)+ c3-relabel を直前 intent 分のみ適用。旧 4 節の現在時制マーカー残存は既存負債として次回 RE 送り(Architect 報告に記録)。
