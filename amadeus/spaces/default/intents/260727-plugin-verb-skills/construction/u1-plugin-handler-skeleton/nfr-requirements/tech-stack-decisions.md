# Tech Stack Decisions — U1 u1-plugin-handler-skeleton

上流入力(consumes 全数): technology-stack.md(Bun/TypeScript/ESM 現行)、business-logic-model.md、business-rules.md、requirements.md

## TS-U1-1: 追加依存なし

Bun 標準(spawnSync)+既存 amadeus-utility.ts の慣用のみ(business-logic-model.md の委譲一本道と requirements.md FR-2a の handleMigrate 様式指定に従う)(technology-stack.md の現行スタックに変更なし)。新規 npm 依存・ランタイム依存の追加なし(配布フレームワークの Bun-only 前提維持 — project.md Forbidden)。

## TS-U1-2: seam の実装位置

PluginDelegateDeps は amadeus-utility.ts 内の module-scope 型+既定実装(business-rules.md BR-U1-4 の unit 被覆前提)。coverage 計測は in-process import 済みモジュール内に置く(seam-placement-measured-module — amadeus-utility.ts は t203/t211/t221/t249 等の unit テストが既に in-process import している実測。conductor が `grep -l 'from.*amadeus-utility' tests/unit/` で再確認済み)。
