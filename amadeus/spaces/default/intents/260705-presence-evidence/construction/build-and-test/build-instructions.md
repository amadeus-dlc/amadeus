# Build Instructions

Unit: u001-presence-evidence（Test Strategy: Minimal、feature scope、docs 変更）

## ビルド対象

本 Intent の変更は文書 2 点（`.agents/amadeus/knowledge/amadeus-shared/audit-format.md` への Evidence Verification Boundary 節の追加、`dev-scripts/data/parity-map.json` の reason 1 行追補）であり、ビルド生成物はない（[code-summary.md](../u001-presence-evidence/code-generation/code-summary.md) の変更一覧を参照）。型検査・lint・parity 検査が「ビルド検証」に相当し、いずれも `npm run test:all` に含まれる。

## 実行方法

```sh
npm run test:all      # typecheck / lint / contracts / parity / wiring / test:it:all / engine-e2e / diff:check
npm run parity:check  # parity-map.json 追補後の単独確認
```

結果は [build-test-results.md](build-test-results.md) に記録する。
