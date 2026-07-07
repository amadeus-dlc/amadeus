# Code Summary — U1 Setup Package Shell

> Stage: construction / code-generation  
> Unit: U1 Setup Package Shell

## 実装概要

`@amadeus-dlc/setup` の publishable package shell を `packages/setup/` に追加した。root `package.json` は dev-only のまま維持し、公開対象の package metadata、bin wrapper、Bun entrypoint、parser、help/error renderer、U1 application boundary、maintainer metadata check を setup package 内に閉じた。

U1 の valid `install` / `upgrade` は downstream 処理へ進まず、分類済み `not-implemented-in-this-slice` result を返す。version resolution、archive fetch、target detection、operation planning、apply、manifest write は実装していない。

## 変更ファイル

- `packages/setup/package.json`: `@amadeus-dlc/setup` の package metadata、bin `amadeus-setup`、runtime files allowlist、metadata check script を追加。
- `packages/setup/bin/amadeus-setup.js`: Node/npm wrapper。PATH から Bun を検出し、argv-array spawn で Bun entrypoint へ delegation。Bun 不在時は human-readable `bun-required` を出す。
- `packages/setup/src/bin/amadeus-setup.ts`: Bun entrypoint。`runSetup` result を stdout/stderr/exit code へ写像。
- `packages/setup/src/bin/run-setup.ts`: parser/help/error/application-boundary の top-level orchestration。help/error path は service delegation しない。
- `packages/setup/src/cli/command-parser.ts`: `install` / `upgrade`、help、`--harness`、`--target`、`--version`、`--yes`、`--force` の parser。`init`、unknown command、duplicate/unsupported harness、multiple commands を分類。
- `packages/setup/src/cli/reporter.ts`: canonical help と classified error renderer。
- `packages/setup/src/cli/types.ts`: U1 value object と result/error types。
- `packages/setup/src/application/setup-service.ts`: U1 の no-target-access boundary result。
- `packages/setup/src/maintainer/package-check.ts`: package name/bin/license/repository/files allowlist/root dev-only boundary の structured checker。
- `packages/setup/README.md`: U1 package shell の最小 package docs。
- `tests/unit/t202-setup-package-shell.test.ts`: parser、help、boundary、metadata check、Bun entrypoint smoke、Node wrapper Bun 不在ケースの tests。
- `tsconfig.json`: `packages/setup/src/**/*.ts` を typecheck scope に追加。
- `package.json`: lint scope に `packages/setup/` を追加。
- `bun.lock`: `bun install` により workspace package を含む lockfile を更新。

## 判断

- npm bin は JS wrapper (`bin/amadeus-setup.js`) にし、Bun 実行本体は TS (`src/bin/amadeus-setup.ts`) に分離した。これにより `npx` path は Node で起動しても Bun へ安全に delegation できる。
- U1 は target path を文字列として保持するだけで、resolve/stat/read/write は行わない。help/parser/runtime error path は application boundary も呼ばない。
- `--force` は `--yes` を含意しない。U1 では両 flag を downstream 用に保持するだけで collision policy は適用しない。
- `init` は help に出さず、`unsupported-command` として `install` への next action を返す。

## 検証

- `mise trust` — 成功 (`No untrusted config files found`)。
- `bun install` — 成功。`tsc` 実行に必要な dev dependencies を復元し、lockfile を更新。
- `bun test tests/unit/t202-setup-package-shell.test.ts` — 成功、9 tests。
- `bun run typecheck` — 成功。
- `bunx @biomejs/biome check packages/setup/ tests/unit/t202-setup-package-shell.test.ts` — 成功。
- `bun run lint` — 終了コード 0。既存 `tests/` 側の warnings/infos は表示されたが、追加した setup package と U1 test に新規 blocking diagnostics はない。
- `bun run check` — 成功。`lint` と同じ既存 warnings/infos は表示。
- `bun packages/setup/src/maintainer/package-check.ts` — 成功、全 checks passed。
- `bun packages/setup/src/bin/amadeus-setup.ts --help` — 成功。`install` / `upgrade` のみ表示し、`init` は表示しない。
- `/Users/j5ik2o/.local/share/mise/shims/node packages/setup/bin/amadeus-setup.js --help` — 成功。Node wrapper が PATH 上の Bun へ delegation できることを確認。
- `git diff --check` — 成功。

## 逸脱・延期

- U1 計画通り、version resolution / archive fetch / target detection / operation planning / apply / manifest write は実装していない。valid command は `not-implemented-in-this-slice` で停止する。
- CI workflow、release workflow、package build artifact generation は U7/U8 scope のため追加していない。
- root `package.json` は publishable package に変換していない。
