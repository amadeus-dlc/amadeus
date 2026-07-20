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

- [2026-07-20T03:24Z] Interpretation: diff-refresh base=a326f47bc(祖先・距離22)— base 抽出ループの正規表現漏れを直接 merge-base 検査で是正してから採用(rescan-base-ancestry)。区間はコード面交差0(record/audit のみ)。
- [2026-07-20T03:24Z] Interpretation: elections 件数は計測 ref で分離(worktree HEAD=7 / origin/main=55)— measurement-ref-in-artifacts の適用。leader 同期対象の母数は origin/main 側で記録。
- [2026-07-20T03:24Z] Interpretation: Architect 独立再照合7点で反証なし(軽微2: 51→55 の ref 前進・auditShardName :2837→:2838 off-by-one 訂正)。RE センサー3種は filter 構造不適合の既知クラスにつき conductor 手動検証で代替(produces 9+per-intent 実在・最新バナー1・マーカー0)。
