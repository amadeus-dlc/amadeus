# Unit Test Instructions — hooks-config-conflict（Issue #770）

上流入力（consumes全数）: `../fix-770-hooks-config-conflict/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../fix-770-hooks-config-conflict/code-generation/code-summary.md`（`code-summary`）。

## Minimal戦略と要件対応

Test StrategyはMinimalであり、要件駆動の回帰を優先する。実FS/Git境界を含む欠陥なのでtest fileは`tests/integration/`に置くが、検査単位は各要件の純粋seamと決定的fixtureである。

| 要件 | 主なtest file | 検査内容 |
| --- | --- | --- |
| FR-1 / AC-1a〜1f | `tests/integration/t-codex-hooks-ownership.test.ts`、`t-codex-hooks-migration.test.ts` | canonical/active所有分離、activation、doctor、self migration |
| FR-2 / AC-2a〜2e | `tests/integration/t-codex-hooks-packaged-consumer.test.ts`、`tests/unit/t150-codex-packaging.test.ts` | packaged consumer、manifest投影、dist parity |
| FR-3 / AC-3a〜3e | `tests/integration/t-run-codex-project-target.test.ts`、`t-team-up-codex-resume.test.ts` | launcher順序、project target、writer再適用、resume |
| FR-4 / AC-4a〜4g | 上記全体、`tests/unit/gen-coverage-registry.test.ts` | RED/green対、coverage registry、Linux CI不在path |

## 実行方法

focused回帰:

```sh
bun test tests/integration/t-codex-hooks-ownership.test.ts tests/integration/t-codex-hooks-migration.test.ts tests/integration/t-codex-hooks-packaged-consumer.test.ts tests/integration/t-run-codex-project-target.test.ts tests/integration/t-team-up-codex-resume.test.ts tests/unit/gen-coverage-registry.test.ts tests/unit/t150-codex-packaging.test.ts
```

全体回帰:

```sh
bun run test:ci
```

## テストデータと合否

- Git repository、bare origin、consumer checkout、backupは`mkdtempSync`配下に作り、実ユーザーcloneやactive hooksを変更しない。
- deterministic writer stubでminify・agmsg group追加・反復適用を再現する。外部agmsgはCI依存にしない。
- focused command、full CIともfailed 0を必須とする。OS制約で作成不能な不正UTF-8 filename 1件のskipは理由付き既知条件として扱う。
- production追加行はCode Generationでfull LCOV `857 measured / 857 covered / 0 allowlisted / 0 uncovered`を確認済みであり、無意味なcoverage増加ではなくFR/ACへtraceする。
