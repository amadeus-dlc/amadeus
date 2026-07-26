上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices

# External Dependency Map — 260725-kimi-harness

## 外部依存の一覧

| 依存 | owner | 状態 | 消費する Bolt | 緩和 |
|---|---|---|---|---|
| kimi バイナリ 0.28.1+ | ユーザー環境 | 充足済み(実測) | B2, B4, B5, B6 | doctor フロアで検査 |
| bun on PATH | ユーザー環境 | 充足済み | 全 Bolt | onboarding に明記 |
| 実 `~/.kimi-code/config.toml` への配線許可 | ユーザー | 承認済み(feasibility Q1。バックアップ・マーカー・除去手順付き) | B2 | B3 の機構がそのまま手順を提供 |
| live 検証のクレジット | ユーザー | 承認済み(feasibility Q2。probe + journey 実走まで) | B2(probe), B5(dogfood), B6(journey) | 範囲超過時は都度承認 |
| GitHub(ミラー Issue #1474) | 本チーム | 作成済み | 全 Bolt(記録) | なし |

外部チーム・外部 API・データ availability のゲートは存在しない(AI 完結の intent)。

## 判定

全ての外部依存は充足・承認済みであり、Bolt 開始をブロックするゲートアイテムはない。クレジット消費(CC-1 の範囲)のみ、各 Bolt での使用時に範囲内であることを都度確認する。
