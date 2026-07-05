# Tech Stack Decisions — u001-registry-issues-field

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

新規技術は導入しない。JSON の手編集（D-AD10）と、互換検証のための Bun + TypeScript テストだけを使う（C03 / C08）。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
