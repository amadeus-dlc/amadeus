# Security Requirements — upgrade-flow

> ステージ: nfr-requirements (3.2) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-U10〜U13)、U2 SEC-I01〜I04(全面継承)、requirements NFR-002

## SEC-U01: 退避ファイルの不可侵性

- **規則**: 既存の `.bk` ファイルを上書き・削除しない。applier が生成しようとする `.bk` パスが既に存在する場合、そのエントリは ApplyFailure として中断する(バックアップの消失 = ユーザーデータの消失であり、いかなる経路でも許容しない)
- **設計上の事実(能動的な除外ロジックは不要)**: `Plan.forUpgrade` の walk は**配布物(payload)側のファイル一覧**を歩く(U3 business-logic-model ワークフロー2)。GitHub タグアーカイブに `.bk` は含まれ得ないため、対象側の退避ファイルがプランエントリやマニフェスト `files[]` に現れることは構造的にない — 必要な防御は上記の apply 時衝突チェックのみ
- **検証**: 事前に同名 `.bk` を置いたフィクスチャで upgrade を実行し、当該エントリが ApplyFailure になり、既存 `.bk` と元ファイルが無傷であることをアサート(落ちる実証)

## SEC-U02: 継承事項

U2 の SEC-I01(書き込み境界封じ込め)・SEC-I02(入力検証)・SEC-I03(昇格なし)・SEC-I04(秘密情報なし)を upgrade 経路にそのまま適用する(applier/cli は共有実装)。

- **検証**: 共有実装であるため U2 側のテスト(SEC-I01 の不正プラン拒否等)が upgrade 経路もカバーする。upgrade 固有の入口(`upgrade` サブコマンド)からの導線1本を integration テストで追加確認する

## SEC-U03: manual-or-unknown の保守側倒し

期待 md5 が得られない状況での判断はすべて「退避してからコピー」に倒す(BR-U09)。「たぶん未変更」への最適化(退避スキップ)を将来入れる場合も、NFR-002 の検証(退避実在テスト)を弱めない。

- **検証**: manual-or-unknown フィクスチャ(マニフェストなし・カスタマイズ済み共有ファイルあり)で、既存共有ファイル全件に `.bk` が生成されることをアサート
