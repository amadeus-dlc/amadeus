# Delivery Planning — 明確化質問

上流入力(consumes 全数): requirements.md(FR 全16件が単一 PR で配送可能な規模であることの確認)、components.md(変更ファイル面 = 交差判定の入力)、unit-of-work.md(LOC 見積り 325-525 行 — Bolt 粒度判断の数値根拠)、unit-of-work-dependency.md(単一 Unit・依存なし)、unit-of-work-story-map.md(価値が1スライスで完結するジャーニー構成)

## Q1. Bolt 粒度

- A. **single-bolt**: 1 Bolt = Unit 全体。ADR-1 により精緻化スライスが消滅したため walking-skeleton Bolt がそのまま完全な配送物になる(scope-definition Q2 の skeleton-first 裁定と両立 — 残余集合が空)。self-feature の walking-skeleton gate は Bolt 1 に維持【推奨】
- B. two-bolts: スクリプトと CI 配線の人工分割 — どちらも単独で価値を出荷できない(UG single-unit 裁定と同根)
- X. Other

[Answer]: A — AUTO_DECIDED(questionId: dp-q1-bolt-granularity、decider: agent-recommendation)

## 裁定の記録

- decide-question 梯子で確定(グラント intent-grant-a62c587cfa45e9316dc381840bdf7745)。
- ユーザー承認: 2026-08-10T08:32:03Z(autonomy full 起動指示の実 HUMAN_TURN、audit seq 19)
