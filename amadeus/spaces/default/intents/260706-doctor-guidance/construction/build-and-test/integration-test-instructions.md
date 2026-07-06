# integration-test instructions（260706-doctor-guidance）

上流入力: [code-summary.md](../doctor-guidance/code-generation/code-summary.md)

## 適用判断

doctor・installer・intent-birth の統合は installer eval 自体が実 CLI 駆動の統合検証である。加えて repo 標準連鎖で回帰を確認する。

## 手順

1. `npm run test:all` — 全 eval 連鎖（#554 doctor 警告 / #451 smoke 領域の既存 eval を含む）。exit 0 を pass とする。
2. `npm run parity:check` — 上流 parity（#573 reason entry を含む）。
3. `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-doctor-guidance` — record 構造検証。
