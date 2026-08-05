<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-04T23:18:00Z — ND 全 unit: nfr-requirements SKIP に伴い、各成果物の設計文脈は FD の BR 群 + ADR + 共通規約からの導出とし、存在しない上流の内容を発明しない fallback で統一。kind 別の成果物集合(packaging/spec = security のみ、library = security + logical-components)は engine の produces_kinds 判定に従った
- 2026-08-04T23:18:00Z — U3 ND: 変異系 TLC 実行は invariant ごとに逐次(直列)と確定 — 一時領域競合と負荷重畳偽赤の構造的排除。異常終了時の正本混入防止は「repo 外 OS temp への配置」を一次防御、finally 破棄を二次責務とする 2 層で確定
- 2026-08-04T23:18:00Z — U1 ND: head 解決の純関数入力を「handler が read で構成する (ref, predecessor) 対の配列」と確定(EvidenceIndex.refs は digest のみのため)。evidence store の git 管理は ADR-3 可逆性節を根拠に明記

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
