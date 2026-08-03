# Performance Test Instructions — advisory-human-choice

## 適用性評価

`code-generation-plan.md`と`code-summary.md`の対象は短命なCLIとhookであり、HTTP service、同時接続、throughput、latency percentileのNFRは定義されていない。このためload、stress、soak testは適用しない。未定義の数値目標を後付けしない。

## 実行する性能観測

- focused unit/integration/E2Eとfull regressionのwall-clockを記録する。
- Codex `UserPromptSubmit` hookの追加相関処理が、既存の30秒hook/test timeout内で完了することをprocess境界testで確認する。
- Formal Model Checkは有限探索の正しさを優先し、速度をrelease gateにしない。completion markerとstate統計が揃った`NOT_DETECTED`だけを受理する。

## 成功条件

- 新しい無限待機、deadlock、hook timeoutがない。
- full regressionのtimeoutは、直列120秒再実行で決定的failureと区別できる。
- 性能NFRが将来追加されるまでは、wall-clock値を合否閾値に用いない。

## 非対象

- production-like環境の負荷試験。
- CPU、memory、network throughputのcapacity planning。
- Formal Model Check探索範囲やTLCアルゴリズムの変更。
