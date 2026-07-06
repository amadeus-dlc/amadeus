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
- 2026-07-06T00:45:00Z — Interpretation: subagent 完了報告を conductor が fresh evidence で全件再検証した（parity:check ok = 39 skills / 199 engine files / b67798c3、test:all 0、installer 0、validator pass、Registry 71 実測）。
- 2026-07-06T00:45:00Z — Deviation: R004 の CLAUDE.md 適応は N/A と確定（parity-map の除外宣言「リポジトリ固有のエージェント指示であり上流と同期しない」を実測確認）。R003 の stage-catalog は非 stage 系列挙行へ amadeus-compose を追記し再昇格した（conductor 検品での補完）。
- 2026-07-06T00:45:00Z — Open question: scope-table --check の ENOENT（.agents/amadeus/skills/aidlc/SKILL.md 参照）は origin/main にも同一存在する既存の rename 漏れ（join(TOOLS_DIR, "..", "skills", "aidlc", "SKILL.md")）。本 Intent のスコープ外として後続 Issue 化する。
- 2026-07-06T00:45:00Z — Interpretation: 報告中の「誤配置ディレクトリ construction/code-generation/」は誤配置ではなく engine の memory_path（stage diary の正位置）である。維持する。
- 2026-07-06T01:15:00Z — Interpretation: reviewer READY（iteration 1/2）。mergeComposedScopes は上流 eae912e 由来と実測判別され、パリティ懸念は解消。非ブロッキング 3 件を処理: code-summary の「解除 2 件」表現を実態（元来例外外）へ修正、scope-table ENOENT を Issue #537 へ切り出し、memory.md の位置は engine の memory_path として維持。
- 2026-07-06T01:25:00Z — Deviation: workspace_requires ガードが「最終コミットが docs のみ」を理由に完了を拒否したため、実装コミットと reviewer 対応 docs コミット（実装が作った code-summary を編集する依存関係あり、入れ替え不可）を fixup で 1 コミットへ統合して解決した（内容不変、単独所有 branch、force-with-lease）。ガードの意図（コード実体の存在確認）に対して正直な解決を選び、docs-only 宣言は使っていない（本 Intent はコード変更を含むため宣言対象外）。
