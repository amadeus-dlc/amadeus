# Feasibility Assessment — インストーラの実装(installer-distribution)

> ステージ: feasibility (Ideation) / 作成: 2026-07-08
> 上流入力: `../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`、`../market-research/market-trends.md`、`../market-research/build-vs-buy.md`
> 決定の出典: `feasibility-questions.md`(グリリング3問+本日のレジストリ実測。前 intent の 2026-07-07 合意6問を再確認)

## 技術的実現可能性

**評価: 実現可能(高)。** インストーラ本体は build-vs-buy で確定した完全自作(bun/TypeScript、依存ゼロ)方針のもと、既存資産(`scripts/package.ts`、`scripts/promote-self.ts` のファイル操作・マニフェスト処理)を再利用できる。実装先は layout-normalization が予約した `packages/setup`。

| 領域 | 実現性 | 根拠 |
|------|--------|------|
| 導入(dist/ 展開) | 高 | 既存の promote-self.ts が同種のコピー処理を実装済み |
| GitHub タグ指定取得 | 高 | タグ付きアーカイブ取得は標準的な HTTP ダウンロード+展開。認証不要(公開リポジトリ) |
| 非破壊マージ + 差分レポート | 中〜高 | `amadeus-*` プレフィックス規約で所有判定は機械化可能(competitive-analysis の差別化機会1)。プレフィックスなし共有ファイル(`.claude/settings.json` 等)の扱いが設計課題(intent-statement から引き継ぎ) |
| npx/bunx 両対応 | 高 | TypeScript → JS のビルド工程を追加(単一ファイルバンドルが現実的)。ビルド成果物の管理は既存の dist/ ドリフトガードの流儀に倣える |

## npm 公開前提の実測(2026-07-08)

| 照会対象 | 結果 | 含意 |
|----------|------|------|
| `registry.npmjs.org/@amadeus-dlc/setup` | HTTP 404 | 未公開 — パッケージ名は空いている |
| `registry.npmjs.org/@amadeus-dlc/framework` | HTTP 404 | 未公開 |
| `registry.npmjs.org/amadeus-dlc`(非スコープ) | HTTP 404 | 未公開(R1 のフォールバック候補も空き) |
| npmjs.com org ページ | HTTP 403(bot 保護) | **スコープ保有者の有無はレジストリ照会では確定不能** — org 作成/確保は公開前タスク R1 として人間が実施 |

## 主要リスク分析

1. **npm スコープ確保(R1)** — `@amadeus-dlc/setup`(Q1 で維持を確定)は npm 上の `amadeus-dlc` スコープ確保が前提。名前は現在空きだが保有確認は未了
2. **ネットワーク依存(R2)** — インストール時に GitHub への到達が必須(Q2 の2経路構成)。成功指標「1コマンド・1分以内」はダウンロード時間を含む
3. **バージョン整合(R3)** — インストーラ(npm)と配布物(GitHub タグ)が別経路のため、対応規約を requirements/design で確定する
4. **既存の不整合(I1/I2)** — `"license": "MIT-0"` の誤記と `repository` URL の旧リポジトリ参照(`awslabs/amadeus-workflows`)は**本日時点で未修正のまま残存を実測確認**。公開前に是正必須

## AWS プラットフォーム観点(aws-platform)

本イニシアチブはクラウドインフラを必要としない(npm レジストリと GitHub のみ)。AWS サービスの新規利用なし。CDN・ホスティングの検討も不要 — GitHub のアーカイブ配信で十分。market-trends の再実行更新モデルにおいても追加インフラは発生しない。

## コンプライアンス観点(compliance)

- **ライセンス**: MIT + Apache-2.0 デュアルを npm パッケージに正しく継承する。`license` フィールドの是正(`MIT-0` → 正しい SPDX 表現)を公開前に実施(Q3 で維持確定)
- **データ扱い**: テレメトリ・外部送信なし。規制要件(PCI/HIPAA/SOC2)は該当なし
- **サプライチェーン**: 依存ゼロ方針(build-vs-buy)がリスク面を最小化。provenance は今回要求されず、CI 公開へ移行する際に再検討

## 結論

**GO。** ブロッカーとなる制約はなく、未確認事項は npm スコープの確保(公開前タスク R1)のみ。品質優先・通常リリースサイクル(O2)で進められる。
