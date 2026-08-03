# Stakeholder Map — 260802-source-only-dist

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。一次入力は GitHub Issue #2043 本文)

## 主要ステークホルダーと関心

| ステークホルダー | 関心 | 影響 |
|---|---|---|
| リポジトリオーナー(j5ik2o) | レビュー差分の正常化、リポジトリ健全性、規範(project.md / org.md)との整合 | 意思決定者。全ゲート承認・ノルム PR 承認・マージ承認を保持 |
| Amadeus コントリビューター | PR diff が正規ソースに絞られること、フレッシュクローンの onboarding(clone → install → build)が壊れないこと | 直接受益。bootstrap 循環の解決品質(G1/G2)に依存 |
| フレームワーク利用者(`@amadeus-dlc/setup` 経由) | 既存バージョンのインストールが壊れないこと(codeload フォールバック)、新版の決定的インストール(asset + checksum、fail closed) | 外部境界。移行順序(installer 移行 → 追跡除外)の厳守で保護 |
| CI / リリース運用 | クリーン checkout からの build 前提化、release.yml の workflow_dispatch 一本の維持、ドリフトガード3種の意味再定義 | 実装対象。第3ガードの自己参照化回避(G5)が品質条件 |
| 並行 intent / 他セッション | 共有台帳(`.gitignore` / `.gitattributes` / memory 層)の衝突、per-user ランタイム(第3カテゴリ)の不可侵 | 生成処理は allowlist と per-user 面を削除しない契約で保護 |

## 意思決定者 vs 影響者

- **意思決定者**: ユーザー(リポジトリオーナー)のみ。ステージゲート・ノルム PR(2名レビュー+ユーザー承認マージ)・PR マージ(no-AI-merge)・リリース実行(workflow_dispatch)のすべてで人間承認境界を維持
- **影響者**: クロスレビュアー(#2043 の verdict 2名)、grilling 裁定(G1〜G13)、既存規範(org/team/project の memory 層)

## コミュニケーション要件

- 設計正本は本 intent record。Issue #2043 は凍結済み(状態行の更新のみ)。intent ミラーは #2059(record → Issue の一方向同期)
- 規範衝突5点の改訂は norm-changes-via-pr(別 PR・レビュー・ユーザー承認マージ)で行い、実装 PR に混載しない
- Bolt ごとに PR を発行し、複数 Unit・工程記録・無関係リファクタを単一 PR に束ねない(team.md Way of Working)
