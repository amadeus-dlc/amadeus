<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-15T00:00:00Z — 差分 base は re-scans 全 observed のうち HEAD 祖先で距離最小の `1d08374cd`(rev-list count 23、対抗 `cd64486a6` は 29)を選定; observed = HEAD = `d64fd7cac`(= origin/main)。cid:reverse-engineering:c1 の rescan-base-ancestry 則に従う
- 2026-08-15T00:00:00Z — 4 Issue(#3065/#3034/#3040/#3035)はいずれも 2026-08-13〜14 起票でクロスレビュー未成立のため xrev differential scan mode は採らず、通常差分リフレッシュ + Issue 患部の focus 精読とした

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-15T00:20:00Z — ユーザー直接指示(実 HUMAN_TURN): 機能テストに厳密な時間アサーションを混ぜない。時間は余裕を持ったテスト timeout(ハング検知)としてのみ扱い、厳密な時間把握は不要。性能検証は承認済み NFR に trace できる場合だけ別枠。#3035 の 300ms/500ms 予算アサーションは削除方向、#3040 は余裕化または settle 後の timeout レース除外方向で requirements-analysis に反映する
