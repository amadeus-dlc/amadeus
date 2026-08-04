<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-03T10:30:00Z — Issue #1717 と承認済み scope-document を要件の正本として扱う。Issue は現在も OPEN / in-progress で、Phase 1〜3 と接続不能時の後続 Issue 条件が維持されている。
- 2026-08-03T10:41:05Z — ユーザー裁定Aにより、Claude Code TUIのrunnerによる暗黙opt-inを廃止し、他のlive pathと同じ専用環境変数による明示opt-inを正準契約とする。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-03T10:32:00Z — 初稿のQ2はIssueの受け入れ条件で確定済み、Q3は後段の設計判断だったため削除した。ユーザー訂正に従い、質問を正本間の矛盾・要件上の抜け漏れに限定した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-03T10:30:00Z — transport 統一ではなく共通 policy/lifecycle と harness × transport adapter の分離を維持する。共通契約の弱体化を避けつつハーネス固有能力差を表現できるため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-03T10:41:05Z — 要件を阻害する未解決の矛盾・抜け漏れはない。台帳の具体パスとadapter interface形状はApplication Designで確定する。
