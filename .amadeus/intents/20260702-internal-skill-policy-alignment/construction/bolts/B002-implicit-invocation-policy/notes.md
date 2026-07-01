# Construction ノート

## 実行方針

- B002 は内部 stage helper と判断補助 skill に Codex metadata を追加する。
- metadata は `skills/amadeus-*/agents/openai.yaml` を更新し、`dev-scripts/promote-skill.ts --replace` で `.agents/skills` へ反映する。
- `policy.allow_implicit_invocation: false` は暗黙起動だけを抑え、明示的な `$skill-name` 起動を維持する。

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | 内部 skill の Codex metadata を追加する。 | test-results.md |
| T002 | 完了 | metadata 昇格ルールを更新する。 | test-results.md |
| T003 | 完了 | Claude Code 側の同等設定を確認する。 | test-results.md |

## 実装判断

- Codex の同等設定は `agents/openai.yaml` の `policy.allow_implicit_invocation` を使う。
- Claude Code 側は、この repository 内の `CLAUDE.md` と `skill-forge` 参照では同等の per-skill metadata 設定を確認できない。
  推測の設定は追加しない。

## 検証入口

- 昇格 eval: `bun run dev-scripts/evals/promote-skill/check.ts`
- metadata 確認: `rg -n "allow_implicit_invocation: false" skills .agents/skills`
- 差分確認: `git diff --check`

## 未確認事項

- Claude Code の将来の metadata 仕様は未確認である。
