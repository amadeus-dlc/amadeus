# Build Instructions

Unit: u001-engine-installer（Test Strategy: 既定、feature scope）

## ビルド対象

インストーラ（scripts/amadeus-install.ts）と専用 eval（dev-scripts/evals/installer/check.ts）は Bun 直接実行の TypeScript であり、ビルド生成物はない。型検査（tsc --noEmit。tsconfig の include へ scripts/** を追加済み）と lint が「ビルド検証」に相当し、いずれも `npm run test:all` に含まれる。

## 実行方法

```sh
npm run test:all          # typecheck / lint / contracts / parity / wiring / test:it:all（installer eval 含む）/ engine-e2e / diff:check
```

結果は [build-test-results.md](build-test-results.md) に記録する。
