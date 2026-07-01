# Construction ノート

## 実行方針

- B003 は後続候補と検証証拠を記録する。
- GitHub Issue は人間承認なしに作成しない。
- PR URL がないため、`pr.md` は作成しない。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | 後続候補を Construction 判断として記録する。 | test-results.md |
| T002 | 完了 | 検証証拠を記録する。 | test-results.md |

## 実装判断

- `skill-forge` 監査は全 `amadeus-*` skill の内容確認と修正判断を含むため、README と metadata 整合から分離する。
- `SKILL.md` 英語化は全 skill 本文を対象にする大きな文書変更であり、metadata 追加と同じ Bolt に混ぜない。
- Discovery 候補 ID の改善は Discovery 成果物契約に関わるため、この Intent の成功条件に混ぜない。

## 検証入口

- 昇格 eval: `bun run dev-scripts/evals/promote-skill/check.ts`
- Amadeus validator: `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-internal-skill-policy-alignment`
- workspace validator: `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .`
- 差分確認: `git diff --check`

## 未確認事項

- 後続候補を GitHub Issue として作成するかは未確認である。
