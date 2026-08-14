# TLA+ 適用性評価

## 識別子と対象

要求 identity 抽出で安定識別子 `FR-1` から `FR-7` を確認した。形式モデル対象として `FR-1` と `FR-2` を選択し、`subjects.json` の subject identity は `sha256:7de7b5e306137dabd5fb0866bbf86e7bbdd4609255a10d0026650f6d7a63b368` となった。

- `FR-1`: sensor terminal 行を共有状態として読む gate が、無音の安全性違反を許す経路を扱うため選択した。
- `FR-2`: 同じ拒否経路の診断可観測性であり、`FR-1` と同一 subject series として選択した。
- `FR-3`〜`FR-7`: 正常系不変、advisory 不変、コメント同期、TDD、配送同一性であり、新しい並行・再開可能状態機械を定義しないため対象外とした。
- `NFR-1`〜`NFR-3`: 要求本文では箇条書きラベルで、identity extractor が安定 section ID として抽出しない。内容は `FR-1`、`FR-6`、`FR-7` の判定根拠として参照し、独立 subject にはしない。

## 登録モデルとの比較

`FR-1` と `FR-2` の実装面 `packages/framework/core/tools/amadeus-state.ts` は `BoltPrAttestationGate` と `PrConvergenceGate` に登録済みである。両モデルは `sensorPassed` を健全な最終述語として扱い、`CodeGenerationGuarded` と `WorkflowGuarded` が完了時の真を要求している。

今回の変更は、監査イベント名だけでなく `Note: script-error:*` も読んで、異常 terminal 行をこの既存述語の真へ写像しないようにする実装境界の修復である。モデルの遷移、状態変数、構成、到達可能性、不変量は変わらないため、分類は `impl-only` とする。モデルマップの実装 hash 更新後も登録4モデルの TLC 検査は `NOT_DETECTED` で完了している。

## ルート判定

判定候補は `impl-only`。この終端ルートの receipt 永続化には、実在する `HUMAN_TURN` に基づく明示承認が必要である。承認前に receipt を作成せず、`author-new` または `revise-model` へ進めない。
