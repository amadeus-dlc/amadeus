<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17T23:46:35Z — 真の未決2問(ガード位置・修復単位)のみ E-SMF-AD へ諮り、導出可能な3項目(後退述語・seam 化・検証列)は E-OC1 3段(申告→承認 23:43:55Z→記入)で選挙不要判定; 裁定依存欄は ruling-dependent-placeholder(採択直後の新ノルム)で【裁定待ち】運用し裁定後に一括差し替え
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-17T23:55:53Z — reviewer NOT-READY(C-1 mermaid 閉じ括弧 / M-1 readCheckboxState 新設は parseCheckboxes :3750 既存の見落とし = mechanism-cite-verify の不在主張面 / M-2 handleSetStatus export の NFR-4 写像漏れ / m-1 NFR-3 明示漏れ)→ 全件是正・伝播 grep(旧概念残存は撤回文脈のみ)→ 再レビュー READY; ADR-4 は撤回・再利用決定として書き直し、ADR-5 新設
- 2026-07-17T23:46:35Z — なし
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-17T23:55:53Z — 行数合算 35-50 を列挙からの機械再計算で 33-45 へ是正(ledger-count-mechanical-recalc、reviewer 付随所見)
- 2026-07-17T23:46:35Z — 判定述語を単一述語(checkbox ∈ x/?)に留めステージ順序比較を退けた; 順序表依存は out-of-scope の一般機構化に接近するため。C2 を lib 新設(inline regex 案は spawn-only seam 化で NFR-4 を損なう)
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-17T23:46:35Z — なし(FR-3 検証の順序制約 = 修復コミット後に 18/18 実測を delivery-planning へ申し送り)
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
