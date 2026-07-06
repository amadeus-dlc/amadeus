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
- 2026-07-06T04:25:00Z — Interpretation: 「段階 commit で壊れた中間状態を作らない」と rename の相互依存を両立させるため、実体・参照を単一の原子的 commit（B）に集約する 3 段構成（A 表記面 → B 原子的移設 → C 検出反転）を設計した。ディスパッチの 4 段（機械的 rename → record 移設 → 参照更新 → 検証)は作業順序として B 内に保存される。
- 2026-07-06T04:25:00Z — Tradeoff: bare token `aidlc` の包括写像は誤爆（aidlc-workflows 等の上流固有名）を招くため追加せず、具体パターン 4 系統に分けた。往復可逆の機械検証を採用条件にする（#542 の規律）。
- 2026-07-06T04:40:00Z — Interpretation: reviewer NOT-READY（iteration 1/2）の 2 件を反映。F-1 = .aidlc- 写像を cli-token 型から engine-dir 型（単純前方一致）へ変更（lookahead がハイフン後の英字継続で必ず失敗する実測根拠つき）。F-2 = installer の FR-2.13 は untouchable 対象の意味論的変更であることを Commit B 項目 3 に明記。
- 2026-07-06T04:50:00Z — Interpretation: reviewer iteration 2/2 で READY（F-1/F-2 解消確認 + 新規矛盾なし）。軽微観察 2 件（「engine-dir 型」ラベルの 2 用法、installer の「guard ロジック」= 受動的保護の言い換え）は実装時の検証で吸収する。
