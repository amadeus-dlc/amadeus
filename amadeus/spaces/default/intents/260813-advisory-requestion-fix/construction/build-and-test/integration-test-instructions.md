# Integration Test Instructions — intent 260813-advisory-requestion-fix

`code-summary.md` が記録した3経路(full/auto-decision・human-turn(gated)・semi)の orchestrator 再入検証。全テストは隔離 project-dir(temp dir)で構成し、実 record・実 audit へ書かない。

## 実行

```bash
# 本 intent の中核統合テスト(落ちる実証済み)
bun test tests/integration/t2967-advisory-handoff-directive.integration.test.ts
bun test tests/integration/t2967-advisory-record-outcome.integration.test.ts

# 既存 advisory 回帰(無退行確認セット)
bun test tests/integration/t458-advisory-auto-resolution.integration.test.ts \
         tests/integration/t526-advisory-handoff-stage.integration.test.ts \
         tests/integration/t528-authoring-hold-end-to-end.integration.test.ts \
         tests/integration/t-advisory-choice-record.test.ts \
         tests/integration/t-advisory-human-choice-boundaries.test.ts
```

## 検証観点

- FR-ADV-1/2: auto-decision の run-now receipt 保存後の次 pass が `await-advisory-choice` を返さず `execute-advisory-handoff`(handoff stage 名を機械可読に運ぶ)を返す
- FR-ADV-7: human-turn provenance の receipt でも同一(モード非依存)
- FR-ADV-6: semi 構成での ladder 裁定 → receipt → handoff directive
- FR-ADV-3/8: fail-closed の human 提示、run-now は hold を解除しない契約、defer-with-risk の `resolved`→`allow` の無変更
