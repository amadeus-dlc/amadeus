# Business Logic Model

## 目的

`taskGeneration.status` が `passed` の場合に人間承認の evidence が存在することを、validator の構造検査として機械的に確認できるようにする。

## 対象 Unit

U002 approval evidence の検査。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | validator が `state.json.construction.bolts[].taskGeneration` を読み、`status` が `passed` の項目の `evidence` に `kind: approval` が含まれるかを検査する。 | `.amadeus/intents/**/state.json` | 検査結果（pass または fail と対象 Bolt の特定情報） | R004, UC005 |
| BL002 | `status` が `ready_for_approval` の項目は、approval evidence がなくても pass とする。 | `.amadeus/intents/**/state.json` | 検査結果（pass） | R004, UC005 |
| BL003 | eval が fixture の state.json から approval evidence を除去し、validator が fail することを確認する。実装前に失敗（RED）を記録する。 | `examples/03-inception-completed` 由来の fixture | eval 結果（RED の記録、実装後は GREEN） | R004 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| `state.json.construction.bolts[].taskGeneration` | 検査対象の Task Generation Gate の状態と evidence 配列。 | R004 |
| eval fixture | `dev-scripts/evals/amadeus-validator/check.ts` が一時ディレクトリへ複製して改変する固定入力。 | R004 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| 検査結果 | `passed` と approval evidence の対応の pass または fail。fail 時は対象を特定できる情報を含む。 | Agent の補修判断、CI |
| eval 結果 | 改変ケースの fail 確認と、既存 fixture の pass 維持の確認。 | `npm run test:it:amadeus-validator`、`npm run test:all` |

## 未確認事項

なし。
