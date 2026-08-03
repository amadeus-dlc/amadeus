# Unit Test Instructions — plugin projection parity

## 上流成果物と対象

`code-generation-plan.md` と `code-summary.md` にあるprojection matrix、決定的projection、promotion ownershipを、実装詳細ではなくFR-1〜FR-7とNFR-1／NFR-4／NFR-5の観測可能な契約として検証する。Bun標準test runnerを使用し、追加frameworkは導入しない。

主対象は `tests/unit/t-plugin-projection.test.ts` と `tests/unit/t356-promote-self-plugin-carveout.test.ts` である。

## 実行方法と合格条件

```bash
bun test --timeout 120000 \
  tests/unit/t-plugin-projection.test.ts \
  tests/unit/t356-promote-self-plugin-carveout.test.ts
```

- 7 package面／5 self-install面、harness directory、stage entry destinationがtable-drivenに一致する。
- 同じ入力から得るprojectionがbyte-identicalで、未選択時の追加projectionが0件である。
- Codex runnerは `.agents/skills` に限定され、Kiro CLI／IDEはpackage-onlyである。
- contributor runnerはplugin stageとして誤分類されず、composition ledgerの `stageIndex.slugs` だけが選択済みplugin stageの正本となる。
- 全test、assertionがpassし、skipや新規warningを合格の代用にしない。

## Test dataとcoverage方針

fixtureは各test内で独立生成し、wall-clock、session ID、clone IDを決定的期待値へ混入させない。Comprehensive戦略でも件数quotaは置かず、全manifest分岐、selection有無、path拒否、重複・衝突を要件・risk単位で網羅する。line coverage値だけではなく、FR／NFR／ACへのtraceを合格根拠とする。
