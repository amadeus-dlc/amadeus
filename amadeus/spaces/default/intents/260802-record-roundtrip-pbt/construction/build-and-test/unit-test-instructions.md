# Unit Test Instructions — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): code-generation-plan.md(全6 unit — 各 Bolt の実装方針・TDD・検証計画)、code-summary.md(全6 unit — 着地 PR・実装内容・テスト・実測ゲート・逸脱裁定)

## 対象

code-summary.md が記録する着地済み unit 層テスト:

| ファイル | 由来 unit | 内容 |
|---|---|---|
| `tests/unit/t416-election-model-roundtrip.pbt.test.ts` | election-readpath | P-EL1 round-trip(`Election.parse ∘ JSON round-trip = id`) |
| `tests/unit/t418-state-receipts-codec.pbt.test.ts` | state-pbt | P-ST1 正規化後同値 round-trip + P-ST2 5棄却分岐の否定側 |
| `tests/unit/t419-state-field-codec.pbt.test.ts` | state-pbt | P-ST3 条件付き round-trip + P-ST4 |
| `tests/unit/t274-amadeus-mirror-state-codec.test.ts`(追記) | mirror-property | P-MR1 `render ∘ parse ∘ render = render` |
| `tests/unit/t420-unchecked-cast-guard.test.ts` | cast-guard | AST 述語・台帳 parse の純関数層 |

生成器は `tests/helpers/arbitraries/` の election.ts / state-receipts.ts / state-field.ts / mirror-snapshot.ts。

## 実行

```bash
bun test tests/unit/t416-election-model-roundtrip.pbt.test.ts \
         tests/unit/t418-state-receipts-codec.pbt.test.ts \
         tests/unit/t419-state-field-codec.pbt.test.ts \
         tests/unit/t274-amadeus-mirror-state-codec.test.ts \
         tests/unit/t420-unchecked-cast-guard.test.ts
```

## PBT 規約(4項、全ファイル充足)

code-generation-plan.md の各 unit が定めるとおり: **PBT_SEED 固定**(t416=0x19_80e1 / t418=0x19_80e3 / t419=0x19_80e4 / mirror=0x27_4d17、いずれも採番前 grep で非重複を実測)・**numRuns 既定 100**・**`AMADEUS_PBT_DEEP=1` 階層で 50,000**・**失敗 seed は fast-check の既定出力でログ化**。

## オラクル相殺の回避

round-trip はメタモルフィックで独立オラクルを持たない。fail-closed 側は**棄却規則をテスト側で再実装せず**、生成器は非適合入力の生成に徹して判定は被検バリデータ自身に委ねる(cid:build-and-test:pbt-oracle-cancellation)。code-summary.md の各 unit でレビュアーが実読確認済み。
