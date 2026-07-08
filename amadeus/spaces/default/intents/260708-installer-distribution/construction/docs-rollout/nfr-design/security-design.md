# Security Design — docs-rollout

> ステージ: nfr-design (3.3) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../nfr-requirements/security-requirements.md`(SEC-D01/D02)・`tech-stack-decisions.md`、`../functional-design/business-logic-model.md`

## SEC-D01(README コマンド安全性)の実装構造

- README の Quickstart コマンドは **U2 の CLI 契約(business-logic-model の正準形)からの転記**とし、独自に文言を発明しない。PR レビューチェックリスト(REL-D02 の grep 2点)に「掲載コマンドが CLI 契約と一致」を1項目追加(パイプ実行・sudo 前置の不在は転記元が保証)

## SEC-D02(メタデータ是正の正確性)の実装構造

- root package.json の是正は license / repository.url / repository.directory の3フィールドのみの最小 diff(それ以外の行に触れない — PR レビューで diff の狭さ自体を確認材料にする)
