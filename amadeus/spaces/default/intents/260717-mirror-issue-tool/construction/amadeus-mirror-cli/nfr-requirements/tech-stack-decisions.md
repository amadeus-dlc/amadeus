# Tech Stack Decisions — amadeus-mirror-cli

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 決定(すべて上流で既決 — 本ステージでの新規決定なし)

| 項目 | 決定 | 出典 |
|---|---|---|
| ランタイム | Bun 直接実行(TypeScript/ESM) | technology-stack.md、NFR-1 |
| gh 境界 | Bun.spawnSync 引数配列形+env: process.env | ADR-2 |
| 状態読取 | amadeus-lib import(readIntentRegistry/getField) | ADR-5 |
| lint/型検査 | Biome / tsc(既存配線に自動収容) | NFR-3 |
| テスト | bun test(tests/unit + tests/integration) | NFR-4、fs-tests-integration-first |

## 新規導入の不在確認

本ステージで新規のライブラリ・ランタイム・機構の導入はゼロ — すべて上流(ADR/NFR/既存配線)の既決事項の再掲であり、Bun-only 前提と gh の scripts/ 限定境界を維持する。
