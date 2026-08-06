# Unit Test Instructions: pr-convergence plugin

上流入力(consumes 全数): code-generation-plan、code-summary(各 unit)、unit-of-work-story-map

## unit 層テスト(fs 非依存の純関数)

| テスト | 対象 | 固定する契約 |
|---|---|---|
| `tests/unit/t444-stage-frontmatter-seams.test.ts`(13 tests) | U1 parse/serialize | BR-U1-1(往復 byte-identity)/ BR-U1-2(対象外不変)/ BR-U1-3(roundtrip-mismatch)/ BR-U1-4(unsupported-target-seam 落ちる実証)/ BR-U1-12(SeamListStyle) |
| `tests/unit/t446-pr-convergence-predicate.test.ts`(30 tests) | U2 述語 | BR-U2-1(replied-unresolved 赤 — NFR-2)/ BR-U2-2(4区分+先頭非 bot+bot 不在 humanOnly)/ BR-U2-5(retry シーム 5回)/ 未知 mergeStateStatus throw / severity 写像両方向 |

## 実行手順

`bun test tests/unit/t444-stage-frontmatter-seams.test.ts tests/unit/t446-pr-convergence-predicate.test.ts --timeout=30000`

## 実施記録

TDD 実施記録は各 unit の code-generation-plan.md(Red→Green の実測列)を参照。実測: conductor 統合断面で全 green(174 pass 集計の一部)。
