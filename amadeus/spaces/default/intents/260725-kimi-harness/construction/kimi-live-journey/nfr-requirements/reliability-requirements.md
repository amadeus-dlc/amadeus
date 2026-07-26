上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Reliability Requirements — kimi-live-journey

> 上流入力の使用箇所: business-rules.md の BR-1/BR-4、business-logic-model.md の決定木、requirements.md の FR-9b を根拠とする。

## 対象の概要

live 検証の信頼性は「決定的 tier を壊さない」「実走結果が真正」に集約される。

## 信頼性の仕組み

- **決定的 tier では必ず skip**: skipReason が env とバイナリ実在を検査し、live を暗黙実行しない(business-rules.md BR-1)。CI が環境依存で落ちない
- **実走結果は実行から導出**: 実走ログを残し、推測で green を宣言しない(business-rules.md BR-4、requirements.md FR-9b)
- **失敗は調査対象**: `kimi -p` の非ゼロ終了は advisory にせず記録して失敗とする(business-logic-model.md 決定木)
