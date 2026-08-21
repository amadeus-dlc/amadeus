<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-21T00:10:00Z — swarm finalize のローカルマージ(main checkout の HEAD 必須 + local trunk merge)は本プロジェクトの確定済み配送規範(FR-X-2: Bolt PR + merge queue、cid:ci-pipeline:strict-up-to-date-before-merge)と構造的に衝突するため実行せず、referee は resolve/prepare/acquire/confirm/check/settle の pool 管理までを使い、配送は per-unit PR(create → converge → queue)で行った — 既決要件の機械適用(unique derivation)として自律実施、engine は finalize なしでも pool terminal で次 batch を発行した実測
- 2026-08-21T00:10:00Z — U2 で第6の衛生クラスを実測: plugin .md prose 内の repo-root 相対 `plugins/<x>/tools/` パスリテラルは t146 が拒否(sensor manifest の glob 分岐も対象)。是正は `*/plugins/...` の anchored glob 形(本番 matchesGlob で意味論保存を事前検証)
- 2026-08-21T00:10:00Z — U4 で patch coverage の error-path クラスを実測: fail-closed 枝・usage エラー枝は追加行として UNCOVERED になりやすく、TDD 既定(エラーパスも実行可能な振る舞い)どおり公開 seam 経由のテストで閉じ、注入→赤→revert の落ちる実証 1 セットを同梱した
- 2026-08-21T00:10:00Z — record 成果物(plan/summary)は swarm 配送では事後作成になる — 上流 §12a が code-summary を FOLLOW-UP 閉包点に名指しするパターンが 2 unit で発生し、いずれも同 iteration 内の追補 + 再レビューで閉じた(c5-followup-routing (c) の適用)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-21T00:10:00Z — swarm finalize の merge 段を PR 配送で置換(上記 Interpretations 参照 — 確定済み regulations の適用であり新規裁量ではない)。SKILL の finalize 契約からの乖離として明示記録

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
