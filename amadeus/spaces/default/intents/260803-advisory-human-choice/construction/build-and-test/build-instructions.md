# Build Instructions — advisory-human-choice

## 上流成果物と対象

- `construction/advisory-human-choice/code-generation/code-generation-plan.md`のStep 9を実行基準とする。
- `construction/advisory-human-choice/code-generation/code-summary.md`に記録された正本、生成投影、Formal Model Check plugin、テスト変更を対象とする。
- 本リポジトリはBun-only TypeScript monorepoであり、常駐サービス、データベース、外部環境変数は不要である。

## 前提条件

1. Bun 1.3.13を利用する。
2. 依存関係が未導入の場合だけ`bun install --frozen-lockfile`を実行する。
3. worktreeを信頼済みにする。今回のセッションでは`mise trust`実行済みである。
4. `dist/`と自己インストール投影は直接編集せず、正本から生成する。

## Buildコマンド

```bash
bun run typecheck
bun scripts/package.ts --check
bun run promote:self:check
git diff --check
```

静的品質確認として次も実行する。

```bash
bun run lint
```

## 成功条件

- TypeScript production/test設定の型検査がexit 0になる。
- 7 harnessのpackage projectionと自己インストール投影にdriftがない。
- whitespace errorがない。
- lint失敗がある場合は、変更起因か既存base起因かをfile単位で特定し、変更起因なら修正する。

## トラブルシューティング

- 重いBunテストが30秒でtimeoutした場合は、失敗fileを`bun test --timeout 120000 <file>`で直列再実行し、決定的失敗とCPU競合を分離する。
- projection driftは正本を修正後、`bun scripts/package.ts`と`bun run promote:self`で再生成する。
- `doctor`や`status`はactive intentを必要とする。本検証ではactive intentが解決済みである。
