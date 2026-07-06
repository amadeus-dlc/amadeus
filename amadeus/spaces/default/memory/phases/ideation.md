# Ideation Phase Guardrails（Ideation フェーズの防護規定）

この規則は、`phase: ideation` 宣言を持つすべての stage が、対応する phase rule としてこの文書を import する場合に適用される。

## Grounding

- 意図、市場、実現可能性の記述は、出典（Issue、実データ、既存成果物）を明示する。
- 未確認の事実を確定として書かない。不明な値は `未確認` と記す。
- 推測で外部システム、利害関係者、依存関係を作らない。

## Decision Capture

- 確定した判断は、選択肢と選ばなかった理由を添えて decision として記録する。
- 未確定事項は放置せず、質問（grilling）または後続ステージへの明示的な引き継ぎにする。

## Scope Discipline

- スコープ外の発見は本文へ混ぜず、backlog または GitHub Issue へ切り出す。
