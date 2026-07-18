# Performance Requirements — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- PNR-W1(NFR-3 / C-17): session slot < batch 時は wave/逐次回収を許容し、正しさを並行度に依存させない(`business-logic-model.md` の wave 節。受け入れ = 並行度 1 と N で同一結果になることの検証設計 — build-and-test で referee check の per-unit 性により実測)
- PNR-W2: dispatch 前の resolve 呼び出しは 1 回のみ(バッチ毎)— unit 毎の再実行をしない(prose 手順の効率規定。受け入れ = SKILL 手順文の実在)

## 検証

- スループット数値目標は設けない(常駐サービスなし・バッチ処理は referee 既存契約 — 新しいマジックナンバー禁止)— 根拠付き N/A
