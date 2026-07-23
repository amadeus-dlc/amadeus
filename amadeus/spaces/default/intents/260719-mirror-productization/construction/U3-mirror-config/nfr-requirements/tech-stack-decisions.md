# Tech Stack Decisions — U3-mirror-config

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## TS-U3-1: 追加依存ゼロ

JSON は Bun 組込 JSON.parse のみ(ADR-4 — YAML 依存を追加しない = Bun-only Forbidden 維持)。technology-stack.md の現行構成に変更なし。

## TS-U3-2: 配置

正本 = packages/framework/core/tools/amadeus-mirror-config.ts(components.md C3)。coreDirs 投影。テスト: unit(純関数)+integration(実 FS 3面 fixture — fs-tests-integration-first)。
