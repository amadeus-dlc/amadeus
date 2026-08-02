# Unit Test Instructions — vocab-canonicalization

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- `code-generation-plan.md` の実行形態・完了条件と `code-summary.md` の実測値(PR #2044、head b783fe45c、検証表)を本書の前提として参照した

## 対象と実行

- `bun test tests/unit/t414-glossary-projection.test.ts` — parser(EN/JA 表+manifest)、validate の fail-closed 各条件(BR-2 全5条件を1条件1テスト)、リンク再基底の純関数
- 実測(conductor 独立再実行、head b783fe45c): **Ran 33 tests / 0 fail**(48 expect)

網羅根拠: business-logic-model.md の TDD 順序 1-2 に対応。純関数層のみ(実 FS なし — fs-tests-integration-first)。

## 失敗時の読み方

- validate 系の失敗は違反の全数列挙付きで exit 1(1件目で止めない設計)。assertion 実文まで読んでから帰属を確定する(cid:code-generation:local-ci-red-assertion-verbatim)。
