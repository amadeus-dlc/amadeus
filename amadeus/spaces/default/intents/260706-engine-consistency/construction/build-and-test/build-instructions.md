# build instructions（260706-engine-consistency）

上流入力: [code-summary.md](../engine-consistency/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

本 Intent はビルド成果物（バンドル、バイナリ）を生成しない。エンジン tool / hook / validator の TypeScript は Bun が直接実行するため、ビルド工程は型検査に一本化する。

## 手順

1. `npm run typecheck` — `tsc --noEmit` で全対象を検査する。exit 0 を pass とする。
