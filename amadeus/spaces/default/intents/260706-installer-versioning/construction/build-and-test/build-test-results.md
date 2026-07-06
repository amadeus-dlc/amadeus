# Build / Test Results

Unit: u001-installer-versioning（feature scope）

## 実行結果

| 検証 | コマンド | 結果 | 実行時刻（UTC） |
|---|---|---|---|
| 標準検証（fresh） | `npm run test:all` | pass（exit 0、パイプなし実行。installer eval = test:it:installer を連鎖に含む全段通過） | 2026-07-06T11:50 頃 |
| installer eval 単独 | `bun dev-scripts/evals/installer/check.ts` | 342/342 ok、FAIL 0（B001 +31、B002 +37 を TDD 先行で追加） | 同上（test:all 内 + 単独実行で複数回確認） |
| 構造検証（Intent 指定） | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-installer-versioning` | 本 Intent の変更対象への指摘なし。「不足または矛盾」= Operation ステージ表記（feature scope の既知パターン。終盤の理由付き skip で解消予定）のみ。Per unit: [TBD] は u001-installer-versioning へ手動整合済み（既知 learnings パターン） | 2026-07-06T11:52 頃 |

## 注記

- §12a review 実績（code-generation）: B001 = 反復 1 READY（Medium のテストギャップを即時 eval 化）。B002 = 反復 1 NOT-READY（高 1 = 件数混入を実機再現で検出 → eval 先行 + 修正、低 2）→ 反復 2 で手動 2 シナリオの算術一致まで検証し READY。
- TDD 証跡: B001 = RED 15+ 件 → GREEN 305。B002 = RED 7 件 + 想定 crash → GREEN 342。eval 期待側の訂正 1 件（AD-6 skip）は根拠付きで記録済み。
