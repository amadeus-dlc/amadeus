# Security Test手順 — nfr-kind-pruning

## 参照成果物と脅威範囲

`code-generation-plan` と `code-summary` のNFR-2を対象に、新規producer入力はkind欠落・不正値をfail-closedにし、legacy runtime入力は過少生成を避けてfail-safeに戻ることを検証する。認証、ネットワーク、秘密情報、データストア、外部依存は変更していないためDASTとIaC scanは適用外である。

## 静的・依存関係検査

```bash
bun run typecheck
bun run lint
git diff --exit-code -- package.json bun.lock
git diff --check
```

## 合格条件とデータ管理

型検査・lint・diff検査がexit 0で、新規依存やsecret-bearing設定が追加されていないこと。kind欠落・不正kindの敵対的fixtureはunit/integration test内だけで生成し、実データを使用しない。sensorが不足入力を黙って許可せず、runtime fallbackが必要成果物を過少化しないことを確認する。
