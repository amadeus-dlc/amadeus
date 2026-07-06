# Security Requirements — u001-registry-issues-field

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

`issues` の値は公開リポジトリの Issue 番号であり、秘密情報を含まない。
遡及補完は既存の公開情報（aidlc-state.md、audit）からの転記だけを行い、新しい情報を外部へ送らない。追加のセキュリティ要求はない。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
