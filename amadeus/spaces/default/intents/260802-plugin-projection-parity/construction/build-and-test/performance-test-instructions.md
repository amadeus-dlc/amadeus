# Performance Test Instructions — plugin projection parity

## 適用判断

`code-generation-plan.md` と `code-summary.md` の上流要件にはlatency、throughput、capacity、resource ceilingなどの性能NFRがない。本変更は短命なBun CLIによるfile projection修復であり、service load test、soak test、autoscaling検証は非適用である。

## 回帰監視

専用performance gateは設けない。`bun run test:ci` のwall-clockは環境負荷とcold compileの影響を受けるため合否指標にしない。既存test timeoutを悪化させる再現性のある回帰が見つかった場合だけ、同一環境・同一対象でbaselineと変更後を比較し、別Issueへ切り出す。

## Test dataと環境

性能用のproduction data、外部load generator、長時間稼働環境は使用しない。決定性とGit cleanlinessは性能ではなくintegration／E2Eの機能・安全性契約として検証する。
