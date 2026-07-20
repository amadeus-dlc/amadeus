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

- [2026-07-20T03:33Z] Interpretation: diff-refresh base = 6f2455c43(祖先 exit 0・距離87、rescan-base-ancestry)。Dev→Arch 直列(c3)、Architect 再照合で**反証1点** — rulingOverride 本体(election.ts:389-393)は Bolt 4 凍結でなく #1268(ea6acac53)の直近変更面(git blame 実測)。requirements/design は「1日前に変わった面への拡張」として扱う。
- [2026-07-20T03:33Z] Interpretation: RE センサーは filter 不適合につき手動検証(body 9温存・re-scan+timestamp+scan-notes 実在・最新バナー1件・履歴26温存・marker 0)。計数 ref 差(leader store 62 vs 自 tree 51)は両 ref 併記で成果物固定(measurement-ref-in-artifacts)。
- [2026-07-20T03:33Z] Open question: requirements へ渡す確定事実 — gap point(rulingOverride 二値写像)/ 未カバー面(tie hold-resolved・採用分岐・tie resolution 検証テスト全欠落)/ 実データ空白(hold・resolutions 本番実績ゼロ・旧スキーマ 62本)。CLI 構文・二値共存形は設計選挙(B-1)。
