# slo-config — Issue #1048(根拠付き N/A)

上流入力(consumes 全数): `../../construction/installer-enum-extension/nfr-design/performance-design.md`、`../../construction/installer-enum-extension/nfr-design/security-design.md`、`../../construction/installer-enum-extension/nfr-design/reliability-design.md`、`../../construction/installer-enum-extension/infrastructure-design/monitoring-design.md`、`../../construction/installer-enum-extension/infrastructure-design/infrastructure-services.md`。

## 判定

N/A — ランタイムサービス・SLI 不存在(monitoring-design.md / infrastructure-services.md の反証可能根拠 — 単発 CLI、デプロイ基盤なし)につき対象不存在。timeout・単発 run 成功を昇格させない(observability:c3)。実在サービス導入時に本 N/A は失効する(失効条件明記)。

## 代替面(実在する品質シグナル)

CI の既存ジョブ(typecheck / lint / drift guards / tests / coverage gates)が退行検出を担う(ci-pipeline:c2 正本、main 上の失敗は loud 可視化 = c3)。
