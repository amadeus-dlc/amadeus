# Tech Stack Decisions — u002-kanban-sync-cli

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

実行は Bun + TypeScript、外部呼び出しは gh CLI（`gh api graphql`）のみ（C03 / C04）。npm 依存を追加しない（N4）。GraphQL クエリは文字列テンプレート + `--jq` / JSON parse で扱い、コード生成やスキーマ型付けは導入しない（N3）。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
