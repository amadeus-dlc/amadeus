# Security Test Instructions — tie-choice-resolution

上流入力: `construction/tie-choice-resolution/code-generation/code-generation-plan.md`、`construction/tie-choice-resolution/code-generation/code-summary.md`、`security-design.md`。

## 脅威と確認面

- Tampering: `choice:<n>` を構文検証後、election.choices の実在値と照合する。
- Integrity: 検証成功前に resolution を append せず、失敗時の tally bytes を不変にする。
- Information Disclosure: エラーは入力値と公開 choice 一覧だけを含み、内部 path/stack/秘密情報を出さない。
- 新しい network/auth/dependency 境界はないため DAST、認証、依存脆弱性の専用追加試験は非該当。

## 実行と合格条件

```sh
bun test tests/unit/t244-election-choice-resolution.test.ts tests/integration/t244-election-tie-choice.integration.test.ts
bun run lint
bun run typecheck
```

二値、非数値、先頭ゼロ、非実在 choice が exit 1 で loud 拒否され、副作用がないことを要求する。全 test と静的検査が exit 0 なら PASS とする。
