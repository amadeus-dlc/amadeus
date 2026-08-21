# External Dependency Map — 260821-fmc-retirement

## 外部依存

| 依存 | 種別 | 扱い |
|---|---|---|
| GitHub(PR・merge queue・CI) | 必須 | remote-first 検証の正本。常任マージ承認条件(CI green + 収束実測)適用 |
| #3382 対応の別エージェント | 並行作業 | `plugins/github-pr-convergence/` 非接触で衝突なし(RE 実測: 逆参照 0)。record/registry 面の base 競合は通常の再構成手順で解決 |
| JDK(temurin) | 除去対象 | FR-CI-3 — 削除後は依存自体が消滅 |
| bun / Biome / tsc | 既存 | 変更なし |

## 外部への影響

なし(npm publish・Release・デプロイ系操作を含まない)。mirror Issue #3392 は engine 所有の同期のみ。
