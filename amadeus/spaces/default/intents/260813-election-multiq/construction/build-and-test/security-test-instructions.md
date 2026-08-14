# セキュリティテスト手順

U8 [security-design](../election-distribution-and-verification/nfr-design/security-design.md) と各 unit の [code-summary](../election-distribution-and-verification/code-generation/code-summary.md) が、source → 投影 → norm の supply-chain を trust boundary とする。

## 実行

```
bun run source-only:check
bun tests/gen-coverage-registry.ts --check
bun -e 'import { checkModelCompleteness } from "./plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts"; console.log(JSON.stringify(await checkModelCompleteness({ projectRoot: process.cwd() })));'
```

## 確認すること

- 正本だけを編集し、generated dist / self-install を手で commit しない。
- fail-closed decode（NFR-3）は既存 codec / store テストが担う。
- 旧 workaround 語彙 `E-SRA-RAS13` / `election-cli-canonical` は active memory に再出現しない（t558）。
- 外部サービスや新しい認証面は追加していない。
