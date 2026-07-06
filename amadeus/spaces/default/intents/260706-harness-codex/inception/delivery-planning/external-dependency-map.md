# External Dependency Map — 260706-harness-codex

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

## 外部依存

| 依存 | 種別 | 状態 | 手当て |
|---|---|---|---|
| awslabs/aidlc-workflows の b67798c3（dist/codex） | 上流 repo（読み取りのみ） | 取得可能（gh api で実在確認済み） | FR-1 の fresh clone。ネットワーク断時は Bolt を中断し再開（成果物は clone 完了後にのみ生成） |
| GitHub（PR / CI） | サービス | 稼働中 | pr-gate-discipline.md の監視手順 |
| 人間（Maintainer） | 承認 | auto 委任 + merge は人間 | 4 イベント報告と中継承認の既存経路 |

他 Intent への依存はない（非接触確定）。本 Intent の成果物への依存者は Phase 2 後続 Intent（設計確定成果物を引き継ぐ）。
