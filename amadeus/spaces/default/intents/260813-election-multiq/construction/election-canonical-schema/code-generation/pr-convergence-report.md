# 収束レポート — election-canonical-schema

## 判定

**READY（local U1 code-generation scope、Reviewer Iteration 1 是正後）**。focused tests、typecheck、lint、build が成功し、empty-only contract と whitespace-only legacy compatibility を regression test で固定した。未解決 `BLOCKER` と生成物の tracked drift はない。

リモートの review thread、mergeability、必須 check rollup は本 directive の対象外であり、外部状態の照会・更新は行っていない。この READY は repository hosting 上の merge 可否を意味せず、U1 の local 実装・検証面だけを表す。

## 実行証拠

| Command | Result |
|---|---|
| `bun test tests/unit/t547-election-codec.test.ts`（Reviewer 是正 test 追加後、実装修正前） | exit 1、6 pass / 1 fail / 35 assertions。whitespace-only legacy question が `invalid-value` で拒否される Red を実測 |
| `bun test tests/unit/t547-election-codec.test.ts tests/unit/t548-election-codec.pbt.test.ts`（最終） | exit 0、2 files、9 pass / 0 fail / 1237 assertions |
| `bun run typecheck` | exit 0。`tsc --noEmit -p tsconfig.json` と `tsc --noEmit -p tsconfig.tests.json` が成功 |
| `bun run lint` | exit 0。1817 files を検査、473 warnings / 17 infos。報告箇所は U1 変更対象外 |
| `bunx @biomejs/biome check packages/framework/core/tools/amadeus-election-codec.ts tests/unit/t547-election-codec.test.ts tests/unit/t548-election-codec.pbt.test.ts` | exit 0、3 files、diagnostic なし |
| `bun run build` | 成功。全 harness の `dist/` と self-install 面を再生成し、tracked source に追加 drift なし |
| stage artifacts の未完了 checkbox / trailing whitespace 検査と `git diff --check` | exit 0。未完了 checkbox 0、trailing whitespace 0、tracked diff の whitespace error 0 |

## 収束対象

- Contract gap: legacy scalar `question` の empty string を拒否しつつ、whitespace-only の後方読み取り互換性を維持する区別。
- Fix: 非 string の `shape` rejection と length 0 の `invalid-value` rejection を分離し、whitespace-only は exact value のまま受理。
- Regression evidence: `""` は `$.question` の `invalid-value`、`"  "` は `legacy-question` の text として不変受理。
- Change isolation: source 1 file、既存 unit test 1 file、宣言済み stage artifacts 3 filesのみ。

## Ownership 補正

- U1: FR-DEF-4 を支える canonical question/choice schema と definition ordering。
- U4: canonical 値から blind distribution view を構成し transport で配送する実装。
- 設計入力は変更していない。

## 未実施面

- full `bun run test:ci`、coverage gates、source-only check、再現性検査、formal verification は後続の Build and Test / U8 ownership であり、本 unit directive では実行していない。
- 外部 repository hosting の review/merge/check 状態は照会していない。

## Blocker

なし。
