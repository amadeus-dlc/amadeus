# Swarm Execution Lifecycle Tech Stack Decisions

## 上流とbrownfield制約

本成果物はU-02の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、CodeKB `technology-stack.md`を消費する。U-02は既存framework coreと`amadeus-swarm.ts`/worktree/Bolt primitiveへ組み込み、新しいservice、database、cloud SDK、常駐daemonを追加しない。

## Decision table

| Concern | Decision | Rationale | Rejected |
|---|---|---|---|
| language/runtime | TypeScript ESM + repository既定Bun | 現行core、`.ts`直接実行、全harness parity | 別言語、Node専用runtime |
| state model | closed discriminated union + immutable canonical value | invalid edge/stateを排除、digest再現 | mutable class graph、stringly state |
| persistence | 既存audit lock、append、atomic file replace | audit-first/reconciliation資産を再利用 | database、remote lock、queue |
| process | Bun/Node標準process・filesystem API、executable/argv分離、identity-first/one-time-arm wrapper | shell injectionとcrash windowを閉じる | shell command、daemon、port |
| merge | 既存`amadeus-bolt`、`amadeus-worktree`、Git primitive | state/audit/runtime/code責務とstrategyを維持 | coordinator内Git再実装 |
| schema | versioned closed JSON、canonical digest | harness conductor境界とredaction | permissive object、dynamic plugin schema |
| tests | `bun:test`、既存runner、fast-check、failure injection | Comprehensive戦略と既存CI統合 | Jest/Vitest、新PBT library |
| quality | 現行TypeScript typecheck、Biome、coverage/complexity ratchet | brownfield gate維持 | 新formatter/linter |
| dependencies | 標準library + existing repository modules、runtime package 0件追加 | supply-chainと配布drift最小化 | cloud SDK、process supervisor package |

## Placement and ownership

- authored lifecycle/coordinator/store/verifier sourceは`packages/framework/core/tools/`に置く。
- harness conductorはversioned JSON envelopeでC-01とC-11を媒介し、両者を直接import/invokeさせない。
- provider raw parser、probe、LaunchSpec/waveはU-03〜U-05のadapter ownerに置き、U-02へ複製しない。
- referee convergence、Bolt/worktree/Git mechanicsは既存toolを拡張し、coordinator内へ複製しない。
- generated harness treesは`scripts/package.ts`から同期し、直接編集しない。

## Security, portability, and operations

child環境はallowlist projection、provider outputはstream normalization、永続値はclosed/redacted schemaとする。macOSは`ps`由来、Linuxは`/proc`由来のprocess start identityをhash化する。Windowsは保証対象外で、liveness不明を成功へ推測しない。

常駐serviceを持たないためdeployment platform、database migration、backup、autoscalingはN/Aである。運用signalは既存CLI exit、checkpoint、audit shardを使い、新しいtelemetry backendを要求しない。

## Decision consequences

file-based audit-first protocolはremote distributed executionを提供しないが、現行local harness/worktree境界でcrash injection、single-writer、再調停を決定的に検証できる。identity/arm/claimの追加状態は単純な直接spawnより複雑だが、上流が要求する二重provider/mergeとfalse success 0件を満たすための必要最小限である。
