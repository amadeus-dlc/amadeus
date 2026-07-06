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
- 2026-07-06T05:05:00Z — Deviation: Commit A の一括置換で自傷 2 種を検出・修復した。(1) parity-map.json の新 entry の prefix "/aidlc" 自身が置換され写像が自壊（検査データを置換対象から除外する規律が必要）。(2) 正規表現リテラル内の /aidlc\/（実体パス照合）が置換され eval が fail（横断検出 grep "/amadeus\\/" で 2 箇所を特定し、現行実体 = aidlc のまま維持へ復元。Commit B で実体移設と同時に更新する）。Commit B の置換では検査データ・正規表現リテラルの除外リストを先に定義する。
- 2026-07-06T05:40:00Z — Deviation: Commit B 中に一括置換の自己破壊 2 件（parity eval と rename-leftovers eval の合成 fixture / 検出パターンが変異）を検出し、HEAD 復元で解消した。検査データ・fixture・検出器は「置換の対象外リスト」に最初から含めるべきという Commit A の学びが再確認された（C で検出器を明示的に再設計する）。
- 2026-07-06T05:40:00Z — Interpretation: 写像は計 8 系統（A: /aidlc。B: aidlc/spaces、aidlc-state.md、.aidlc-、aidlc-${、aidlc-init、skills/aidlc/、.aidlc/、aidlc/.）で「写像後 byte 一致」を維持（199 files ok、例外純増ゼロ）。AIDLC_ 環境変数と aidlc-docs・aidlc-workflows・AI-DLC は v2 互換ラベル・上流固有名として不変（要求のスコープ外）。
