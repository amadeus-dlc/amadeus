# Unit Test手順

## 上流成果物と対象

`code-generation-plan.md`と`code-summary.md`のFR-1／FR-2／FR-4を受け、pure extractor／comparatorをin-processで検証する。

対象は`tests/unit/t416-registry-drift-guard.test.ts`の6ケース:

- happy extractionと順序非依存の集合一致
- dispatch-only verb
- phantom `Valid:` verb
- documentation omission
- empty extraction
- duplicateとraw cardinality mismatch

## 実行方法

```bash
bun test tests/unit/t416-registry-drift-guard.test.ts
```

期待結果は6 pass／0 fail。外部service、network、共有mutable fixtureは使わない。

## 合格基準とカバレッジ

- missing、unexpected、duplicate、empty extraction、cardinality mismatchの各診断を少なくとも1ケースでassertする。
- `covers:` headerからcoverage registryへ正本ファイルが登録されることを`bun tests/gen-coverage-registry.ts --check`で確認する。
- line percentageだけを目標にせず、FR-1／FR-2／FR-4のfail-closed分岐を全種固定する。
