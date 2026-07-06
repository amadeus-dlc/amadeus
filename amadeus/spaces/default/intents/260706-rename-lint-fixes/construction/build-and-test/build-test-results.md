# build-test results（260706-rename-lint-fixes）

上流入力: [build-instructions.md](build-instructions.md) ほか本ステージの instructions 4 件。

## 実行結果（2026-07-06T02:55:54Z、fresh 実行）

| コマンド | 結果 |
|---|---|
| `npm run test:all` | exit 0（linter-sensor / rename-leftovers / no-stub-compat を含む全連鎖 pass） |
| `npm run parity:check` | ok（39 skills、199 engine files、基準 commit b67798c3） |
| `npm run test:it:rename-leftovers` | exit 0（8/8） |
| `npm run test:it:linter-sensor` | exit 0（4/4） |
| `bun amadeus-utility.ts scope-table --check` | exit 0（#537 AC） |
| validator（260706-rename-lint-fixes 指定） | pass（Per unit の record 整合更新後、不足・矛盾なし） |

## TDD 証跡

- B001/B002: rename-leftovers eval を先行作成し、(a) skillMdPath 旧パス・(b) learnings 旧名・(d) scope-table ENOENT の fail（RED）を確認後に修正で GREEN（8/8）。
- B003: linter-sensor eval を先行作成し、(a) が現行 eslint 経路の exit 127 で fail（RED）することを確認後に 2 段検出実装で GREEN（4/4）。
詳細は [code-generation-plan.md](../rename-lint-fixes/code-generation/code-generation-plan.md)。

## 失敗と対処

- validator の初回実行が `construction/[TBD]/` の produces 要求で fail した。原因は units-generation SKIP 時の Per unit: [TBD]（既知の record 整合、project.md Corrections c2）。実 unit 名 rename-lint-fixes へ手動更新して pass。
