# 収束レポート — election-question-tally

## 判定

**READY（local U2 code-generation scope）**。BR-R6 の ordering gap を test-first で閉じ、focused unit/PBT/integration、typecheck、lint、build、source-only boundary、whitespace 検査が成功した。未解決 `BLOCKER` と build による tracked drift はない。

リモート review thread、mergeability、必須 check rollup は本 directive の対象外であり、外部状態の照会・更新は行っていない。この READY は repository hosting 上の PR 収束または merge 可否を意味せず、U2 の local 実装・検証面だけを表す。

## 観測断面

- observed at: `2026-08-13T16:52:43Z`
- HEAD: `cd225e6ea1c5834aaa79b3e68030213ba04c9340`
- integrated U2 baseline: `63a8b317ee487ad7f3592a4e9691dbc6ca38311e`
- branch: `enhancement-election-cli-cli-per-question-choice`

## 実行証拠

| Command | Result |
|---|---|
| `bun test tests/unit/t549-election-question-tally.test.ts tests/unit/t550-election-question-tally.pbt.test.ts`（変更前 baseline） | exit 0、2 files、10 pass / 0 fail / 428 expect calls |
| `bun test tests/unit/t549-election-question-tally.test.ts`（ordering test 追加後、実装修正前） | exit 1、8 pass / 1 fail / 28 expect calls。`resolveResponses` が definition を受けず BR-R6 を満たさない Red を実測 |
| `bun test tests/unit/t549-election-question-tally.test.ts tests/unit/t550-election-question-tally.pbt.test.ts tests/integration/t553-election-mixed-lifecycle-cli.integration.test.ts`（build 後最終） | exit 0、3 files、14 pass / 0 fail / 463 expect calls |
| `bunx @biomejs/biome check packages/framework/core/tools/amadeus-election-question-tally.ts tests/unit/t549-election-question-tally.test.ts tests/unit/t550-election-question-tally.pbt.test.ts` | exit 0、3 files、diagnostic なし |
| `bun run typecheck` | exit 0。source と tests の `tsc --noEmit` が成功 |
| `bun run lint` | exit 0。1817 files、473 warnings / 17 infos。既存 complexity 等の警告で、U2 個別検査は clean |
| `bun run build` | exit 0。8 harness の `dist/` と self-install 面を再生成 |
| `rg --hidden --no-ignore -l "export function resolveResponses\\(" dist` と CLI call-site 述語 | tally source と CLI call site の双方が8 harness projectionすべてに存在 |
| `bun run source-only:check` | exit 0、`source-only boundary: clean` |
| `git diff --check` | exit 0、whitespace error なし |
| `git diff --name-only -- amadeus/spaces/default/intents/260813-election-multiq/amadeus-state.md` | output なし。state file 不変 |

## 収束対象

- Contract gap: resolved response output が definition voter/question 順ではなく、最初に観測した key の Map 挿入順だった。
- Fix: canonical definition の voter/question index で stable sort。未知 ID は末尾へ残し、後段の fail-closed validation を維持。
- Integration: production call site 1箇所から snapshot definition を渡す。
- Regression evidence: bob→alice、q-b→q-a の逆順入力が alice/q-a、alice/q-b、bob/q-a、bob/q-b の順へ正規化される。
- Change isolation: U2 source 1 file、既存 production call site 1行、既存 U2 unit/PBT 2 files、宣言済み stage artifacts。U2 以外の user/workflow changes は変更していない。

## 未実施面

- `bun run test:ci`、coverage gates、isolated reproducible-build check、NFR-2 baseline/treatment benchmark、TLC/model-map は後続 Build and Test / U7 / U8 ownership であり、本 unit directive では実行していない。
- 外部 repository hosting の review/merge/check 状態は照会していない。
- reviewer invocation と durable review projection は conductor 所有であり、本 delegated agent は実行していない。

## Blocker

なし。
