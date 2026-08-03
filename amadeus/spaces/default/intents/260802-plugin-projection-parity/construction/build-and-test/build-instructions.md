# Build Instructions — plugin projection parity

## 上流成果物と前提

- 対象は `plugin-projection-parity` の `code-generation-plan.md` と `code-summary.md` が定義・実装した Issue #2018 の corrective `self-fix` である。
- Bun 1.3.13、Git、インストール済みworkspace dependencyを使用する。長時間稼働サービス、database、外部API、環境変数、認証情報は不要である。
- `dist/` とrootのharness投影は手編集せず、`scripts/package.ts` と `scripts/promote-self.ts` から生成する。
- worktreeでは事前に `mise trust` を実行済みである。

## Buildと検証コマンド

依存関係が未導入の場合だけ `bun install --frozen-lockfile` を実行する。その後、次をrepository rootで実行する。

```bash
bun run typecheck
bun run lint
bun scripts/package.ts --check
bun run promote:self:check
bun run distribution:check
```

生成物を意図的に更新する場合は、framework sourceを変更してから `bun scripts/package.ts`、`bun run promote:self` の順に実行し、上記checkを再実行する。

## Build合格条件

- TypeScript production/test projectがどちらも型エラー0件である。
- Biomeがexit 0であり、新しいerrorがない。既存cognitive-complexity warningはbaselineとして許容する。
- 7 package面のdrift check、5 self-install面のpromotion check、distribution mirror/contract checkがすべてexit 0である。
- Codex正規runner `.agents/skills/amadeus-formal-model-check/SKILL.md` が存在し、非正規 `.codex/skills/amadeus-formal-model-check/SKILL.md` とroot `.kiro` が存在しない。

## トラブルシュート

- constrained VMでBun testがcold compile timeoutになった場合は、失敗ファイルだけ `bun test --timeout 120000 <file>` で再実行し、再現しない場合は負荷flakyとして結果へ記録する。
- `package.ts --check` が失敗した場合は `dist/` を直接修正せず、対応する `packages/framework/` またはgeneratorを修正して再生成する。
- `promote:self:check` の MISSING／DIFFERS／ORPHAN／MISPLACED は、出力されたharnessとpathを所有manifestおよびcomposition ledgerまで追跡する。
