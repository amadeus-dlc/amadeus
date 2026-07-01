# D002: Codex internal skill policy

## 状態

active

## 文脈

`skill-forge` の Codex metadata 参照では、`agents/openai.yaml` の `policy.allow_implicit_invocation` を `false` にすると、明示的な `$skill-name` 起動を維持したまま暗黙起動を抑えられる。
内部 skill は Amadeus workflow または明示起動で使う補助能力であり、通常の自然言語要求から直接選ばれない方がよい。

## 判断

内部 skill の source skill に英語の `agents/openai.yaml` を追加し、`policy.allow_implicit_invocation: false` を設定する。
昇格先 skill は `dev-scripts/promote-skill.ts --replace` で反映する。

## 根拠

- [.agents/skills/skill-forge/references/openai_yaml.md](../../../../.agents/skills/skill-forge/references/openai_yaml.md)
- [business-logic-model.md](../U001-internal-skill-policy-alignment/functional-design/business-logic-model.md)
- [B002 tasks](../bolts/B002-implicit-invocation-policy/tasks.md)

## 影響

- Codex は対象内部 skill を暗黙起動しない。
- 明示的な `$skill-name` 起動は維持される。
- `agents/` は昇格スクリプトの配布対象になる。
