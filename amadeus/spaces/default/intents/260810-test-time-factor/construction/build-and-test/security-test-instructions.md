# セキュリティテスト手順 — TEST_TIME_FACTOR

上流の [`code-generation-plan.md`](../{unit-name}/code-generation/code-generation-plan.md) と [`code-summary.md`](../{unit-name}/code-generation/code-summary.md) を対象とする。本変更はテスト専用環境変数とCI設定であり、認証・認可・外部データフローは追加しない。

## 静的検査

```sh
bun run typecheck
bun run lint
bun run source-only:check
bun tests/test-time-factor-guard.ts
```

- `TEST_TIME_FACTOR` の非数値、非有限値、`1` 未満、overflow を fail-fast に拒否する。
- workflow へシークレット値を追加せず、公開可能な数値 `2` だけを設定する。
- 生成物や一時 fixture が追跡対象へ越境しないことを source-only check で確認する。

## 適用外の検査

- 実行中Webアプリケーションがないため DAST、認証試験、SQL/HTML injection 試験は適用外である。
- 新規依存関係を追加していないため、本 Intent 固有の dependency audit / SBOM 差分はない。

## 成功条件

- 静的検査が error `0` で完了し、秘密情報や新しい外部攻撃面が差分へ入っていない。
