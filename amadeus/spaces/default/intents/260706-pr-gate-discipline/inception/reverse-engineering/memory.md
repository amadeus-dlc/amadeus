<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T01:13:30Z — 「Always rerun for freshness」を増分更新（差分駆動）として解釈した。既存 codekb/amadeus/ は 616d063e 基準（2026-07-05T23:25:37Z）で更新済みであり、現 HEAD 2a0a784b との差分は PR #531 のみ（10 files、+349/-23、aidlc/ 除く）。前例: 260705-persist-cid-metamain の増分方式。
- 2026-07-06T01:13:30Z — codekb 書き込み先は codekb-path で解決し `aidlc/spaces/default/codekb/amadeus/` を得た（worktree 名ディレクトリへの分裂なし。#498 修正の正規経路）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T01:13:30Z — フル再スキャンではなく差分スキャンを developer subagent へ委譲した。差分規模が小さく（1 PR 分）、フル再解析はコストに見合わないため。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T01:15:25Z — leader の運用指示（即時適用）: ピア協議の宛先は固定文言ではなく、送信時に team.sh amadeus で実測した現メンバー全員（自分を除く、leader を含む）とする。5〜6 体構成試行の学びとして後続の steering 反映 Intent 候補（本 Intent のスコープ外）。
- 2026-07-06T01:13:30Z — 知識文書を .agents/amadeus/knowledge/amadeus-shared/ へ新設する場合の parity:check 挙動（宣言なし差分の扱い）は設計段階で実測確認する（engineer1 のピア回答 2026-07-06T01:06:56Z。前例: engineer3 が #507 で stage-protocol.md の例外を追加）。
- 2026-07-06T01:13:30Z — audit-format.md を参照する場合は #428 merge 後の実形（71 events）を参照する（engineer1 のピア回答より。#428 PR は本日中作成見込み）。
