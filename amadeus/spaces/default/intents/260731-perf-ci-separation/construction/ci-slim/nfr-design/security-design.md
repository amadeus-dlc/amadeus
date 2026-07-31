# Security Design — U3 ci-slim

上流入力(consumes 全数): business-logic-model.md(U3 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-3/AC-3 と FD の照合ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 脅威面の評価

- 削除のみの変更(business-logic-model.md ロジック1)— 権限・secrets・外部送信の変更なし。攻撃面は縮小方向のみ
- branch protection(CI Success のみ要求)に不介入 — 保護水準は不変

## 検証

- ci-success needs 8項の集合一致(ロジック2-3)が「保護される検証の非弱体化」の機械証明
