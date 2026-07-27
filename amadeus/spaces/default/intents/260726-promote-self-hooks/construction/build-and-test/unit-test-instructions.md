# Unit Test Instructions — 260726-promote-self-hooks

上流入力 (consumes 全数): code-generation-plan.md, code-summary.md

テスト戦略: amadeus-bugfix スコープ = Comprehensive。本変更の unit 層は既存ファイルの追随更新が主 (新規 unit 追加はサイズ規約上 integration へ配置 — code-summary.md 乖離節参照)。

## 対象と実行

- `tests/unit/t209-promote-self-dangling-symlink.test.ts` — promote-self の symlink 耐性 + async 化追随 + `KIMI_CODE_HOME` 隔離。実行: `bun test tests/unit/t209-promote-self-dangling-symlink.test.ts`
- `tests/unit/t200-promote-self-composed-scope.test.ts` — composed scope 保護の純粋関数テスト (回帰確認)。実行: `bun test tests/unit/t200-promote-self-composed-scope.test.ts`
- ドメイン純粋層: `bun test tests/unit/setup-kimi-hooks-domain.test.ts` (変更なし・回帰確認)

## 期待

全パス。失敗時は promote-self.ts の apply/merge 経路と fixture 構成を確認。
