# Stakeholder Map — formal-verif-value-chain

## Key Stakeholders and Interests

| ステークホルダー | 種別 | 関心 |
|---|---|---|
| ユーザー(j5ik2o) | 意思決定者 | 形式検証の価値が実ワークフローへ到達すること。マージ・スコープ変更・仕様変更の専権(正準リスト) |
| conductor(本セッション) | 実行者 | ステージ実行・ゲート執行・成果物品質。ソロモードにつき builder/reviewer 責務も工程ごとに担う |
| プラグイン配布先ユーザー | 受益者(外部) | compose した plugin が配布先 repo で自立実行できること(#1829) |
| CI(GitHub Actions) | 機械的利害 | `run-model-check-ci.ts` の消費経路が移設後も成立すること(#1829 の付け替え面)。二層検証ノルムの専用ジョブ維持 |
| 後続 intent の実装者 | 受益者(内部) | 並行プロトコル変更時に形式検証の矛盾検出が上流(要件・設計段)で届くこと。SOURCE_DRIFT の正規復旧経路(#1510) |

## Decision-Makers vs. Influencers

- **意思決定者**: ユーザー — スコープ境界(Q2)、方式選択(Q1)、各ステージゲート、PR マージ(no-AI-merge)。
- **影響者**: 既決ノルム群(two-layer-verification-posture、検証劇場 Forbidden、finite-exploration-not-detected-proof など)と #1738/#1829 の既存裁定 — 本 intent はこれらを前提として適用し、蒸し返さない(P3)。

## Communication Requirements

- 進捗・裁定は record(本 intent ディレクトリ)を正本とし、ミラー Issue #1836 へは一方向同期(状態行の更新のみ、設計詳細は書かない)。
- #1738 / #1829 / #1510 は本 intent の着地確認後に close-after-landing 準拠でクローズする。#1543 / #1735 は前進があれば状態コメントのみ更新する(Q2 裁定)。
