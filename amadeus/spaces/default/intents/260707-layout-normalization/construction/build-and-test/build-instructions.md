# Build Instructions — Workspace Layout Normalization

## Upstream Inputs

この手順は、各 unit の `code-generation-plan` と `code-summary` を入力として作成した。

- `U1 Layout Decision Record`: design record 更新、`core` / `harness` source relocation あり。
- `U2 Contributor Documentation Update`: README/docs 更新、generated `dist/` 変更なし。
- `U3 Guard Validation Plan`: validation checklist 追加、command 実行は Build and Test で扱う。
- `U4 Follow-up Migration Preparation`: future migration slices 追加。今回の実装移行は `core` / `harness` のみで、`scripts` / `dist` は維持。

## Environment Setup

依存関係が未インストールの場合は、lockfile を固定して次を実行する。

```bash
bun install --frozen-lockfile
```

環境変数や外部 service は不要。今回の変更は documentation/design record のみで、AWS、Claude CLI、tmux、database などの live substrate は使わない。

## Build Commands

今回の build verification は、workspace layout decision が配布物生成と self-install contract を壊していないことを確認する。

```bash
bun run dist:check
bun run promote:self:check
bun run typecheck
```

`bun run check` は `typecheck` と `lint` の組み合わせだが、結果記録を分けるため個別に実行する。

## Build Verification

期待結果:

- `bun run dist:check`: `core/` + `harness/` から生成される `dist/*` に drift がない。
- `bun run promote:self:check`: root `.claude/.codex/.agents` が generated distributions と同期している。
- `bun run typecheck`: TypeScript compile check が成功する。

## Troubleshooting

- `tsc: command not found` の場合: `node_modules` がない可能性が高い。`bun install --frozen-lockfile` を実行してから再試行する。
- `dist:check` が失敗する場合: authored source と committed `dist/*` の差分を確認し、必要なら packaging output を再生成する。
- `promote:self:check` が失敗する場合: generated distributions と project-local self-install targets の同期差分を確認する。
