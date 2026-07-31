# Scalability Design — U10: diagnostic-logs

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の要件（複数 process 並行・Store 肥大化の責務境界）に対する設計。本 Unit は容量設計対象を持たず、2 点の固定のみ行う。

## 複数 process 並行の設計

- CLI tool・hook・subagent の各短命 process が独立に emit しても、Store 書込は shard・lock の共通機構（U4 hardening 済み LocalLogExporter）に従う。Exporter 層で新たな共有状態を導入しない（business-logic-model.md「複数 process での emit」、BR-11）
- Exporter 実装は U4 の hardened LocalLogExporter をそのまま利用し、複製・改変しない（tech-stack-decisions.md § Exporter 実装）。複製による機構の分岐を防ぐ

## Store 肥大化の責務境界

- retention／rotation は Relay（U11、FR-RLY-1）の責務であり、本 Unit は append のみ行いサイズ管理機構を持たない。肥大化対策の欠落を本 Unit の欠陥とみなさない（BR-12）
- Store サイズの閾値監視・圧縮・分散配置は本 Unit では扱わない（scalability-requirements.md § 非目標）

## 非目標の明文化

- 水平スケールの容量設計対象を持たない（常駐 process・蓄積キュー・ネットワーク経路なし）。本書は上記 2 点の固定をもって完了条件とする
