# Tech Stack Decisions — U1-mirror-tool

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## TS-U1-1: 追加依存ゼロ

TypeScript/ESM+Bun 直接実行(technology-stack.md の現行構成)。npm 新規依存なし。gh は optional runtime(ADR-7)。

## TS-U1-2: 配置

正本 = packages/framework/core/tools/amadeus-mirror.ts(ADR-1)。coreDirs 投影で dist 6面へ。テストは tests/unit(純関数)+tests/integration(実 FS+GhRunner fake — fs-tests-integration-first)。
