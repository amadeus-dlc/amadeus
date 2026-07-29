# Scalability Requirements — U10: diagnostic-logs

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 対象と理由

本 Unit は短命 process ごとの同期 1 行 append のみを行い、常駐 process・蓄積キュー・ネットワーク経路を持たないため、水平スケールという観点の容量設計対象を持たない。以下の 2 点のみを固定する。

## 要件

| 項目 | 要件 | 根拠 |
|---|---|---|
| 複数 process 並行 | CLI tool・hook・subagent の各短命 process が独立に emit しても、Store 書込は shard・lock の共通機構（U4 hardening 済み LocalLogExporter）に従い、Exporter 層で新たな共有状態を導入しない | business-logic-model.md「複数 process での emit」、BR-11 |
| Store 肥大化 | retention／rotation は Relay（U11、FR-RLY-1）の責務であり、本 Unit は append のみ行いサイズ管理機構を持たない。肥大化対策の欠落を本 Unit の欠陥とみなさない | FR-RLY-1、BR-12 |

## 非目標

- Store サイズの閾値監視・圧縮・分散配置 — 本 Unit では扱わない（U11 の Relay retention に委譲）
