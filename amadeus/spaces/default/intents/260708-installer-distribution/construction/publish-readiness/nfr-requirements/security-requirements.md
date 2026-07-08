# Security Requirements — publish-readiness

> ステージ: nfr-requirements (3.2) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`(手順書章立て)・`business-rules.md`(BR-P01〜P03)、feasibility(サプライチェーン)、scope W5(provenance 不採用)

## SEC-P01: サプライチェーン最小面

- publish 対象は PackContract の5ファイルのみ(契約テスト+ドリフトテストが常時強制 — BR-P02/P03)。ソース .ts・テスト・内部設定の混入は unexpected 検出で CI が赤くなる
- 実行時依存ゼロ(NFR-005)により、公開パッケージの依存ツリー起因の脆弱性面がゼロ

## SEC-P02: publish 資格情報の扱い

- npm 認証情報は**リポジトリ・CI に一切置かない**(CON-004: CI 自動 publish なし)。publish はメンテナのローカル npm ログインセッションで実施し、手順書は 2FA(auth-and-writes)の有効化を前提条件に含める
- 手順書に token の発行・保存を指示する記述を置かない(誤って CI 化する導線を作らない)

## SEC-P03: provenance の明示的不採用

npm provenance / Sigstore 署名は初回スコープ外(scope W5、CON-004)。手順書に「現状は provenance なし」であることを明記し、将来 CI 公開へ移行する際の再検討ポイントとして記録する(feasibility の compliance 観点と整合)。
