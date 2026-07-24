# Team Practices — 260724-harness-provenance

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 既存 Practices の確認(変更なし)

evidence.md のとおり、本 intent 固有の新規ギャップは検出されなかった。既存の `amadeus/spaces/default/memory/team.md`・`project.md` を継続適用する。

## 本 intent への適用ポイント(既存 practices からの参照)

- **Way of Working(project.md)**: `packages/framework/core/` を編集元とし、`dist/` は `bun scripts/package.ts` で再生成 — 本 intent の `amadeus-utility.ts`/`amadeus-lib.ts` 変更後も同様に適用
- **cid:code-generation:harness-tools-placement**: harness 専用ツールを `packages/framework/core/tools/` に置かない(全ハーネス dist へ漏出するため)— 本 intent はハーネス種別の**検出ロジック**を扱うが、これは core 中立層に置く汎用機能(既存の `deriveHarnessDir()` と同じ層)であり、本ルールの対象外(harness 専用ツールの新設ではない)
- **Decided(project.md)**: functional-domain-modeling-ts スタイル(type+コンパニオンオブジェクト、Result型)— 新規フィールドは scalar のため既存の `getField`/`setOrInsertField` パターンで十分、新規 Result 型パーサは不要(architecture.md の Developer scan 所見と整合)
