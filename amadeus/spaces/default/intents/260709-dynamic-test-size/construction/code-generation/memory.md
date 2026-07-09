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
- 2026-07-10T08:20:00Z — Interpretation: Step 3 のプラン承認ゲートは team.md auto-gate-approval(「プラン承認含む」)に従い auto 承認で続行。プラン全文は record に push 済みで、最終の code-generation ゲート(delegate 経路)が包括検証する。
- 2026-07-10T08:20:00Z — Interpretation: 実装は Bolt worktree(base: origin/main、ブランチ bolt/dynamic-test-size)で行う(org.md Construction 規範)。record は main に無いため、設計成果物はサブエージェントプロンプトへ全文インライン(c2: 本線パス混入禁止)。
- 2026-07-10T08:55:00Z — Deviation: 赤 fixture は plan 例示の Bun.sleepSync でなく busy-wait を採用(静的 timer シグナル混入で静的 guard も赤化し、動的 drift の分離実証が崩れるため)。動的/静的の実証を分離するには fixture が静的シグナルフリーである必要がある — 知見。
- 2026-07-10T08:55:00Z — Interpretation: team.md 新工程 deslop を PR 前に conductor が実施。指摘1件(driftCount の open-code)を summary 消費へ簡約し、検証再実行で挙動不変を実証(20b453cf5)。
- 2026-07-10T09:15:00Z — Deviation: code-generation approve が workspace_requires ガードで偽陽性拒否(#731 と同クラス、コード未マージ bolt ブランチ変種)。delegate は着地済み。leader へ選択肢付き報告(推奨 A: PR #732 マージ → main を record へマージ → 正規再approve)。#731 へ本番実発エビデンスをコメント済み。approve は PR マージ待ちでパーク。
- 2026-07-10T09:50:00Z — Deviation: codex-3 レビュー NOT-READY 2件(identity wrapper seam / レポート非決定性)→ begin/finish セッション型 seam+隔離ヘルパー+決定性 sort へ是正、設計成果物へ伝播。教訓: seam は「初回消費者がいる」だけでは不十分で、拡張点が置き換え対象のライフサイクル(観測ウィンドウ)を実際に所有していないと飾りになる。並列 runner の成果物は順序を明示的に固定しない限り非決定 — artifact 化する出力には sort を最初から設計に入れる。
