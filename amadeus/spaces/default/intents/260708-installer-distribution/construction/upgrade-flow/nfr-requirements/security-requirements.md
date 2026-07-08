# Security Requirements — upgrade-flow

> ステージ: nfr-requirements (3.2) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-U10〜U13)、U2 SEC-I01〜I04(全面継承)、requirements NFR-002

## SEC-U01: 退避ファイルの不可侵性

- 既存の `.bk` ファイルを**上書き・削除しない**。生成しようとする `.bk` パスが既に存在する場合、そのエントリは ApplyFailure として中断する(バックアップの消失 = ユーザーデータの消失であり、いかなる経路でも許容しない)
- `.bk` は `user-preserved` 扱い(プランの走査対象から除外 — 次回 upgrade が退避ファイルを「未知の共有ファイル」として再退避する無限連鎖を防ぐ)

## SEC-U02: 継承事項

U2 の SEC-I01(書き込み境界封じ込め)・SEC-I02(入力検証)・SEC-I03(昇格なし)・SEC-I04(秘密情報なし)を upgrade 経路にそのまま適用する(applier/cli は共有実装)。

## SEC-U03: manual-or-unknown の保守側倒し

期待 md5 が得られない状況での判断はすべて「退避してからコピー」に倒す(BR-U09)。「たぶん未変更」への最適化(退避スキップ)を将来入れる場合も、NFR-002 の検証(退避実在テスト)を弱めない。
