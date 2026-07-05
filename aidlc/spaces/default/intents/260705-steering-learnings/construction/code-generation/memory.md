<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T16:40:00Z — subagent（amadeus-developer-agent）へ functional-design の設計・triage 基準・対象ファイルをプロンプトで引き渡した（subagent は会話履歴を見られないため）。triage 母集団は実測 26 エントリで、requirements の「計 10 件前後」より多い。差は Tradeoffs / Open questions 見出しのエントリも全件母集団に含めたためであり、FR-4.1（全エントリ）に忠実な方を取った。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T16:40:00Z — functional-design の「code-generation 向け実行方針」（gate 承認済み）に従い、本ステージはステージ既定の契約から意図的に逸脱した: 実装コードを生成せず、steering 2 ファイル（team.md、project.md）を編集し、produces 既定 2 件に learnings-triage.md を追加した。詳細は code-summary.md に明記。
- 2026-07-05T16:42:00Z — デバッグ中に実行した amadeus-graph.ts compile が .agents/amadeus/tools/data/stage-graph.json へスコープ外の差分（phase memory の rules_in_context 追加）を生んだため、git checkout で revert した。本 Intent の変更は aidlc/spaces/default/{memory,intents} 配下に限定する（C-1）。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T16:55:00Z — reviewer iteration 1 は NOT-READY（重大 1 = cid:build-and-test:c3 が C-6 / BR-3 の「validator seam 差は steering へ反映しない」に違反 + triage #25/#26 の判定矛盾、中 1 = cid:approval-handoff:c1 が実在ステージ名の流用で出所不一致、軽微 1 = ピア協議回数）。指摘 1 は Corrections エントリを撤回し #25 を不採用（Issue 管理側）へ是正、指摘 2 は cid:reverse-engineering:c1（#4 の出所 stage、衝突なし）へ改名した。指摘 3（ピア協議 2 回 vs 3 回）は不採用: 集計単位は正典 multi-agent-trial-record.md §3.1 の実機確認表（協議往復 = 2 回。1 回目が Q1+Q2 の同時送信、2 回目が要求確定 4 問）に従っており、質問トピック数（3）ではなく協議往復数を数える正典の単位を維持する。根拠表の実例欄は正典と一致しているため変更しない。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
