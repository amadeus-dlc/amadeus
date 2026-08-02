# Intent Backlog — otel-meta-schema

上流入力(consumes 全数): intent-statement.md、stakeholder-map.md — バックログ項目は intent-statement の6項目を Must 単位に分解した。

## バックログ(Must 対応)

| # | 項目 | 依存 | リスク |
|---|---|---|---|
| B1 | resource 組み立ての拡張+harness 注入 seam(walking skeleton 含む) | — | **高**(中立境界の設計) |
| B2 | span attributes 直載り(intent/stage/bolt) | — | 低 |
| B3 | exception 3属性化+stacktrace redaction | — | 中(redaction 方針の実装) |
| B4 | subagent.started イベント+lifetime スパン | B1(agent.role/resource 前提) | 中(プロセス境界跨ぎ) |
| B5 | Metrics 5計器(token usage はハーネス供給) | B1(seam) | 中 |
| B6 | docs/reference telemetry スキーマ章 | B1-B5 | 低 |

## 受け入れの外形

各 Must は #1868 の該当節を受け入れ基準の正本とし、requirements 段でテスト可能形へ固定する。全 Must で registry drift guard / patch coverage / TDD 既定を適用。
