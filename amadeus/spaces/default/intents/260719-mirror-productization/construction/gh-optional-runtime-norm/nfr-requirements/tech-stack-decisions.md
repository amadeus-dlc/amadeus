# Tech Stack Decisions — gh-optional-runtime-norm

> 上流: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Norm storage | `amadeus/spaces/default/memory/project.md` | 既存project rule正本 |
| Identity | CID `practices-discovery:gh-scripts-boundary` | 重複せず同位置改定 |
| Runtime | external `gh` optional binary | npm bundle/credential所有を回避 |
| Process invocation | Bun argument array | macOS/Linux/Windows、shell injection回避 |
| Review evidence | Amadeus reviewer/audit + Git merge evidence | lifecycleを機械追跡 |

## Rejected

新規credential library、GitHub SDK、daemon、database、包括的external CLI許可は導入しない。U1はapplication codeを所有しない。
