# Feasibility Assessment — インストーラの実装

> ステージ: feasibility (Ideation) / 作成: 2026-07-07
> 上流入力: `../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`、`../market-research/market-trends.md`、`../market-research/build-vs-buy.md`
> 決定の出典: `feasibility-questions.md`(6問、全問回答済み)

## 技術的実現可能性

**評価: 実現可能(高)。** インストーラ本体は build-vs-buy で確定した完全自作(bun/TypeScript)方針のもと、既存資産(`scripts/package.ts`、`scripts/promote-self.ts` のファイル操作・マニフェスト処理)を再利用できる。技術的に新規性が高い箇所は次の3点:

| 領域 | 実現性 | 根拠 |
|------|--------|------|
| 導入(dist/ 展開) | 高 | 既存の promote-self.ts が同種のコピー処理を実装済み |
| GitHub タグ指定取得(Q4) | 高 | GitHub のタグ付きアーカイブ取得は標準的な HTTP ダウンロード + 展開。認証不要(公開リポジトリ) |
| 非破壊マージ + 差分レポート | 中〜高 | `amadeus-*` プレフィックス規約で所有判定は機械化可能。プレフィックスを持たない共有ファイル(`.claude/settings.json` 等)の扱いが設計課題(intent-capture から引き継ぎ) |
| npx/bunx 両対応(Q2) | 高 | TypeScript → JS のビルド工程を追加(単一ファイルバンドルが現実的)。ビルド成果物の管理は既存の dist/ ドリフトガードの流儀に倣える |

## 主要リスク分析

1. **npm 公開の前提(組織スコープ)** — `@amadeus-dlc/setup`(Q1)は npm 上の `amadeus-dlc` 組織スコープの確保が前提。未確認(→ RAID: R1)
2. **ネットワーク依存(Q4=B)** — インストール時に GitHub への到達が必須。成功指標「1コマンド・1分以内」はダウンロード時間を含む。プロキシ環境・オフライン環境では機能しない(→ RAID: R2)
3. **バージョン整合** — インストーラ(npm)と配布物(GitHubタグ)が別経路のため、バージョン対応の規約が必要。タグ名との対応付けを設計で明確化する(→ RAID: R3)
4. **既存の不整合** — package.json の `"license": "MIT-0"` は LICENSE-MIT(+ LICENSE-APACHE デュアル)と矛盾。公開時に表面化するため修正必須(→ RAID: I1)

## AWS プラットフォーム観点(aws-platform)

本イニシアチブはクラウドインフラを必要としない(npm レジストリと GitHub のみ)。AWS サービスの新規利用なし。CDN・ホスティングの検討も不要 — GitHub のアーカイブ配信で十分。

## コンプライアンス観点(compliance)

- **ライセンス**: MIT + Apache-2.0 デュアルを npm パッケージに正しく継承する(Q6)。`license` フィールドの是正(`MIT-0` → 正しい SPDX 表現)を公開前に実施
- **データ扱い**: テレメトリ・外部送信なし(要求外だが現状の実装方針にも存在しない)。規制要件(PCI/HIPAA/SOC2)は該当なし
- **サプライチェーン**: provenance は今回要求されず。将来 CI 公開へ移行する際に再検討

## 結論

**GO。** ブロッカーとなる制約はなく、未確認事項は npm 組織スコープの確保(公開前タスク)のみ。品質優先・通常リリースサイクル(Q5)で進められる。
