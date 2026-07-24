# Component Dependency

> 上流入力（consumes 全数）: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`

## Runtime dependency matrix

`→`は行componentが列componentへ依存することを示す。

| From＼To | C0 Types | C1 Config | C2 Policy | C3 State | C4 Provenance | C5 Gateway | C6 Executor | C7 Coordinator | C8 Presentation |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C0 Types | — |  |  |  |  |  |  |  |  |
| C1 Config | → | — |  |  |  |  |  |  |  |
| C2 Policy | → |  | — |  |  |  |  |  |  |
| C3 State | → |  |  | — |  |  |  |  |  |
| C4 Provenance | → |  |  |  | — |  |  |  |  |
| C5 Gateway | → |  |  |  |  | — |  |  |  |
| C6 Executor | → |  |  | → | → | → | — |  |  |
| C7 Coordinator | → | → | → | → |  |  | → | — | → |
| C8 Presentation | → |  |  |  |  |  |  |  | — |

C0は型だけを所有するleafである。C3とC4、C6とC8の相互type importは存在しない。C9 Distributionはbuild-time projectionなのでruntime matrixへ含めない。

## Dependency direction

```mermaid
flowchart TD
  C1["C1 Config"] --> T["C0 Mirror Types"]
  C2["C2 Policy"] --> T
  C3["C3 State"] --> T
  C4["C4 Provenance"] --> T
  C5["C5 Gateway"] --> T
  C6["C6 Executor"] --> T
  C6 --> C3
  C6 --> C4
  C6 --> C5
  C7["C7 Coordinator"] --> T
  C7 --> C1
  C7 --> C2
  C7 --> C3
  C7 --> C6
  C7 --> C8["C8 Presentation"]
  C8 --> T
```

テキスト表現: 矢印はimport元からimport先を示す。low-level componentはCoordinatorを知らず、ExecutorはTypes／State／Provenance／Gatewayだけに依存する。PolicyはTypes以外をimportしないため循環はない。

## Communication contracts

| Producer | Consumer | Pattern | Contract |
|---|---|---|---|
| Engine | C7 | 同期関数 | typed boundary context |
| C7 | C1 | 同期read | resolved／invalid union |
| C7 | C2 | pure call | decision union |
| C7／C6 | C3 | 同期filesystem | expected-state atomic transition |
| C6 | C4 | pure parse／verify | ownership／candidate union |
| C6 | C5 | sync child process | repository-bound gateway outcome union |
| C7 | C8 | pure render | status／prompt text |
| C5 | GitHub | `gh` argument array | JSON response／exit status |

async event、REST、gRPC、queueは使わない。

## Data flow

### Auto create

```mermaid
sequenceDiagram
  participant C7 as Coordinator
  participant C2 as Policy
  participant C3 as State
  participant C6 as Executor
  participant C4 as Provenance
  participant C5 as GitHub

  C7->>C2: mode=auto, create event
  C2-->>C7: execute
  C7->>C6: execute create
  C6->>C3: prepared receipt
  C6->>C5: readiness
  C6->>C3: attempted receipt
  C6->>C4: render marker from create identity
  C6->>C5: find candidates in explicit repository
  alt fresh and zero candidates
    C6->>C5: create issue with marker
  else one verified candidate
    C6->>C4: verify and adopt
  else zero after attempted or multiple
    C6->>C3: safety-blocked warning
  end
  C6->>C3: provenance and succeeded in one atomic update
```

### Completion chain

```mermaid
flowchart LR
  B["Completion boundary"] --> C{"Issue exists?"}
  C -- "no" --> D["create"]
  C -- "yes" --> S["ownership + landing"]
  D -- "success" --> S
  D -- "skip/fail/block" --> O["complete with Issue open or absent"]
  S -- "pass" --> F["final sync"]
  S -- "fail" --> O
  F -- "success" --> X["close"]
  F -- "skip/fail" --> O
  X --> O
```

## Shared resources

- `amadeus-state.md`: C3だけがMirror fieldのwrite contractを所有する。
- Intent registry: C7／C6がlanding checkのreadに使用し、Mirrorはwriteしない。
- GitHub Issue: C5だけがmutationする。
- Audit: state／orchestrator／mirror toolの既存tool-owned emitterを使用する。
- Config files: C1がread-onlyで解決する。
- Core／dist／self-install: C9だけがpackage／promote pipelineのprojection contractを所有する。

## Circular dependency check

循環は0件である。特に次を禁止する。

- C2 PolicyからC7 Coordinatorを呼ぶ。
- C3 StateからC5 Gatewayを呼ぶ。
- C5 GatewayからC3 Stateを書き込む。
- C6 ExecutorとC8 Presentationが相互importする。
- C3 StateとC4 Provenanceが相互importする。
- C8 Presentationからoperationを実行する。
- `amadeus-mirror-policy.ts`が`amadeus-orchestrate.ts`をimportする。

実装時はtype importを含むdependency testまたは静的import検査でこの方向を固定する。

## Failure containment

| Failure | Contained by | Blast radius |
|---|---|---|
| config invalid | C1→C7 blocked outcome | 当該IntentのMirrorだけ |
| GitHub unavailable | C5→C6 pending | 当該operationだけ、workflow継続 |
| marker mismatch | C4→C6 safety-blocked | 対象Issueへmutationなし |
| state CAS conflict | C3再読込 | 同じeventの再評価だけ |
| renderer fault | C8 fail before mutation | prompt／statusだけ |
| completion close failure | C6 warning | Issueはopen、workflow完了維持 |

## Build-time distribution dependency

```mermaid
flowchart LR
  Core["packages/framework/core"] --> Package["scripts/package.ts"]
  Harness["packages/framework/harness manifests"] --> Package
  Package --> Dist["dist six harnesses"]
  Dist --> Promote["scripts/promote-self.ts"]
  Promote --> Self["self-install trees"]
  Core --> Skill["amadeus-mirror skill"]
  Core --> Docs["Guide and Reference EN/JA"]
```

C9の変更ownerはcore tool／skill、必要な6 harness manifest／emit、package output、promote output、日英docs、distribution testsである。正準6ハーネスはdist directory名で`claude | codex | cursor | kiro | kiro-ide | opencode`とし、表示名はClaude Code、Codex CLI、Cursor、Kiro CLI、Kiro IDE、OpenCodeである。harness固有実装がないC0／C2は全manifestのcore tools globから同じbytesで投影する。
