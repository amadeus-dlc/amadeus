<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T17:00:00Z — 質問への回答チャネルは #497 試行規約のピア協議（leader + engineer1,2 宛、期限 15 分、回答 1 件成立）とした; bugfix scope で intent-statement / scope-document は SKIP のため、Issue 3 件とディスパッチ定型文（state-init 宛 DECISION_RECORDED 転記済み）が上流入力を代替する
- 2026-07-05T17:00:00Z — Q1 の技術前提（git rev-parse --git-common-dir が worktree から主リポジトリ名 amadeus に解決できること）を要求段階で検証した; 実現不能な修正方式を要求として確定しないため
- 2026-07-05T17:05:00Z — ピア協議の回答 2 件（engineer1・engineer2、全問 A 一致）の条件・補足は FR-2.2〜2.4（宣言の決定論性・人間承認由来の証拠・audit 記録）と NFR-2（実 CLI 駆動 eval）として要求に昇格させた; 当事者 2 名の実例に基づく条件のため要求レベルで固定する価値がある

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T17:10:00Z — reviewer 指摘 3（FR-3.1 の stub 単位）は「単一 stub が 9 produces を代表する」という提案文言ではなく、実前例 3 件の形（produces 名ごとの 9 stub 一式）で明確化した; 前例の実態が提案と異なるため、Design Honesty（実在する契約を根拠にする）を優先
- 2026-07-05T17:10:00Z — reviewer 指摘 1 に従い、承認系運用プロトコル（gate 承認は leader エスカレーション、AskUserQuestion 直接提示なし。leader 運用注意 2026-07-05T16:53:11Z、#497 確定判断 6・8）を requirements の Constraints から本 diary へ移した; B001〜B003 の実装制約ではなくセッション運用ルールのため

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T17:00:00Z — Q2 で scope 単位 SKIP（Issue #499 候補 1）ではなく docs-only 宣言例外（候補 2）を推奨した; refactor scope は実コードのリファクタリングにも使われ、docs-only は scope ではなく Intent の性質であるため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-05T17:00:00Z — Q2 の宣言例外が「大きな契約変更」（leader への承認系エスカレーション対象）に当たるかはピア協議の異論有無で確定する; scope 契約・上流パリティに触れないため対象外と暫定判断
