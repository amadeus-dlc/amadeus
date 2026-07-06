<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T08:00:00Z — 置き場所の確定はディスパッチが functional-design（ピア協議可）へ割り当てているため、requirements では判断基準 3 点（language-policy の対象範囲整合、上流同名 path の分かりやすさ、既存 docs 体系との責務分離）の定義に留めた。
- 2026-07-06T08:00:00Z — first-workflow の実測は「利用者が再現できる導線」を優先し、installer 導入からの実コマンド実行（Q1 = A）とした。LLM 依存部（conductor 会話）は説明とし、決定論的なエンジン出力だけを実物として貼る解釈を確定。
- 2026-07-06T08:00:00Z — 執筆順を目次 → introduction → getting-started → first-workflow の直列（C-4）にし、実測環境（隔離 workspace）を後半 2 章で再利用する構成にした。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T08:15:00Z — stage prose の質問フォーマット（[Answer] 空欄で作成 → 人間が記入）を意図的に省略し、自己回答済みの questions ファイルとして作成した（人間不在の多体連携運用。team.md の質問プロトコルに基づき自己判断 → gate の人間承認で最終確定、前例 = 260706-docs-lang-guide 以降の docs 系 Intent）。X. Other 選択肢は reviewer 指摘を受けて追記した。
- 2026-07-06T08:15:00Z — 消費した上流成果物は business-overview / architecture / code-structure（codekb、3366cd69 基準へ鮮度確認済み）。ガイド本文の記述の正は codekb ではなく実体（skill、エンジン、installer、README、docs/amadeus）とする。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
