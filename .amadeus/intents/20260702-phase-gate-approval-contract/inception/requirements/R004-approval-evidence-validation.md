# R004 approval evidence の構造検査

## 要求

`state.json.construction.bolts[].taskGeneration.status` が `passed` の場合に、`evidence` へ `kind: approval` の項目が含まれることが `amadeus-validator` で検査される。

## 背景

Task Generation Gate の契約では、`passed` は人間承認済みを意味し、`kind: approval` の evidence を追加することになっている。
しかし現在の validator はこの対応を検査しないため、承認なしで `passed` と書かれた state でも構造検証は pass する。
既存の実データでは、`passed` 34 件すべてが `kind: approval` の evidence を持つことを確認済みであり、検査追加による既存成果物の fail は発生しない。

## 受け入れ条件

- `taskGeneration.status` が `passed` で `evidence` に `kind: approval` の項目がない場合、validator が fail を返す。
- `taskGeneration.status` が `ready_for_approval` の場合、approval evidence がなくても pass する。
- 既存の examples と `.amadeus/intents/**` が pass を維持する。
- 検査の失敗を確認する eval が `dev-scripts/evals/amadeus-validator/check.ts` に先行して追加され、実装前に失敗（RED）が確認されている。

## 依存

- R001

## 対応する対象境界

- SC-IN-005
- SC-IN-006

## 未確認事項

- approval evidence の `path` が指す成果物の種類を検査で限定するかは、Unit Design Brief と Construction で確定する。
