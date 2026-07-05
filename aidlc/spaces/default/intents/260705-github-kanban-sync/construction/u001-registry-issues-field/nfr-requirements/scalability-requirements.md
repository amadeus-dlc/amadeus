# Scalability Requirements — u001-registry-issues-field

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

対象は 1 リポジトリの registry（現状 10 entry、増加は Intent 作成ペースに比例して緩やか）である。スケーラビリティ要求は設けない（暫定機構 N3）。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
