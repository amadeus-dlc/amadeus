# テスト結果

## 検証結果

| コマンド | 結果 | 要約 |
|---|---|---|
| `bun run dev-scripts/evals/amadeus-validator/check.ts` | pass | `pr.md` 欠落とPR欄の非リンク表記を検出する eval が pass した。 |
| `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` | pass | source skill の validator 変更を `.agents/skills/amadeus-validator` へ反映した。 |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-reference-link-policy` | pass | 対象 Intent の Construction 成果物が pass した。 |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .` | pass | workspace 全体の Amadeus 成果物が pass した。 |
| `npm run typecheck` | pass | TypeScript 型検査が pass した。 |
| `git diff --check` | pass | 差分の空白エラーがない。 |
| `npm run test:all` | pass | CI相当の mock テスト一式が pass した。 |

## 安全性確認

- 破壊的な git 操作は実行していない。
- `.coderabbit.yml` と `.coderabbit.yaml` は変更していない。
- validator の検査対象は Construction 完了状態の PR記録と PRリンク形式に限定した。

## CI確認

- [PR #285](https://github.com/amadeus-dlc/amadeus/pull/285) の `mock` check は SUCCESS である。

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R004 | B003/T001 | `dev-scripts/evals/amadeus-validator/check.ts` | 完了済み Construction の `pr.md` 欠落を validator で検出できる。 |
| R004 | B003/T002 | `dev-scripts/evals/amadeus-validator/check.ts` | PR欄の裸の `PR #nnn` を validator で検出できる。 |
| R004 | B003/T003 | `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | source skill の変更を昇格先へ反映した。 |
