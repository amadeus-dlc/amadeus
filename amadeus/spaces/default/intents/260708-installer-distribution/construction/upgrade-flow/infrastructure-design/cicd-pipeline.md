# CI/CD Pipeline — upgrade-flow

> ステージ: infrastructure-design (3.4) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: U2 cicd-pipeline.md(E2E インフラの継承)、`../nfr-design/reliability-design.md`(fs スナップショット)

## E2E テストインフラ(U2 流儀への同乗+upgrade 固有フィクスチャ)

- 「導入済みターゲット」フィクスチャは **U2 の install E2E ヘルパーを流用して生成**(install 実行済み一時ディレクトリ+マニフェスト)— 手書きフィクスチャの複製を作らない
- manual-or-unknown フィクスチャ(マニフェストなし・カスタマイズ済み)と partial フィクスチャ(必須ファイル欠損)はヘルパーへの後処理(ファイル削除・変更)で導出
- fs スナップショット比較(REL-U02)は既存 tests/harness 流儀の再帰走査ヘルパーとして実装(新規ツールなし)
