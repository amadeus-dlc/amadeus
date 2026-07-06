# Scalability Requirements — u002-kanban-sync-cli

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

Intent 数の想定は当面 100 未満で、1 card 1 リクエスト（D-AD4）の前提では rate limit（GraphQL 5000 点/時）に対して十分小さい。
超えた場合も冪等な再実行で回復する（R01 の緩和）。スケール設計は本格版へ委ねる（C07）。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
