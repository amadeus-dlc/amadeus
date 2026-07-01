# Test Results

## 検証結果

| コマンド | 結果 | 証拠 |
|---|---|---|
| `bun run dev-scripts/evals/promote-skill/check.ts` | pass | `promote skill eval: ok`。 |
| `rg -l "allow_implicit_invocation: false" skills .agents/skills \| sort \| wc -l` | pass | `42`。source skill 21 件と昇格先 skill 21 件を確認した。 |
| `bun - <<'TS' ... metadata hash and policy check ... TS` | pass | source hash、interface、default prompt、policy を確認した。 |
| `uv run python scripts/quick_validate.py <skill> --platform codex --strict-openai-yaml` | blocked | 既存 `SKILL.md` frontmatter description の angle bracket により `amadeus-ideation-traceability-finalization` で停止した。metadata 自体の失敗ではなく、後続の `skill-forge` 監査対象として扱う。 |
| `git diff --check` | pass | 空白エラーなし。 |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 20260702-internal-skill-policy-alignment` | pass | warning なし。 |

## 安全性確認

- metadata は暗黙起動抑制と UI 表示だけを扱い、実行時の外部接続、秘密情報、破壊的操作を追加しない。

## CI確認

- PR 未作成のため GitHub Actions は未実行である。
- ローカルでは昇格 eval、metadata hash and policy check、`git diff --check`、Amadeus validator を実行した。

## 受け入れ証拠

| 要求 | タスク | 証拠 | 要約 |
|---|---|---|---|
| R003 | B002/T001 | [D002](../../decisions/D002-codex-internal-skill-policy.md) | 内部 skill 21 件の source skill と昇格先 skill に英語の `agents/openai.yaml` を配置し、`policy.allow_implicit_invocation: false` を設定した。 |
| R004 | B002/T002 | [test-results.md](test-results.md) | `dev-scripts/promote-skill.ts` が `agents/` を配布対象として扱うことを昇格 eval で確認した。 |
| R004 | B002/T003 | [notes.md](notes.md) | Claude Code 側の同等 per-skill 設定は repository 内参照では確認できず、推測の設定は追加しなかった。 |
