<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-07T15:45:00Z — u2 の FR-1a 適用範囲をユーザー裁定で精密化(Branch 8 ask 経路は案内つき loud 拒否 — 搬送機構は新設しない)。u2 iteration 2 の残余1件(domain-entities の「full は含めない」自己矛盾)は機械検証可能クラスとして E-LSSADS13 に基づき conductor 是正+grep 閉包(設計文 0 hit、撤回注記の引用のみ残存)で受理 — iteration 予算 2/2 消費後の残余是正。ゲート報告で申告する
- 2026-08-07T15:45:00Z — u3 iteration 1 で「必須フラグ+loud 拒否」設計が全既存呼び出し元を壊す BLOCKER を reviewer が実コード照合で捕捉 → 導出属性(ladder iff decisionId)へ是正。reviewer への実コード読取許可(orchestrate/log/tests をスコープに含める)が per-unit FD の検証実効性を大きく上げた

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
