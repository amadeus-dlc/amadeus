# Construction ノート

## 実行方針

- B002 は source skill の実装後に、text contract と promote-skill で同期検証する。
- 昇格先成果物は手動で同期せず、`dev-scripts/promote-skill.ts` を使う。
- 先に text contract を更新し、未実装の期待が失敗することを確認する。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | text contract を追加し、失敗確認を行った。 | [test-results.md](test-results.md) |
| T002 | 完了 | promote-skill と検証を実行した。 | [test-results.md](test-results.md) |

## 実装判断

- text contract は既存の `dev-scripts/evals/amadeus-templates/check.ts` に追加する。
- 読み取り専用性の実行前後差分検証は今回は追加せず、必要になった場合の後続 Issue 候補として扱う。
- source skill 更新前に text contract が失敗することを確認し、その後に source skill 更新と昇格で GREEN にした。

## 検証入口

- `npm run test:it:amadeus-templates`
- `bun run dev-scripts/promote-skill.ts amadeus-discovery --replace`
- `npm run test:it:promote-skill`
- `npm run typecheck`
- `npm run lint:check`
- `npm run contracts:check`
- `npm run diff:check`
- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-amadeus-discovery-dry-run-mode`

## 未確認事項

- text contract だけで読み取り専用性を十分に検出できない場合、後続 Issue 候補として報告する。
