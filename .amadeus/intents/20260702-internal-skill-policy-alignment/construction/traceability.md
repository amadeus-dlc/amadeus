# Construction 追跡

## Task Generation からの追跡

| Evidence | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| [tasks.md](bolts/B001-readme-internal-skill-catalog/tasks.md) | B001/T001, B001/T002 | README.md、README.ja.md、construction/decisions/D001-readme-skill-classification.md | [test-results.md](bolts/B001-readme-internal-skill-catalog/test-results.md) | 未作成 | verified |
| [tasks.md](bolts/B002-implicit-invocation-policy/tasks.md) | B002/T001, B002/T002, B002/T003 | skills/amadeus-*/agents/openai.yaml、.agents/skills/amadeus-*/agents/openai.yaml、dev-scripts/promote-skill.ts | [test-results.md](bolts/B002-implicit-invocation-policy/test-results.md) | 未作成 | verified |
| [tasks.md](bolts/B003-follow-up-and-verification/tasks.md) | B003/T001, B003/T002 | construction/decisions/D003-follow-up-scope-separation.md、construction/bolts/*/test-results.md | [test-results.md](bolts/B003-follow-up-and-verification/test-results.md) | 未作成 | verified |

## Construction からの追跡

| ボルト | タスク | 証拠 | 状態 |
|---|---|---|---|
| B001 | B001/T001 | [B001 test-results](bolts/B001-readme-internal-skill-catalog/test-results.md) | verified |
| B001 | B001/T002 | [D001](decisions/D001-readme-skill-classification.md)、[B001 test-results](bolts/B001-readme-internal-skill-catalog/test-results.md) | verified |
| B002 | B002/T001 | [B002 test-results](bolts/B002-implicit-invocation-policy/test-results.md) | verified |
| B002 | B002/T002 | [B002 test-results](bolts/B002-implicit-invocation-policy/test-results.md) | verified |
| B002 | B002/T003 | [B002 notes](bolts/B002-implicit-invocation-policy/notes.md)、[B002 test-results](bolts/B002-implicit-invocation-policy/test-results.md) | verified |
| B003 | B003/T001 | [D003](decisions/D003-follow-up-scope-separation.md)、[B003 test-results](bolts/B003-follow-up-and-verification/test-results.md) | verified |
| B003 | B003/T002 | [B003 test-results](bolts/B003-follow-up-and-verification/test-results.md) | verified |

## Deployment Unit からの追跡

| Deployment Unit | Task | 実装 | 検証 | PR | 状態 |
|---|---|---|---|---|---|
| Amadeus documentation | B001/T001 | README.md、README.ja.md | [B001 test-results](bolts/B001-readme-internal-skill-catalog/test-results.md) | 未作成 | verified |
| Amadeus documentation | B001/T002 | construction/decisions.md | [B001 test-results](bolts/B001-readme-internal-skill-catalog/test-results.md) | 未作成 | verified |
| Amadeus skill metadata | B002/T001 | skills/amadeus-*/agents/openai.yaml | [B002 test-results](bolts/B002-implicit-invocation-policy/test-results.md) | 未作成 | verified |
| Amadeus promotion tooling | B002/T002 | dev-scripts/promote-skill.ts、.agents/skills/amadeus-*/agents/openai.yaml | [B002 test-results](bolts/B002-implicit-invocation-policy/test-results.md) | 未作成 | verified |
| Amadeus skill metadata | B002/T003 | construction/bolts/B002-implicit-invocation-policy/notes.md | [B002 test-results](bolts/B002-implicit-invocation-policy/test-results.md) | 未作成 | verified |
| Amadeus construction artifacts | B003/T001 | construction/decisions.md | [B003 test-results](bolts/B003-follow-up-and-verification/test-results.md) | 未作成 | verified |
| Amadeus construction artifacts | B003/T002 | construction/bolts/*/test-results.md | [B003 test-results](bolts/B003-follow-up-and-verification/test-results.md) | 未作成 | verified |
