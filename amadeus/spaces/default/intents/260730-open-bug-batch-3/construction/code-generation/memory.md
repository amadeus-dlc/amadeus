<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-31T04:25:00Z — degrade スコープの per-unit ループは cid:code-generation:c1-degrade-batch-directive-capture どおり運用; unit dir を1つずつ遅延作成し engine 解決 directive を scratch 保存 → §12a で再利用。全 unit covered 後の next fail-closed(E-OBB2-CG1 裁定 B)も想定どおり発現し、gate は保存済み directive 基準で成立させる。
- 2026-07-31T04:25:30Z — builder 申告2判断を conductor 受理; (1) t236 の collecting 中 ledger 直読 assert は FR-1a が禁じた欠陥状態そのもののピンで AC-3 の射程外 → マージビューへ移設(§12a reviewer が機械的帰結と検証) (2) TLA model-map の sha256 再ピン ×3(#1808 ×1 / #1809 ×2)は #1510 暫定運用どおり PR 本文に根拠明記。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-31T04:26:00Z — Bolt 実行順は #1752(非交差)→ #1773 → #1772 の直列; #1773×#1772 は amadeus-election-model.ts で静的交差だったが、#1773 の実 diff が model.ts 非接触と判明(c6 の実 diff 再評価)。ただし共有台帳 tests/.coverage-patch-allowlist.json の衝突回避のため直列を維持し、各 Bolt は前 PR 着地後の main へ再接地してから着手。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-31T04:26:30Z — 欠陥そのものをピンする既存テスト(t236 の collecting 中 ledger 直読)が fix の AC「既存テストグリーン維持」と構造衝突するクラス; 要件段で「欠陥ピンテストの棚卸し」を AC 起草時に行うべきかは学習候補として §13 へ。
- 2026-07-31T04:27:00Z — SKILL.md 本文の言語方針は Issue 起票済み(別裁定)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
