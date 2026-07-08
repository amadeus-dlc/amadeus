# CI/CD Pipeline — upgrade-flow

> ステージ: infrastructure-design (3.4) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: U2 cicd-pipeline.md(E2E インフラの継承)、`../nfr-design/reliability-design.md`(fs スナップショット・REL-U02 の6経路)・`performance-design.md`(両側 md5 の計測対象)・`security-design.md`(SEC-U01 の .bk 衝突フィクスチャ)、`../functional-design/business-logic-model.md`(境界経路)・`domain-entities.md`(LegacyLayout.isUnsupported の判定条件)

## E2E テストインフラ(U2 流儀への同乗+upgrade 固有フィクスチャ)

- 「導入済みターゲット」フィクスチャは **U2 の install E2E ヘルパーを流用して生成**(install 実行済み一時ディレクトリ+マニフェスト)— 手書きフィクスチャの複製を作らない
- 後処理による派生フィクスチャは**4種**(いずれも導入済みフィクスチャへのファイル操作のみで導出):
  1. manual-or-unknown: マニフェスト削除+共有ファイルへのカスタマイズ書き込み
  2. partial: 必須ファイルの一部削除(マニフェストは残す)
  3. **unsupported-layout(a 系)**: マニフェスト削除+`<engine-dir>/VERSION` の内容を非 SemVer 文字列(例 `legacy-build-2024`)へ書き換え — LegacyLayout.isUnsupported 条件 (a) を満たす
  4. **unsupported-layout(b 系)**: マニフェスト削除+現行レイアウト必須アンカー(`<engine-dir>/tools/` と `<engine-dir>/amadeus-common/`)の両方を削除(amadeus-* ファイルは残す)— 条件 (b) を満たす
  REL-U02 の6経路(+BR-U07 の落ちる実証)と SEC-U01 の `.bk` 事前設置フィクスチャがこの4種+バージョン境界操作(マニフェストの distributionVersion 書き換え)で全数賄えることを、実装時にテスト一覧と突合する
- fs スナップショット比較(REL-U02)は既存 tests/harness 流儀の再帰走査ヘルパーとして実装(新規ツールなし)
