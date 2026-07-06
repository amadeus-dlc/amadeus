<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-06T14:40:00Z — NFR は REL 4 件 + SEC 3 件を実質とし、PERF は SLO なし観測、SCAL は不適用（Right-Sizing、#451 と同型）。REL-2（退避は上書きの前に完了。失敗時は停止）を新たに立てた — 退避型戦略の信頼性の芯であり、eval (b) の退避内容一致で観測できる。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-06T15:00:00Z — §12a 反復 1 の指摘 5 件（High 2 / Medium 2 / Low 1）を全件反映した。(1) SEC-2 の閉域論証は導入先 manifest の可変性を見落としていた → relPath 検証（`..` / 絶対 path 拒否）を採用し functional-design B002 手順へ post-gate 追補（本 gate で確定）。(2) REL-2 の検証を正直に書き分け（退避失敗停止は実装レビュー担保）。(3) 判定表にグローバル優先規則（current = newHash → 常に skipped）が欠けており途中失敗 → 再実行で二重退避が起きる実欠陥 → functional-design へ post-gate 追補 + eval 追補 (i)。(4) NFR ID の名前空間注記（REL(#543)-n）。(5) 並行起動の対象外を明示。
- 2026-07-06T14:35:00Z — 手続きの正誤: functional-design 承認直後に B001 の BOLT_STARTED を先行 emit した（Bolt 実行は code-generation 段が正）。Bolt の実作業は未着手で complete も発行していないため実害はなく、BOLT_STARTED は「Bolt の準備開始」の記録として残す（audit は書き換えない）。以後、bolt start は code-generation の directive 受領後に行う。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
