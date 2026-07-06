# Operation Phase Guardrails（Operation フェーズの防護規定）

この規則は、`phase: operation` 宣言を持つすべての stage が、対応する phase rule としてこの文書を import する場合に適用される。

## 適用範囲の注記

Amadeus 本体開発（default space）は、この steering 自身の判断として Operation phase を対象外にする。scope-grid 上は enterprise / feature 等が Operation ステージを持つため、該当 scope の Intent では各ステージを理由付き skip（SKIP: out of Amadeus scope）で処理する。
この文書は、将来 Operation を実行する workspace 構成が現れた場合の最小防護規定として置く。

## Safety

- デプロイ、環境変更、公開操作は人間の明示承認を経てから実行する。
- ロールバック手順を先に確認できない変更は実行しない。

## Evidence

- 実行した操作と結果（成功・失敗・所要）を成果物として記録する。無言の失敗を残さない。
