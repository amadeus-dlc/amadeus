# 実装ノート

## 実行方針

- B003 は [Issue #286](https://github.com/amadeus-dlc/amadeus/issues/286) を対象にする。
- validator で検出する範囲は、完了済み Construction の `pr.md` 欠落と PRリンク形式に限定する。
- permalink の全件品質確認は、この Bolt では実装しない。

## 対象タスク

| Task | 状態 | 実施内容 | 対象 |
|---|---|---|---|
| T001 | 完了 | 完了済み Construction の `pr.md` 必須検査を追加した。 | `skills/amadeus-validator/validator/stages/construction/bolt-preparation.ts` |
| T002 | 完了 | `pr.md` と `construction/traceability.md` の PRリンク形式検査を追加した。 | `skills/amadeus-validator/validator/AmadeusValidator.ts` |
| T003 | 完了 | validator skill 説明、eval README、昇格先を更新した。 | `skills/amadeus-validator/SKILL.md`、`.agents/skills/amadeus-validator/**` |

## 未確認事項

- なし。

## 検証済み

- `bun run dev-scripts/evals/amadeus-validator/check.ts`
- `bun run dev-scripts/promote-skill.ts amadeus-validator --replace`
- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-reference-link-policy`
- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .`
- `npm run typecheck`
- `npm run test:all`
- `git diff --check`
