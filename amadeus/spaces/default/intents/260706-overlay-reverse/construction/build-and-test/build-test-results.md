# Build / Test Results

Unit: overlay-reverse（bugfix scope、Test Strategy: Minimal）

## 実行結果

| 検証 | コマンド | 結果 | 実行時刻（UTC） |
|---|---|---|---|
| 標準検証（fresh） | `npm run test:all` | pass（exit 0。installer eval = test:it:installer を含む全段通過） | 2026-07-06T13:20 頃 |
| installer eval 単独 | `bun dev-scripts/evals/installer/check.ts` | 367/367 ok、FAIL 0（本 Intent で +14。既存 353 は全 GREEN 維持 = per-file 逆変換が既存挙動を壊さない証明） | 同上（test:all 内 + 単独実行で複数回確認） |
| 型検査 | `npx tsc --noEmit` | pass（exit 0） | 同上 |
| 構造検証（Intent 指定） | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-overlay-reverse` | 不足または矛盾 なし。Per unit は overlay-reverse へ record 整合済み | 2026-07-06T13:00 頃 |

## TDD 証跡

- RED 確認: `reverseModelOverlay` を export する前に eval 14 assertion を先行追加 → export 不在で起動不能（0/367）。補強として配線だけ無効化 → FR579-2.1 系 4 件のみ FAIL、他 pass（FR579-3.1/3.2 は trackedWrite の自己無矛盾性、FR579-2.2 は無変換で成立）。§12a reviewer が RED を独立再現。
- GREEN: 最小実装後 367/367。

## §12a 実績（code-generation）

architecture-reviewer = READY（Low 2 + Informational 1）。Low 2 件（非宣言 agent への無条件 utf-8 往復 → guard で限定 / Per unit の record 整合）は修正済み、修正後 367/367 GREEN・tsc clean・validator 不足なしを再確認。Informational（FR579-3.1 の従属性）は code-summary に開示済みで是正不要。
