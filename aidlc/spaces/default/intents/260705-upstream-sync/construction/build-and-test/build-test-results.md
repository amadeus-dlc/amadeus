# build-test results（260705-upstream-sync）

上流入力: [build-instructions.md](build-instructions.md) ほか本ステージの instructions 4 件。

## 実行結果（2026-07-06T01:15:54Z、commit 3331a259 時点）

| コマンド | 結果 |
|---|---|
| `npm run test:all` | exit 0（typecheck / lint:check / contracts / parity / claude-wiring / grilling-wiring / issue-ref-contract / test:it:all / engine-e2e / diff:check 全件 pass） |
| `npm run parity:check` | ok（39 skills、199 engine files、基準 commit b67798c37c71855271b70882a33f47890d41f212） |
| `npm run test:it:installer` | exit 0 |
| `npm run test:it:promote-skill` | exit 0 |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-upstream-sync` | pass（不足・矛盾なし） |
| scope-grid の pdm 維持 | 12 / 32 EXECUTE（grid 直読で確認） |

## TDD 証跡

parity-baseline を b67798c3 で再生成した直後の `parity:check` は 6 件差分で fail（RED）し、取り込み完了後に ok（GREEN）へ転じた。詳細は [code-generation-plan.md](../upstream-sync/code-generation/code-generation-plan.md) の Step 1 / Step 9。

## 失敗と対処

なし（全件 pass）。既知のスコープ外事項: scope-table --check の ENOENT は既存の rename 漏れで Issue #537 へ切り出し済み。
