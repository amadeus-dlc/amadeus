# Deployment Pipeline Questions — harness-provenance

上流入力(consumes 全数): `ci-config`、`quality-gates`、`deployment-architecture`、`cicd-pipeline`。

## 明確化不要判定

質問は0件。`deployment-architecture`と`cicd-pipeline`はapplication infrastructureを非該当とし、正本→6 dist→4 self-install→GitHub Release/npmをpromotion経路として確定している。`ci-config`と`quality-gates`は既存`.github/workflows/release.yml`の人間起動releaseと、`main`へのsquash merge前ゲートを確定している。

## 既決事項

| 項目 | 決定 |
|---|---|
| Deployment strategy | versioned packageのcontinuous delivery。人間起動release |
| Promotion | source → dist → self-install → main CI → GitHub Release/npm |
| Production approval | `release.yml`の`workflow_dispatch`を人間が起動 |
| Rollback | 通常PRでrevertし、再生成・CI・互換検証後に新しい修正版をrelease |
| Feature flags | 非該当。常駐service/traffic splitがなく、manual overrideは診断入力でありrelease flagではない |

## 質問

なし。blue/green、canary、rolling、dev/staging/prod環境、AppConfig、CloudWatch Evidentlyを導入する要件も実体もない。
