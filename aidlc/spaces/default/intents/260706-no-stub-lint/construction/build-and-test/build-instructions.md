# Build Instructions

Unit: no-stub-lint（Test Strategy: Minimal、refactor scope）

## ビルド手順

本 Intent の変更は Bun + TypeScript の lint rule と文書・設定であり、コンパイル成果物を生成しない。ビルド相当の検証は型検査である。

```sh
npm run typecheck
```

## 結果

エラーなしで通過した。詳細は [build-test-results.md](build-test-results.md) を参照する。
