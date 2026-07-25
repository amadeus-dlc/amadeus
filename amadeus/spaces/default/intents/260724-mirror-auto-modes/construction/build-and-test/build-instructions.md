# Build Instructions — mirror-auto-modes

## 前提と上流成果物

- Bun 1.3.13、Node.js互換のTypeScript実行環境、リポジトリの既存依存関係を使用する。新しいruntime dependencyや外部serviceは不要である。
- 依存関係は`bun install --frozen-lockfile`で復元する。既に同じlockfileで導入済みの場合は再導入しない。
- 上流は各Unitの`code-generation/code-generation-plan.md`と`code-generation/code-summary.md`である。対象Unitは`mirror-contract-policy`、`mirror-github-gateway`、`mirror-state-provenance`、`mirror-operation-lifecycle`、`mirror-distribution-docs`の5件。
- GitHub実mutationは行わない。テストはfake gateway、temporary filesystem、checked-in fixtureを使用する。

## ビルドと検証手順

1. `bun run typecheck`でsourceとtestsのTypeScript contractを検証する。
2. `bun run lint`でBiome errorが0件であることを確認する。
3. `bun tests/complexity-gate.ts --check`で新規・回帰complexity violationが0件であることを確認する。
4. `bun run distribution:check`でProjection Registry、文書contract、公開artifact scanを検証する。
5. `bun run dist:check`と`bun run promote:self:check`で6 dist面と4 self-install面のdriftがないことを確認する。
6. `bun tests/gen-coverage-registry.ts --check`でcoverage registryとratchetの鮮度を確認する。
7. `git diff --check`でwhitespace errorとconflict marker残存を検査する。

## 成功条件とトラブルシュート

- 全commandがexit 0であること。生成物driftがある場合は正本を確認し、`bun scripts/package.ts`、`bun run promote:self`の順で再生成してから再検証する。
- worktree固有Git ref解決の失敗はassertion実文まで確認し、Mirror変更との依存関係を切り分ける。既知Issueを理由に検査を省略しない。
- 未完了distribution journalが報告された場合、read-only checkでは修復せず、明示的な`bun run distribution:recover`の必要性を判断する。
