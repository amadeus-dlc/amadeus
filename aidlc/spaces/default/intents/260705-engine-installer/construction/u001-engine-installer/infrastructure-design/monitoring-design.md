# Monitoring Design — u001-engine-installer（260705-engine-installer）

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)

## 適用判断

常駐監視・メトリクス・アラートは不適用とする（単発 CLI。Right-Sizing）。

## 代替（実行時の可観測性）

- 工程の逐次表示と exit code（interaction-spec）が実行単位の可観測性を担う。
- 導入後の健全性確認は doctor（スモーク + README の手動手順）と amadeus-validator が担う（D6 の 3 層分担）。
- 将来の OTel 計装は #441 が扱う（本 Intent の成果 = 正準手順 + eval がその検証土台）。
