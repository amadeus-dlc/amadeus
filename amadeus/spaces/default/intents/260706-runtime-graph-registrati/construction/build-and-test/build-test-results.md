# build-test results（260706-runtime-graph-registrati）

上流入力: [build-instructions.md](build-instructions.md) ほか本ステージの instructions 4 件。

## 実行結果（2026-07-06T07:20:04Z、fresh 実行）

| コマンド | 結果 |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run test:all` | exit 0（hooks-state-bugfix / engine-e2e の新ケース含む全連鎖 pass） |
| `npm run parity:check` | ok（39 skills、199 engine files、基準 commit b67798c3） |
| `bun run dev-scripts/evals/hooks-state-bugfix/check.ts` | pass（#558 4 ケース含む） |
| `bun run dev-scripts/evals/engine-e2e/check.ts` | ok（#558a/#558b 含む） |
| validator（260706-runtime-graph-registrati 指定） | pass（不足・矛盾なし） |
| 実地確認: surface --slug code-generation（本 Intent の gate） | 成立（memory_entries_total: 6、candidates 5。#558 修正の dogfooding） |

## TDD 証跡

- FR-1: hooks-state-bugfix へ 4 ケースを先行追加し、.agents 経由 2 ケースの実装前 FAIL（RED）を確認後に regex 修正で GREEN 4/4。
- FR-2: 実装が先行したため遡及 RED（learnings 変更を git stash → #558a が復旧手順なしの旧エラーで FAIL → pop → 全 GREEN）で検出力を証明。
詳細は [code-generation-plan.md](../runtime-graph-registration/code-generation/code-generation-plan.md)。

## 失敗と対処

- reviewer Low-2（復旧ヒントの path ハードコード）を harnessDir() 動的化で即修正し、e2e 再 GREEN を確認した。Low-1/Low-3 は既存構造限界・情報レベルとして記録のみ（後続 cleanup 候補）。
