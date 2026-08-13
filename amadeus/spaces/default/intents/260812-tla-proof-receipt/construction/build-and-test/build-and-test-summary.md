# Build & Test Summary — 260812-tla-proof-receipt

上流入力(consumes 全数): `construction/fix-2913-proof-receipt/code-generation/code-generation-plan.md`(唯一の unit `fix-2913-proof-receipt` の Step 構成と配送手順)、`construction/fix-2913-proof-receipt/code-generation/code-summary.md`(FR 充足表・検証表・申告済み逸脱)。

- Depth: Minimal — 状態表1つと readiness 行に絞る(stage 契約 Step 9)。詳細は `build-test-results.md` を正とする。
- 対象 unit: `fix-2913-proof-receipt` の1件のみ(self-fix スコープ、units-generation は SKIP 解決)。

## 状態表

| 項目 | 状態 | 根拠 |
|---|---|---|
| ビルド(typecheck / lint) | ✅ exit 0 / exit 0 | 本ステージ再実測 |
| 日常 CI 層テスト(t534+t535) | ✅ 27 pass / 0 fail | 本ステージ単独実行 |
| 実TLC 専用面 | ✅ 7 pass / 0 fail | 本ステージ再実測(`mise x java@temurin-26.0.1+8 --`) |
| 回帰(影響34ファイル・既存ピン) | ✅ 359 pass / 0 fail、90 pass 維持 | builder 実測(cg2913-builder-report.md) |
| CI(PR #2920 head `23efaab5e`) | ✅ pass 17 / skipping 2 | `gh pr checks 2920` 実測 |
| 着地 | ✅ MERGED `71523ecaf` | `gh pr view 2920` 実測 |
| 生成テスト種別 | unit / integration(実TLC 専用面を含む) | 下記「テスト種別インベントリ」 |
| 性能試験 | 適用外(判定を明記) | performance-test-instructions.md |
| セキュリティ専用試験 | 適用外(既存担保面を明記) | security-test-instructions.md |

## テスト種別インベントリ

| 種別 | 生成 | 理由 |
|---|---|---|
| unit | ✅ | FR-2(digest 一致)が純関数の検査 |
| integration | ✅ | FR-1/3/4/5/6/7 — 実 FS・production toolchain 境界。日常 CI 層と実TLC 専用面の2層(Q1=A) |
| performance | 適用外 | 数値目標を持つ NFR が不在(NFR-1 決定性 / NFR-2 回帰なし のみ) |
| security | 適用外(専用試験) | セキュリティ NFR 不在。信頼境界の契約は FR-5 fail-closed テスト・FR-4 非公開機械検査・CI の control-byte-gate が既に担保 |

## Readiness

**build-ready / test-ready / deployment-ready(着地済み)— 無条件 READY。** FR-1〜7・NFR-1〜2 の全受け入れ基準に fresh evidence があり、赤は残っていない。

既知の残件はいずれも受け入れ基準の外にある(詳細と証拠ギャップは `build-test-results.md` の「申し送り」「証拠ギャップ」節): parseTrace の既存制約2件(#2918 相当)、既存 probe の exit 1、metrics/queue 面(#2925)、`runOnce` waiver の解除条件、フルスイートの本 tree 未再測。
