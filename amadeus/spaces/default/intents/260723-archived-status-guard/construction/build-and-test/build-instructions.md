# ビルド手順

## 前提と入力

- Bun 1.3.13 互換環境を使用する。
- `bun install --frozen-lockfile` で依存関係を固定する。
- 入力は各Unitの `code-generation-plan.md` と `code-summary.md` とする。
- AWS認証情報や外部サービスは不要で、テストはローカルfixtureだけを使う。

## 実行と確認

```sh
bun run typecheck
bun run dist:check
bun run promote:self:check
bun run test:ci
```

成功条件は、型エラー0、6 harnessと4 self-install面のdrift 0、全テスト失敗0である。配布物に差分が出た場合は `packages/framework/core/` を正本として `bun run promote:self && bun run dist` を実行し、再確認する。
