<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-02T22:41:00Z — plugin parityの合格条件は動的な自己修復だけではない; Claude Codeのdogfood状態と同様に決定的なplugin投影をversion管理し、fresh worktreeで初回から利用可能かつ起動後もGit cleanであることを正しいゴールとして扱う
- 2026-08-02T22:50:37Z — Codex plugin runnerの正規配置はproject-root `.agents/skills` である; generic composeが生成した `.codex/skills` は非正規のruntime projectionであり、コミット対象ではなく生成先を修正する対象として扱う

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-02T22:41:00Z — 完了済みIntentはengine上で再開できないため同じIssueの修復Intentを新設した; 元Intentの誤った完了履歴は改変せず、#2018を再オープンして追補の監査線を分離した

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-02T22:41:00Z — packageの0-plugin baselineとself-repositoryのdogfood projectionを別境界として保持する; neutral bundleを全利用者へ強制せず、opt-in済みself-install面だけをcommitted projectionとして管理する

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
