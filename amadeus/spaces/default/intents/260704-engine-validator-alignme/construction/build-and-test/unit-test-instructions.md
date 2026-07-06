# Unit Test Instructions

Test Strategy: Minimal（要件 1 件につき検証 1 件）。
テスト基盤は dev-scripts/evals 配下の check.ts 方式であり、vitest / jest は使わない。
検証の内訳は code-generation-plan.md のトレーサビリティ表、実装内容は code-summary.md に対応する。

## 実行コマンド

要件対応の検証を含むスイートは次の 2 つ。

```bash
npm run test:it:amadeus-validator   # V18〜V20（FR-1.2, FR-2, FR-3.3）
npm run test:it:engine-e2e          # FR-1.1, FR-3.1, FR-3.2, FR-4
```

全体確認（AC-3）:

```bash
npm run test:all
```

## 要件と検証の対応

| 検証 | 要件 |
|------|------|
| engine-e2e：intent-birth が `in_progress` を書く | FR-1.1 |
| amadeus-validator V18：`in-flight` の record が pass する | FR-1.2 |
| amadeus-validator V19：小文字 `**Phase**: ideation` / `**Phase boundary**` 形式が pass する | FR-2 |
| engine-e2e：registry に `repos` 配列が書かれる | FR-3.1 |
| engine-e2e：state に `Construction Autonomy Mode: unset` が書かれる | FR-3.2 |
| amadeus-validator V20：`repos` / `Construction Autonomy Mode` 未設定が pass する | FR-3.3 |
| engine-e2e：surface が実エントリ数と正しい phase を返す | FR-4 |

## テストデータ

- fixtures は `dev-scripts/evals/amadeus-validator/fixtures/` の既存構成に追加済み。
- engine-e2e は一時ディレクトリに sandbox workspace を組み立てるため、実 record を汚さない。
