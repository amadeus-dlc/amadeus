# Build Instructions

Unit: overlay-reverse（bugfix scope、Test Strategy: Minimal）

## 適用判断

インストーラ（`scripts/amadeus-install.ts`）は Bun 直接実行のスクリプトであり、コンパイル生成物を持たない。ビルド検証は型検査と lint で代替する。いずれも `npm run test:all` の連鎖に含まれる。

## 手順

- 型検査: `npx tsc --noEmit`（exit 0 を要件とする）。
- lint / 標準検証: `npm run test:all`（installer eval = `test:it:installer` を連鎖に含む）。

## 結果

[build-test-results.md](build-test-results.md) に記録する。
