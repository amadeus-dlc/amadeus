# External Dependency Map — OTel Upstream 統合

上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`（参照済み）

外部依存はなし（Q4-A）。AI 内包の initiative であり、外部 API・データ可用性・外部チーム承認・納期を持つ項目は存在しない。

## 軽量記載項目（ゲートではない）

| 項目 | 内容 | 影響 Bolt | 備考 |
|---|---|---|---|
| npm 依存追加 | `@opentelemetry/api` ファミリー（＋採否次第で api-logs）を bun.lock へ追加。lead time なし | Bolt 1 | FR-DST-1: bundle 取込＋ADR 文書化が義務。version pin 方針は Phase 1 ADR で確定 |
| GitHub Issue 連携 | 親 Issue #1672・Phase sub-issue（#1673-#1678）との整合 | 全 Bolt | Issue 側の完了条件チェックリストは Bolt 完了時に更新候補（ミラー Issue #1679 と併せて扱う） |
