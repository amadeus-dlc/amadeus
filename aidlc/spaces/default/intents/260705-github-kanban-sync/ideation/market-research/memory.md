<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T01:52:44Z — 上流入力 intent-statement.md（../intent-capture/intent-statement.md）の成功指標 1・4 を代替評価の基準に使った; 内部ツールのため市場規模推定は省き、調査を「既存代替との比較」と「方式前提の持続性」に限定した（stage prose の質問例のうち市場サイズ系は不適用と判断）
- 2026-07-05T01:52:44Z — 鮮度表示（table-stakes D）は Projects v2 のカスタムフィールドで満たす前提とした; 専用 UI を作らない
- 2026-07-05T02:05:00Z — 人間の指示により、kanban 機能はこのリポジトリ内だけで起動する開発ツールに限定する; Amadeus 本体の機能（skills/amadeus*、.agents/amadeus/ エンジン、昇格先、parity 対象）としては実装しない

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T01:52:44Z — Build 採用（sync 部分だけ自作、表示は純正 Projects v2）; 汎用 OSS 採用は固有部分（intents.json / aidlc-state.md の解釈）が消えず依存だけ増えるため却下
- 2026-07-05T01:52:44Z — 書き込みは gh project item-edit ではなく gh api graphql の mutation batch を採用予定; CLI は 1 呼び出し 1 フィールドの制約があるため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-05T01:52:44Z — Actions 補完（後続候補④）を実施する場合は GITHUB_TOKEN では Projects にアクセスできず PAT / GitHub App 管理が必要; 後続 Intent の判断材料として記録
