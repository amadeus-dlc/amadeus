# Security Design — docs-rollout

> ステージ: nfr-design (3.3) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../nfr-requirements/security-requirements.md`(SEC-D01/D02)・`tech-stack-decisions.md`、`../functional-design/business-logic-model.md`

## SEC-D01(README コマンド安全性)の実装構造

- README の Quickstart コマンドは **U2 の CLI 契約(business-logic-model の正準形)からの転記**とし、独自に文言を発明しない。PR レビューチェックリスト(REL-D02 の grep 2点)に「掲載コマンドが CLI 契約と一致」を1項目追加(パイプ実行・sudo 前置の不在は転記元が保証)

## SEC-D02(メタデータ是正の正確性)の実装構造

- root package.json の是正は **license / repository.url の是正+`repository.directory` の削除**の最小 diff(それ以外の行に触れない — PR レビューで diff の狭さ自体を確認材料にする)
  - `directory` の出典: ideation `feasibility/raid-log.md` I2 の対応欄「`directory` サブフィールドも実態に合わせ見直し(approval-handoff でユーザー確認済み)」。現値 `"claude-code"` は旧 awslabs モノレポ内パスの残骸であり、現リポジトリではパッケージがリポジトリルートに在るため**フィールド自体を削除**が正(SEC-D02 の「新規フィールドを追加しない」と整合 — 追加ではなく残骸の除去)
