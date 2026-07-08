# Security Design — publish-readiness

> ステージ: nfr-design (3.3) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-requirements/security-requirements.md`(SEC-P01〜P03)・`tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(手順書章立て)

## SEC-P01(サプライチェーン最小面)の実装構造

- PackContract の unexpected 検出は **許可リスト方式**(requiredFiles との完全一致 — 「禁止リストの漏れ」が構造的に発生しない)
- 契約テスト・ドリフトテストは `packages/setup` ディレクトリ内で完結(リポジトリ他所の状態に依存しない — テストの独立実行可能性)

## SEC-P02/P03 の実装構造

- 手順書は**コマンドと期待出力のみ**で構成し、トークン文字列・認証情報のプレースホルダを一切含めない(コピペしても秘密が生まれない構造)
- 手順書の前提確認章に 2FA 有効化・スコープ確保・タグ実在の3点を並記(U4 functional-design 章立て1 — 反映済み)
- SEC-P03 の「現状 provenance なし」の明記は**手順書 章立て5(手動 publish)**に置く(publish コマンドの直近で読まれる位置 — 将来 CI 化検討時の再訪ポイントとして注記)
