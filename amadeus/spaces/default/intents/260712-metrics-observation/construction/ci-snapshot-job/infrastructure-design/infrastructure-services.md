# Infrastructure Services — metrics-observation

| サービス | 用途 | 変更 |
|---|---|---|
| GitHub Actions | job 実行(既存 ci.yml 拡張) | job 1つ追加(新 workflow なし — D3) |
| GitHub artifact store | `amadeus-coverage-report` による coverage/tests totals の job 間転送 | 既存 upload-artifact の path 2行追加(F1 是正済み設計) |
| GITHUB_TOKEN | main への push | job 単位 contents: write(S-1) |
| pip(lizard) | ccn collector | 変更なし(既存 pin 消費) |

外部サービス新設ゼロ(external-dependency-map と一致)。
