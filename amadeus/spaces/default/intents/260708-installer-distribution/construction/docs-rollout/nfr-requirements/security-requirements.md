# Security Requirements — docs-rollout

> ステージ: nfr-requirements (3.2) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`(ワークフロー1: README 刷新)・`business-rules.md`(BR-D01/D03)

## SEC-D01: README 記載コマンドの安全性

README に掲載するワンライナー・コマンド例は、**設計済みの正確な形**(`bunx @amadeus-dlc/setup install` 等、U2 の CLI 契約どおり)のみとし、`curl | sh` 型のパイプ実行・sudo 前置・未検証 URL を含めない。ユーザーが README からコピペする文字列が攻撃面にならないことをドキュメントレビューで確認する。

## SEC-D02: メタデータ是正の正確性(I1/I2)

root package.json の license/repository 是正は「正しい値への置換のみ」であり、新規フィールド・スクリプトを追加しない(公開ページの誤情報という信頼リスクの解消 — feasibility compliance 観点)。

- 検証: t68 とは独立に、`license == "(MIT OR Apache-2.0)"` と `repository.url` の値を目視+PR レビューで確認(コード検証は package.json の静的値のため不要)
