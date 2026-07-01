# 検証結果

## 検証結果

| 検証 | 結果 | 証拠 |
|---|---|---|
| RED 確認 | 成功 | `npm run test:it:amadeus-templates` が source skill 更新前に `does not include "### \`dry-run\`"` で失敗した。 |
| source skill と昇格先成果物の同期 | 成功 | `bun run dev-scripts/promote-skill.ts amadeus-discovery --replace` が成功した。 |
| text contract | 成功 | `npm run test:it:amadeus-templates` が成功した。 |
| promote-skill eval | 成功 | `npm run test:it:promote-skill` が成功した。 |
| 型検査 | 成功 | `bun install --frozen-lockfile` で依存関係を復元した後、`npm run typecheck` が成功した。 |
| lint | 成功 | `npm run lint:check` が成功した。 |
| 契約検査 | 成功 | `npm run contracts:check` が成功した。 |
| 差分検査 | 成功 | `npm run diff:check` が成功した。 |
| Validator | 成功 | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-amadeus-discovery-dry-run-mode` が成功した。 |
| 一括検証 | 成功 | `npm run test:all` が成功した。 |

## 安全性確認

昇格先成果物は手動編集せず、`promote-skill` で source skill から同期した。
text contract は source skill と昇格先成果物の両方を検証する。

`typecheck` の初回実行は `tsc: command not found` で停止した。
原因は `node_modules` が存在しないことだったため、`bun install --frozen-lockfile` でロックファイルに従って依存関係を復元した。

## CI確認

この作業では PR を作成していないため、リモート CI は未確認である。
ローカル検証で source skill、昇格、型、lint、契約、差分、validator、一括検証を確認した。

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R005 | B002/T001 | `dev-scripts/evals/amadeus-templates/check.ts` | text contract で `dry-run` 契約の不足を検出できる。 |
| R005 | B002/T002 | `.agents/skills/amadeus-discovery/SKILL.md`、この検証結果 | promote-skill で昇格し、標準検証を実行した。 |
