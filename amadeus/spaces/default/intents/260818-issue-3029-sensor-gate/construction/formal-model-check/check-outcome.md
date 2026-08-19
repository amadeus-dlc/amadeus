# Formal Model Check — 実行結果

## 結論

`NOT_APPLICABLE`。TLC は起動しない。

## 根拠

直前の `tla-authoring` applicability receipt は `impl-only` であり、subject は `FR-2` のみである。FR-2 は既存の audit event schema を維持する実装変更で、TLA+ の状態遷移、不変量、model/config の意味を変更しない。

したがって formal-model-check の Stage body (1) にある「`impl-only`、`non-target`、または `not-applicable` は `NOT_APPLICABLE` を記録して TLC を起動しない」という分岐に従う。矛盾する applicability outcome はない。

## 証跡

- Applicability route: `impl-only`
- Subject: `FR-2`
- Requirements identity: `sha256:1db156fcd70d1a013af46e6c52a7ae19de6b996589047026b09f333235653761`
- Terminal-route receipt: `sha256:f258519902a8a014fa9746030866f43ea19eed9f586c30a468139ef4eb9c636f`
- `amadeus/spaces/default/specs/tla/` の model/config は変更していない

## 起動しなかった処理

- `run-model-check.ts` による TLC 探索
- model-map への登録・改訂

これは検査の省略ではなく、適用性評価の terminal outcome による正規の分岐である。
