# Performance Requirements — u001-registry-issues-field

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

U001 は実行時処理を持たない（台帳へのフィールド追加のみ）。
性能要求は「既存の読み手の性能を変えない」ことだけである。`issues` は小さな数値配列であり、`intents.json` のサイズ増は数十バイト / entry に留まる。専用の性能目標は設けない。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
