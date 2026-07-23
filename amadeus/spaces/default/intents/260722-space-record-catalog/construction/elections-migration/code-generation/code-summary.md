# Code Summary — U3 elections-migration

## 実装結果

- `scripts/amadeus-election-migrate.ts`
  - dry-run 既定の純粋な MigrationPlan 合成
  - timeline 最古→空の場合のみ git 初回コミット→dry-run 時刻の導出
  - approved-plan のバイト列 SHA-256 と agmsg 承認 provenance の束縛
  - execute 前提の fail-closed 検査
  - per-entry rename→registry append
  - execute 前後の独立 `handleVerify` 同値、resolver 全件解決、registry/dir/plan 件数照合
  - docs/record の旧 direct-path 棚卸しと Markdown FidelityRecord 固定
- `tests/unit/t262-elections-migration.test.ts`
  - 導出順、冪等、競合、前提条件7分岐を検証
- `tests/integration/t262-elections-migration.integration.test.ts`
  - dry-run 無変更、hash 不一致拒否、空 timeline のみ git log、選挙内容非改変、fidelity、自己承認経路不在を検証

## 検証コマンドと結果

1. `bun test tests/unit/t262-elections-migration.test.ts tests/integration/t262-elections-migration.integration.test.ts`
   - 17 tests pass、0 fail、33 assertions
2. `bun run typecheck`
   - `tsc --noEmit -p tsconfig.json` 成功
   - `tsc --noEmit -p tsconfig.tests.json` 成功
3. `bunx @biomejs/biome check scripts/amadeus-election-migrate.ts tests/unit/t262-elections-migration.test.ts tests/integration/t262-elections-migration.integration.test.ts`
   - 対象3ファイル成功。linter sensor 相当
4. `plan_tmp=$(mktemp); bun scripts/amadeus-election-migrate.ts --project-dir . --plan "$plan_tmp"; rm "$plan_tmp"`
   - 111 elections、111 rename candidates、conflicts 0、degraded 0
   - 要件作成時103件から、その後の選挙追加で111件へ増加
   - 一時 plan のみ生成し、本番 rename・本番 `elections.json` 生成なし
5. `bun run test:ci`
   - 471 test files 中470成功
   - 変更外 `tests/integration/t-codex-hooks-migration.test.ts` の wall-clock drift 1件（medium 宣言に対して実測32.821秒）のみ失敗

## 安全性と Fidelity 契約

- migrate モジュールは `execution-approval.md` を書く API/パスを持たず、読取・検証のみ行う。
- 承認 record は `user-approval: granted`、approved-plan SHA-256、GitHub Issue URL、`agmsg:<UTC timestamp>` provenance の全フィールド必須。
- execute 前に全対象へ既存の独立 `handleVerify` を実行して baseline を固定し、execute 後は registry 行ごとに resolver 経由で物理 directory を確認して同じ検証器の通過集合が一致することを要求する。
- registry 行数、物理 directory 数、approved plan 行数が一致しない場合は FAIL とする。
- docs/record 内の旧 `elections/<dir>` 参照は自動書換えせず、FidelityRecord に一覧化して参照所有者へ委ねる。
- 選挙 directory 内の election.json、timeline、ballots、監査ファイルには書き込まない。結合テストは rename 前後の各ファイル SHA-256 同一性を固定する。

本番 `--execute` は実行していない。
