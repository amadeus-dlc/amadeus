# Deployment Log — installer-distribution

> ステージ: deployment-execution (4.3) / 記録: 2026-07-09 / 出典: `../deployment-pipeline/cd-config.md`(手動直列パイプライン)・`deployment-strategy.md`

## パイプライン進行状況(実測)

| # | ステップ | 状態 | 証跡 |
|---|----------|------|------|
| 1 | PR マージ(5ゲート) | ✅ 完了 | #648/#649/#650/#652/#653(2026-07-08 16:39〜16:41)、#654/#651(17:32)— main = 8ecf76e30、AMADEUS_VERSION 1.2.0 |
| 2 | `v1.2.0` タグ発行 | ✅ 完了(2026-07-09、conductor がゲート承認のもと発行) | `refs/tags/v1.2.0` = 8ecf76e30(実測) |
| 3 | publish 前検証(手順書章3〜4) | ✅ 完了(章4 のローカル tarball 導入検証は publish 直前の実施項目として残置) | オフライン全グリーン+**実ネットワーク E2E PASS(2 pass / 2.54s — 配布経路の本番実証)** |
| 4 | `npm publish`(手動・2FA) | ⏳ 未実施 | 人間タスク: R1(npm org `amadeus-dlc` スコープ確保)+2FA — 手順書章1/章5 |
| 5 | 公開後検証 | ⏳ 未実施 | publish 後に `npx @amadeus-dlc/setup@0.1.0 --help` |

## 特記事項

- publish 実行は設計どおり CI 外の人間タスク(CON-004/SEC-P02)— 本ステージは「実行可能な範囲の実行+残タスクの正確な引き継ぎ」を記録する
- インストーラ本体(@amadeus-dlc/setup 0.1.0)の publish と framework v1.2.0 タグは独立したバージョン軸(FR-017)— タグは resolver の配布物取得先、npm 版はインストーラ自身の版
