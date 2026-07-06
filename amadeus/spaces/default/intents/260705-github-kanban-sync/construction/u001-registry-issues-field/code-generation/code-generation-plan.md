# Code Generation Plan — u001-registry-issues-field（B001）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/kanban-registry/check.ts` を追加し、`issues` 契約（BR-1 / BR-2）と遡及補完アンカー（本 Intent = #470）を検証する。補完前の registry で失敗することを確認する。
2. GREEN: `intents.json` へ判別可能な 7 entry の `issues` を直接記入する（D-AD10 のワンショット編集）。判別不能 3 entry（260703-aidlc-v2-full-compliance、260703-amadeus-skill-english-rollout-plan、260704-v2-parity-completion）には付与しない（BR-4。audit に複数 Issue 参照が混在し主従を判別できないため）。
3. 結線: `package.json` に `test:it:kanban-registry` を追加し、`test:it:all` の末尾へ連結する（既存 CI 入口に乗せる）。
4. 検証: `npm run test:all` の green を確認する（FR-1.2 の互換確認を含む）。

## 補完の判別根拠

| dirName | issues | 根拠 |
|---|---|---|
| 260703-skill-quality-repair | 340, 405, 252 | Project 文が「#340 を親に、#405、#252 を束ねる」と明記 |
| 260704-engine-namespace | 445 | Project 文冒頭「Issue #445」 |
| 260704-engine-validator-alignme | 455, 446 | Project 文「Issue #455 主、#446 包含」 |
| 260704-grilling-mode-wiring | 442 | Project 文冒頭「Issue #442」 |
| 260704-question-rendering-ux | 448, 449, 450 | Project 文冒頭「Issue #448 + #449 + #450」 |
| 260705-engine-validator-gap | 457, 458 | Project 文「Issue #457 と #458」 |
| 260705-github-kanban-sync | 470 | Project 文冒頭「Issue #470」 |
