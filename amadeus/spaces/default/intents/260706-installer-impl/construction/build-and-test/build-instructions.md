# Build Instructions — インストーラ実装 (`@amadeus-dlc/setup`)

## Upstream Inputs

この手順は、U1–U8 の各 unit `code-generation/code-generation-plan.md` と `code-generation/code-summary.md` を入力として作成した。

- **U1** package shell: Bun entrypoint、parser、help/error boundary
- **U2** version / distribution source: GitHub tag、archive、metadata
- **U3** target state / manifest: detection、snapshot、manifest schema
- **U4** operation planning: backup、collision、upgrade policy
- **U5** apply / verify / UX: file applier、manifest write、verification、reporter
- **U6** test harness: fake ports、fixtures、integration scenarios
- **U7** CI gates: gate registry、change detector、security/coverage gates
- **U8** release / docs: release preflight、publish validation、docs consistency

## Environment Setup

```bash
bun install --frozen-lockfile
```

- **Runtime**: Bun 1.3.13（CI と同版本）
- **環境変数**: 通常の unit / integration test では live GitHub 不要（fake ports 使用）
- **外部サービス**: 不要（archive/tag は test double）

## Build Commands

インストーラ package の compile 安全と workspace 整合を確認する。

```bash
bun run typecheck
bun packages/setup/src/maintainer/package-check.ts
bun packages/setup/src/maintainer/package-dry-run.ts
```

リポジトリ全体の drift guard（installer PR で U7 が条件付き実行）:

```bash
bun run dist:check
bun run promote:self:check
```

## Build Verification

期待結果:

| コマンド | 確認内容 |
|---------|---------|
| `typecheck` | `packages/setup/src/**` と `tests/**` が型安全 |
| `package-check` | npm publish metadata、bin、files allowlist、root dev-only boundary |
| `package-dry-run` | tarball に期待ファイルのみ含まれる |
| `dist:check` | `core/` + `harness/` から `dist/*` が drift しない |
| `promote:self:check` | self-install targets が dist と同期 |

## Troubleshooting

- `tsc: command not found` → `bun install --frozen-lockfile` を実行
- `package-dry-run` 失敗 → `packages/setup/package.json` の `files` allowlist と実ファイルを照合
- `dist:check` 失敗 → installer 変更とは無関係な dist drift。必要なら packaging を再生成
