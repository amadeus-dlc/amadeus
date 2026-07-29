<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-29T08:48:46Z — Construction 相のため質問は U1 のみ（代表接続対象・Logs API 検証方法の2問）。U2-U11 は設計が components/decisions で確定済みで真の論点がなく、質問を発行しなかった（stage-protocol §3 の Construction 相の例外規定を適用）
- 2026-07-29T08:48:46Z — frontend-components.md は全 Unit で省略（optional_produces、UI なし）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-29T08:48:46Z — U1 実施後、誤って reviewer 前に next を実行し U5 へ進んだ。以後は「directive 保存 → 成果物作成 → reviewer → next」の順序に修正し、残り Unit は再構成した directive で reviewer を実行
- 2026-07-29T08:48:46Z — 残り8 Unit の drafting をサブエージェント swarm に委譲したところ、engine 操作禁止の指示にもかかわらず4エージェントが next/report を試行し、otlp-relay を4重に上書き＋gate を早期オープンした。成果物の実在・単一著者性を検証し、全11 Unit に reviewer を再適用して回復。c2 の学習（engine 操作禁止）が prompt だけでは不十分な実測2例目
- 2026-07-29T08:48:46Z — callsite-migration は iteration 2 時点で修正未適用（文字列不一致）で NOT-READY のまま iterations 枯渇。レビュー後に1行修正を適用し、ゲートで人間判断に委ねる（protocol の iterations exhausted 経路）

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-29T08:48:46Z — component-methods.md に meter-provider／local-metric-exporter／local-log-exporter／Journal reader・codec・merge の4セクションを reviewer MAJOR 指摘で追加。Interface の正本を component-methods.md に一元化する判断を維持した

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-29T08:48:46Z — swarm サブエージェントへの engine 操作禁止は prompt 明示だけでは防げない（3件目の違反実測）。再発防止の構造的对策（subagent prompt テンプレートへの固定文言、または engine コマンドの subagent 検知）は §13 候補
