# integration-test instructions（260706-engine-consistency）

上流入力: [code-summary.md](../engine-consistency/code-generation/code-summary.md)

## 適用判断

エンジン・validator・hooks の統合検証は、repo 標準の検証連鎖に集約されている。個別 eval と重複しない統合観点（parity、全 eval 連鎖）を実行する。

## 手順

1. `npm run test:all` — 全 eval 連鎖（上記 unit 系を内包）。exit 0 を pass とする。
2. `npm run parity:check` — 上流 aidlc-workflows 2.2.0 との parity（engineFileExceptions 宣言 3 ファイル分を含む）。
3. `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-engine-consistency` — 本 Intent record の構造検証。
