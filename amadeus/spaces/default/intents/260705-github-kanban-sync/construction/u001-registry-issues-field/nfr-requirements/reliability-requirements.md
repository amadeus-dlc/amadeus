# Reliability Requirements — u001-registry-issues-field

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

信頼性要求は互換性の維持（FR-1.2 = N 系では N5 に対応）だけである。
`issues` 有無混在の registry を既存の読み手が扱えることを検証で担保する（business-rules.md「検証の分担」）。破損リスクは JSON の手編集ミスであり、Bolt PR の diff レビューと `npm run test:all` で検出する。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
