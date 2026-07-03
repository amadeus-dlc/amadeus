# Build Test Results：B002 #400 小さい土台 PR

## 実行結果

| コマンド | 結果 | メモ |
|---|---|---|
| `npm run test:it:promote-skill` | pass | promotion flow eval が `promote skill eval: ok` で終了した。 |
| `npm run test:all` | pass | typecheck、lint、contract check、Claude host wiring、integration eval、mock e2e、example validation、diff check が pass した。 |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan` | pass | 対象 Intent の実行時構造条件に不足または矛盾なし。 |

## 補足

最初の `npm run test:all` は、`dev-scripts/evals/amadeus-templates/check.ts` が旧日本語文言を直接検査していたため失敗した。

その後、対象 skill の重要契約を英語化後の同等文言で検査するよう eval を更新し、再実行で pass した。

## 同期確認

| 確認 | 結果 |
|---|---|
| source と promoted copy の `SKILL.md` | 一致 |
| source と promoted copy の `agents/openai.yaml` | 一致 |
