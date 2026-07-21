# Build Instructions — team-up Codex safety-wait

## 入力と前提

本手順は、単一Unit `team-up-safety-wait` の [Code Generation Plan](../team-up-safety-wait/code-generation/code-generation-plan.md) と [Code Generation Summary](../team-up-safety-wait/code-generation/code-summary.md) を正準入力とする。対象はAmadeus repository内のTypeScript helperと既存shell launcherであり、新規runtime dependency、environment variable、test fixture injection、外部Codex source/testを必要としない。

- repository rootでBunと既存dependencyが利用可能であること。
- 実Herdr/current runへ入力しないこと。Enter検証はunit fake adapterだけで行う。
- dirty worktreeに他Intent差分があるため、merge、stash、reset、checkout、rebaseを行わない。

## Build commands

```sh
bun run typecheck
bun run dist:check
bash -n scripts/team-up.sh
```

この変更はruntime bundleを新設しない。`typecheck`でTypeScript境界、`dist:check`でframework生成物の非退行、`bash -n`でlauncher構文を検証する。

## Build verification

- 3 commandがすべてexit 0であること。
- `scripts/team-up-codex-safety-wait.ts`からtest fixture path、fixture id、environment injection、fixture/fingerprint CLI flagへ到達しないこと。
- production positiveはprivate定数1件、production confirmed-absence集合は空であること。
- 失敗時はcommand、exit code、対象fileを`build-test-results.md`へ記録し、機能codeの修正は再現testを先に追加できる場合だけ行う。

## Troubleshooting

- `typecheck`失敗は対象3 TypeScript fileの診断と既存他Intent診断を分離する。
- `dist:check`失敗で無関係なgenerated treeを更新しない。team-up差分に因果がなければ外部失敗として記録する。
- 実Herdr paneを使った確認、外部Codex checkout、危険prompt、filter回避は代替手段にしない。
