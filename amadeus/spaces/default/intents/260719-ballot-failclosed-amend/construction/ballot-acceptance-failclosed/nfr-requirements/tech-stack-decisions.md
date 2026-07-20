# Tech Stack Decisions — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 決定

| # | 決定 | 根拠 |
| --- | --- | --- |
| T-1 | 新規依存ゼロ — TypeScript(ESM)/Bun 直接実行/bun:test の現行構成のみ(technology-stack.md「変更なし」節の維持) | Bun-only Forbidden(配布面)とは独立に、scripts/ 区画でも依存追加の必然なし |
| T-2 | functional-domain-modeling-ts スタイル継続 — 判別 union Result・type+コンパニオン(BallotError/StoreError の union 値追加のみ、新クラス・新機構なし) | project.md DECIDED、domain-entities.md |
| T-3 | 検証コマンドは既存4種(typecheck / lint(Biome、scripts/ 対象)/ run-tests.sh --ci / lcov 実測)— 新 CI ジョブ・新ツールなし | requirements.md FR-5、technology-stack.md |

## 却下した代替

- 専用 timestamp ライブラリ(date-fns 等)の導入 — 二段検証は標準 Date+regex で完結し、依存追加は Bun-only 方針と依存最小原則に反する。
- Zod 等のスキーマ検証導入 — parseBallotShape の手書き構造検査は既習様式(model.ts 現行)で、1分類の追加に検証フレームワークを持ち込むのは過大。
