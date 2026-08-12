# Units Generation — 明確化質問

上流入力(consumes 全数): requirements.md(FR-CBG 全16件の単一機能凝集 — Q1 判断の入力)、components.md(コンポーネント5件が単一配送単位である構成)、component-methods.md(predicate/CLI の署名一体性)、services.md(常駐サービス不在 — 分割理由の不在)、component-dependency.md(依存が全て単方向の同期 import/spawn — 分割線の不在)、decisions.md(ADR-1 が detect-ci-changes 無改修を確定し、分離可能スライスが消滅)

## Q1. Unit 境界

- A. **single-unit**: 1 Unit(kind: service)— predicate + CLI + CI ジョブ + テスト + 落ちる実証を単一 Unit に統合。検出と CI 配線は片側だけでは利用者価値を出荷できない境界のため統合する(cid:intent-capture:c4-2 / units-generation:c1 (a))【推奨】
- B. two-units: 実装と CI 配線を分割 — どちらも単独では価値を出荷できない
- X. Other

[Answer]: A — AUTO_DECIDED(questionId: ug-q1-unit-boundary、decider: agent-recommendation)

## 裁定の記録

- decide-question 梯子で確定(グラント intent-grant-a62c587cfa45e9316dc381840bdf7745)。
- ユーザー承認: 2026-08-10T08:32:03Z(autonomy full 起動指示の実 HUMAN_TURN、audit seq 19)
