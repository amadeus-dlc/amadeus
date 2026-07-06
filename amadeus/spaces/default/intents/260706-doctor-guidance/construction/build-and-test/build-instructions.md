# build instructions（260706-doctor-guidance）

上流入力: [code-summary.md](../doctor-guidance/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

本 Intent はビルド成果物を生成しない。エンジン tool と installer script の TypeScript は Bun が直接実行するため、ビルド工程は型検査に一本化する。

## 手順

1. `npm run typecheck` — `tsc --noEmit`。exit 0 を pass とする。
