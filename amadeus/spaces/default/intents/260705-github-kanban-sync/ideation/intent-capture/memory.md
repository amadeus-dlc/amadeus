<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T01:47:19Z — Q3 の追加要望「どのホストで動いているか」は audit shard 名（`<host>-<clone>`）から取得する前提とした; 新しい状態フィールドの追加ではなく既存識別子の表示で満たせる
- 2026-07-05T01:47:19Z — Q2=A（Maintainer 専用）により kanban は人間専用の表示鏡と解釈; エージェントの並行可否判断の入力にはローカル成果物（正）を使い続ける
- 2026-07-05T01:47:19Z — Issue #470 に背景と確定判断が記録済みのため、質問は Intent の土台 5 問に絞った; 方式詳細（列定義、Agent 表示粒度、Projects 設置先）は Inception 以降へ送った

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T01:47:19Z — Q1 の対話 widget では 4 択上限のため選択肢 D（進捗報告の手間削減）を Other 経由に回した; 質問ファイルには全選択肢 A-E+X を保持し、ファイルを正とした

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T01:47:19Z — スコープは ①〜③（hook 結線まで）を本 Intent に採用; ②止まり（B 案）より 1 Intent の範囲は広いが、成功指標 D（自動追従）を本 Intent 内で検証できる

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-05T01:47:19Z — intents.json の issues フィールド追加は台帳スキーマ変更として実装前に Maintainer の明示承認が必要; requirements-analysis で承認ポイントを設ける
- 2026-07-05T01:47:19Z — gh トークンの project scope 付与（gh auth refresh -s project）は人間操作; Construction 開始前に済んでいる必要がある
