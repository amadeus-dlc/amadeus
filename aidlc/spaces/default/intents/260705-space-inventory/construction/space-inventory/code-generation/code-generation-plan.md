# Code Generation Plan — space-inventory

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-rules.md](../functional-design/business-rules.md)

## 計画

D1〜D6 を棚卸し表の順に適用する。D5 は当初の include 削除案が parity fail（実測）だったため、実データ側の 3 ファイル新設へ転換した（questions Q1、memory Deviations）。検証は grep（廃止参照ゼロ）、parity:check、test:all で行う。
