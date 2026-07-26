上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices

# Team Allocation — 260725-kimi-harness

## 実行形態

ソロモード(team-formation はスコープで SKIP)。mob は編成しない(approval-handoff:c3 — 未確定の named mob や schedule は捏造しない)。全 Bolt は amadeus-developer-agent(AI)が実装し、conductor(本セッション)がオーケストレーションと検証を担う。

## Bolt 割当

| Bolt | 実装 | 検証 | 備考 |
|---|---|---|---|
| B1 kimi-harness-definition | amadeus-developer-agent | conductor + ユーザー( skeleton ゲート) | walking skeleton。単独・ゲート付き |
| B2 kimi-hook-adapter | amadeus-developer-agent | conductor + 契約テスト | live capture はユーザーの実 config を使用(Q1 承認済みの手順で) |
| B3 setup-hooks-merge | amadeus-developer-agent | conductor + 単体テスト | — |
| B4 core-harness-enums | amadeus-developer-agent | conductor + 分岐テスト | — |
| B5 distribution-enumeration | amadeus-developer-agent | conductor + dogfood 実機 | — |
| B6 kimi-live-journey | amadeus-developer-agent | conductor + 実走 | クレジット消費は CC-1 の範囲 |
| B7 kimi-harness-docs | amadeus-developer-agent | conductor + ユーザー | — |

## エスカレーション

- 要件・設計からの逸脱が必要になった場合: conductor が作業を止め、ユーザーへエスカレーション(team.md P3)
- 不可逆操作(PR マージ等): 都度ユーザーの明示承認(team.md P4)
