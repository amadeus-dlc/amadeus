# Integration Test Instructions

## Upstream coverage

U-04の`code-generation-plan.md`と`code-summary.md`に記録されたC-01→C-05/U-02/U-03統合、3 renderer、exit ladder、real-corpus相当、Issue #2700残余を検証する。provider Unitのpublic seamだけを使い、private helperへ依存しない。

## 実行コマンド

```bash
bun test tests/integration/t487-stage-stats.integration.test.ts
bun test --timeout 120000 tests/unit/t150-codex-packaging.test.ts
bun run test:ci
```

scratch filesystem上にaudit shardを作り、実project fileは変更しない。CLI spawn、full capture、pipe consumer、`jq empty`は既存環境のBunとjqを使う。

## 合格基準

- normal/empty exit 0、partial report + exit 1、typed invariant stdoutなし + exit 1、usage scan前exit 2。
- Markdown/CSV/JSONのsemantic parityと反復byte一致。
- packaging testがsource→dist投影を検証し、full `test:ci`の失敗0。既知timeout時だけ単独再実行証拠を併記する。
