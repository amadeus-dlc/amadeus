# Build Instructions

Unit: persona-loading（Test Strategy: Minimal、scope: bugfix）

## 上流入力

検証対象は code-generation の実体 2 ファイル修正である。内訳は [code-generation-plan.md](../persona-loading/code-generation/code-generation-plan.md) と [code-summary.md](../persona-loading/code-generation/code-summary.md) を参照する。

## 適用判断

本 Intent の変更は Markdown 文書（`stage-protocol.md`）と JSON（`parity-map.json`）であり、コンパイル対象の実装コードはない。build に相当する検証は次の 2 点とする。

## 手順

1. parity 検査: `npm run parity:check` を実行し、`parity check: ok` を確認する。
2. JSON 妥当性: `parity-map.json` が `npm run test:all` 内の parity eval で読み込まれ、解析エラーがないことを確認する。

結果は [build-test-results.md](build-test-results.md) を参照する。
