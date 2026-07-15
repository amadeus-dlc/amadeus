# AI-DLC ワークフロー図

> 言語: [English](diagrams.md) | **日本語**

このドキュメントには、AI-DLC(AI-Driven Development Life Cycle)方法論を可視化するすべての Mermaid 図が含まれています。各セクションは簡単な説明と、それに続くレンダリング済みの図で構成されています。これらの図は、エンジンとコンダクター(`amadeus-orchestrate.ts` + `SKILL.md`)、ステージプロトコル(`stage-protocol.md`)、ステージファイル、およびエージェント定義から導出されています。

> **注:** これらの図は、関連するリファレンス各章にもインラインで埋め込まれています。このファイルは、すべての図を一箇所にまとめた統合インデックスとして機能します。以下の図における `<record>/` は、アクティブな intent の record ディレクトリ `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` を指します。
>
> - 図 1 と 7: [Architecture](01-architecture.ja.md)
> - 図 8: [Orchestrator](03-orchestrator.ja.md) -- Session Management セクション
> - 図 9: [Orchestrator](03-orchestrator.ja.md) -- Scope Routing セクション
> - 図 10: [Knowledge System](10-knowledge-system.ja.md)
> - 図 11: [Stage Protocol](04-stage-protocol.ja.md) -- Approval Gates セクション
> - 図 12: [Orchestrator](03-orchestrator.ja.md) -- State Tracking セクション

---

## 1. エンドツーエンドのライフサイクル

AI-DLC 方法論は、作業を 5 つの連続したフェーズに編成します。各フェーズにはその境界に検証ゲートがあり、次のフェーズが開始する前に通過しなければなりません。ライフサイクル全体は 5 フェーズにまたがる 32 ステージに及び、スコープによって実際に実行されるステージが決まります。

```mermaid
graph LR
    subgraph INITIALIZATION["INITIALIZATION (0.1-0.3)"]
        Z1["Workspace Scaffold"]
        Z4["State Init"]
        Z1 -.->|"3 stages"| Z4
    end

    subgraph IDEATION["IDEATION (1.1-1.7)"]
        I1["Intent Capture"]
        I7["Approval & Handoff"]
        I1 -.->|"7 stages"| I7
    end

    subgraph INCEPTION["INCEPTION (2.1-2.8)"]
        N1["Reverse Engineering"]
        N7["Delivery Planning"]
        N1 -.->|"8 stages"| N7
    end

    subgraph CONSTRUCTION["CONSTRUCTION (3.1-3.7)"]
        C1["Functional Design"]
        C7["CI Pipeline"]
        C1 -.->|"3.1-3.5 per Bolt; 3.6-3.7 once after all Bolts"| C7
    end

    subgraph OPERATION["OPERATION (4.1-4.7)"]
        O1["Deployment Pipeline"]
        O7["Feedback & Optimization"]
        O1 -.->|"7 stages"| O7
    end

    Z4 -->|"auto-proceed"| I1
    I7 -->|"Verification Gate 1"| N1
    N7 -->|"Verification Gate 2"| C1
    C7 -->|"Verification Gate 3"| O1
    O7 -.->|"Feedback Loop"| I1

    style INITIALIZATION fill:#f3e5f5,stroke:#9c27b0
    style IDEATION fill:#e8f5e9,stroke:#4caf50
    style INCEPTION fill:#e3f2fd,stroke:#2196f3
    style CONSTRUCTION fill:#fff3e0,stroke:#ff9800
    style OPERATION fill:#fce4ec,stroke:#e91e63
```

---

## 2. Ideation フロー

Ideation フェーズでは、ビジネス上の intent を捕捉し、実現可能性を検証し、スコープを定義し、チームを編成し、ラフなモックアップを作成し、承認のためのイニシアチブブリーフを作成します。ALWAYS とマークされたステージはすべてのスコープで実行されます。CONDITIONAL のステージは特定のスコープではスキップされます(例: poc、bugfix、chore、refactor は Market Research をスキップ)。実線の矢印は ALWAYS のルーティングを、破線の矢印は CONDITIONAL のルーティングを示します。

```mermaid
flowchart TD
    S11["1.1 Intent Capture & Framing\n(amadeus-product-agent)"]
    S12["1.2 Market Research\n(amadeus-product-agent)"]
    S13["1.3 Feasibility & Constraints\n(amadeus-architect-agent)"]
    S14["1.4 Scope Definition\n(amadeus-product-agent)"]
    S15["1.5 Team Formation\n(amadeus-delivery-agent)"]
    S16["1.6 Rough Mockups\n(amadeus-design-agent)"]
    S17["1.7 Approval & Handoff\n(amadeus-delivery-agent)"]
    VG1{{"Verification Gate:\nIdeation --> Inception"}}

    S11 ==>|ALWAYS| S12
    S11 -.->|"skip: poc, bugfix,\nchore, refactor, infra,\nsecurity-patch"| S14
    S12 -.->|CONDITIONAL| S13
    S12 -.->|"skip if no\nfeasibility needed"| S14
    S13 -.->|CONDITIONAL| S14
    S14 ==>|ALWAYS| S15
    S14 -.->|"skip: poc,\nbugfix, chore, refactor"| S17
    S15 -.->|CONDITIONAL| S16
    S15 -.->|"skip if no UI"| S17
    S16 -.->|CONDITIONAL| S17
    S17 ==>|ALWAYS| VG1

    style S11 fill:#c8e6c9,stroke:#388e3c
    style S14 fill:#c8e6c9,stroke:#388e3c
    style S17 fill:#c8e6c9,stroke:#388e3c
    style S12 fill:#fff9c4,stroke:#f9a825
    style S13 fill:#fff9c4,stroke:#f9a825
    style S15 fill:#fff9c4,stroke:#f9a825
    style S16 fill:#fff9c4,stroke:#f9a825
    style VG1 fill:#ef9a9a,stroke:#c62828
```

---

## 3. Inception フロー

Inception フェーズでは、(ブラウンフィールドプロジェクトの場合)コードベースを分析し、チームのプラクティスを発見し、要件を引き出し、ユーザーストーリーとモックアップを作成し、アプリケーションアーキテクチャを設計し、実装単位へ分解し、デリバリーを計画します。ステージ 2.1(Reverse Engineering)はサブエージェントとして実行され、六角形の形状で示されています。これは 2 ステップの RE パターンを使用します。まず developer サブエージェントがコードをスキャンし、次に architect サブエージェントが結果を統合します。

```mermaid
flowchart TD
    S21{{"`**2.1 Reverse Engineering**
    (amadeus-developer-agent + amadeus-architect-agent)
    subagent: two-step`"}}
    S22a["2.2 Practices Discovery\n(amadeus-pipeline-deploy-agent)"]
    S22["2.3 Requirements Analysis\n(amadeus-product-agent)"]
    S23["2.4 User Stories\n(amadeus-product-agent)"]
    S24["2.5 Refined Mockups\n(amadeus-design-agent)"]
    S25["2.6 Application Design\n(amadeus-architect-agent)"]
    S26["2.7 Units Generation\n(amadeus-architect-agent)"]
    S27["2.8 Delivery Planning\n(amadeus-delivery-agent)"]
    VG2{{"Verification Gate:\nInception --> Construction"}}

    BF_CHECK{"Brownfield?\n(from Initialization 0.3)"}
    BF_CHECK -->|Yes| S21
    BF_CHECK -->|"No (greenfield:\nprompt user)"| S22a
    S21 -.->|CONDITIONAL| S22a
    S22a -.->|CONDITIONAL| S22

    subgraph RE_DETAIL["Two-Step RE Pattern"]
        direction LR
        DEV_SCAN["Step 1: Developer\nCode Scan"]
        ARCH_SYNTH["Step 2: Architect\nSynthesis"]
        DEV_SCAN --> ARCH_SYNTH
    end

    S21 -.-> RE_DETAIL

    S22 ==>|ALWAYS| S23
    S22 -.->|"skip if no user-facing\nfeatures"| S25
    S23 -.->|CONDITIONAL| S24
    S23 -.->|"skip if no UI\nor mockups skipped"| S25
    S24 -.->|CONDITIONAL| S25
    S25 -.->|CONDITIONAL| S26
    S25 ==>|ALWAYS| S27
    S26 -.->|CONDITIONAL| S27
    S27 ==>|ALWAYS| VG2

    style S21 fill:#bbdefb,stroke:#1565c0
    style S22 fill:#c8e6c9,stroke:#388e3c
    style S27 fill:#c8e6c9,stroke:#388e3c
    style S22a fill:#fff9c4,stroke:#f9a825
    style S23 fill:#fff9c4,stroke:#f9a825
    style S24 fill:#fff9c4,stroke:#f9a825
    style S25 fill:#fff9c4,stroke:#f9a825
    style S26 fill:#fff9c4,stroke:#f9a825
    style VG2 fill:#ef9a9a,stroke:#c62828
    style RE_DETAIL fill:#e8eaf6,stroke:#3f51b5
```

---

## 4. Construction フロー

Construction フェーズは、`bolt-plan.md` に従って Bolt ごとに実行します。各 Bolt は 1 つ以上の作業単位(Unit of Work)からなる一貫したスライスをカバーし、ステージ 3.1〜3.5 を一度実行します。walking-skeleton の Bolt は常に単一 Bolt バッチとして最初に実行されます。後続の Bolt は、依存グラフが許す限り並列バッチで実行される場合があります。最後の Bolt の後、ステージ 3.6(Build and Test)と 3.7(CI Pipeline)がすべての Bolt にわたって一度実行されます。ステージ 3.5(Code Generation)はサブエージェントとして実行され、六角形の形状で示されています。

```mermaid
flowchart TD
    START(["Begin Construction"])

    subgraph PER_BOLT["Per-Bolt Loop (walking skeleton first; later Bolts may parallelise)"]
        S31["3.1 Functional Design\n(amadeus-architect-agent)\nCONDITIONAL"]
        S32["3.2 NFR Requirements\n(amadeus-architect-agent)\nCONDITIONAL"]
        S33["3.3 NFR Design\n(amadeus-architect-agent)\nCONDITIONAL"]
        S34["3.4 Infrastructure Design\n(amadeus-aws-platform-agent)\nCONDITIONAL"]
        S35{{"3.5 Code Generation\n(amadeus-developer-agent)\nsubagent: amadeus-developer-agent\nALWAYS per unit in Bolt"}}

        S31 -.-> S32
        S32 -.-> S33
        S33 -.-> S34
        S34 -.-> S35
        S31 -.->|"skip if not\nin plan"| S35
    end

    START --> PER_BOLT
    PER_BOLT -->|"More Bolts?"| PER_BOLT
    PER_BOLT -->|"All Bolts done"| S36

    S36["3.6 Build and Test\n(amadeus-quality-agent)\nALWAYS"]
    S37["3.7 CI Pipeline\n(amadeus-pipeline-deploy-agent)\nCONDITIONAL"]
    VG3{{"Verification Gate:\nConstruction --> Operation"}}

    S36 ==> S37
    S36 -.->|"skip CI if\nnot in scope"| VG3
    S37 -.-> VG3

    style PER_BOLT fill:#fff3e0,stroke:#e65100
    style S35 fill:#bbdefb,stroke:#1565c0
    style S31 fill:#fff9c4,stroke:#f9a825
    style S32 fill:#fff9c4,stroke:#f9a825
    style S33 fill:#fff9c4,stroke:#f9a825
    style S34 fill:#fff9c4,stroke:#f9a825
    style S36 fill:#c8e6c9,stroke:#388e3c
    style S37 fill:#fff9c4,stroke:#f9a825
    style VG3 fill:#ef9a9a,stroke:#c62828
```

---

## 5. Operation フロー

Operation フェーズは、デプロイ、環境プロビジョニング、可観測性、インシデント対応、パフォーマンス検証、およびフィードバックをカバーします。7 つのステージはすべて CONDITIONAL です(poc、bugfix、および chore スコープではフェーズ全体がスキップされる場合があります)。すべてのステージはインラインで実行されます。ステージ 4.7 は終端ステージです。承認されると、ワークフローが完了するか、新しい Ideation サイクルを開始できます。

```mermaid
flowchart TD
    S41["4.1 Deployment Pipeline\n(amadeus-pipeline-deploy-agent)"]
    S42["4.2 Environment Provisioning\n(amadeus-aws-platform-agent)"]
    S43["4.3 Deployment Execution\n(amadeus-pipeline-deploy-agent)"]
    S44["4.4 Observability Setup\n(amadeus-operations-agent)"]
    S45["4.5 Incident Response\n(amadeus-operations-agent)"]
    S46["4.6 Performance Validation\n(amadeus-quality-agent)"]
    S47["4.7 Feedback & Optimization\n(amadeus-operations-agent)"]

    S41 -.->|CONDITIONAL| S42
    S42 -.->|CONDITIONAL| S43
    S43 -.->|CONDITIONAL| S44
    S44 -.->|CONDITIONAL| S45
    S45 -.->|CONDITIONAL| S46
    S46 -.->|CONDITIONAL| S47

    S47 -->|"Approve"| DONE(["Workflow Complete"])
    S47 -->|"Start New Cycle"| IDEATION(["Return to Ideation 1.1"])

    style S41 fill:#fce4ec,stroke:#c62828
    style S42 fill:#fce4ec,stroke:#c62828
    style S43 fill:#fce4ec,stroke:#c62828
    style S44 fill:#fce4ec,stroke:#c62828
    style S45 fill:#fce4ec,stroke:#c62828
    style S46 fill:#fce4ec,stroke:#c62828
    style S47 fill:#fce4ec,stroke:#c62828
    style DONE fill:#a5d6a7,stroke:#2e7d32
    style IDEATION fill:#e8f5e9,stroke:#4caf50
```

---

## 6. エージェント協調マップ

AI-DLC システムは 11 のドメインエキスパートエージェントを使用します。コンダクター(SKILL.md)は、エンジンの指示に従って各エージェントの呼び出しを実行します。エージェント同士が直接呼び合うことはありません。エージェント間の情報は、intent の record ディレクトリ(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)に保存された成果物を介して流れます。以下の図は、エージェント間の主要な情報フローを示しており、amadeus-operations-agent から amadeus-product-agent へのフィードバックループで結ばれています。

```mermaid
flowchart TD
    ORCH(["SKILL.md (Conductor)"])

    PA["amadeus-product-agent\n(Product Manager)"]
    DA["amadeus-design-agent\n(UX Designer)"]
    DLA["amadeus-delivery-agent\n(Delivery Manager)"]
    AA["amadeus-architect-agent\n(Solutions Architect)"]
    AWSA["amadeus-aws-platform-agent\n(AWS Platform)"]
    CA["amadeus-compliance-agent\n(Compliance)"]
    DSA["amadeus-devsecops-agent\n(DevSecOps)"]
    DEVA["amadeus-developer-agent\n(Developer)"]
    QA["amadeus-quality-agent\n(QA Engineer)"]
    PDA["amadeus-pipeline-deploy-agent\n(Pipeline/Deploy)"]
    OA["amadeus-operations-agent\n(SRE)"]

    ORCH -->|delegates| PA
    ORCH -->|delegates| DA
    ORCH -->|delegates| DLA
    ORCH -->|delegates| AA
    ORCH -->|delegates| AWSA
    ORCH -->|delegates| CA
    ORCH -->|delegates| DSA
    ORCH -->|delegates| DEVA
    ORCH -->|delegates| QA
    ORCH -->|delegates| PDA
    ORCH -->|delegates| OA

    PA -->|"requirements,\nstories, scope"| AA
    PA -->|"intent, scope"| DA
    PA -->|"prioritized backlog"| DLA
    AA -->|"architecture,\nunit specs"| DEVA
    AA -->|"NFR targets"| QA
    AA -->|"infra requirements"| AWSA
    DA -->|"mockups, UX specs"| DEVA
    DEVA -->|"code scan"| AA
    DEVA -->|"code artifacts"| QA
    QA -->|"test results,\nbug reports"| DEVA
    AWSA -->|"provisioned infra"| PDA
    DSA -->|"security review"| DEVA
    DSA -->|"security tests"| QA
    PDA -->|"deployed services"| OA
    CA -->|"compliance constraints"| AA
    DLA -->|"delivery plan"| DEVA
    OA ==>|"feedback loop:\noperational insights"| PA

    style ORCH fill:#e1bee7,stroke:#7b1fa2
    style PA fill:#c8e6c9,stroke:#388e3c
    style OA fill:#fce4ec,stroke:#c62828
    style DEVA fill:#fff3e0,stroke:#e65100
    style AA fill:#bbdefb,stroke:#1565c0
```

---

## 7. 実行モデル

この実装では、ステージに 3 つの実行モードを使用します。**Inline** ステージは、オーケストレーターの会話内で直接実行されます(ユーザーが対話可能)。**Subagent(simple)** ステージは、Claude Code の Task ツールを介して単一のエージェントに委譲します。**Subagent(two-step RE)** は、2 つのエージェントに順次委譲する Reverse Engineering 専用の特殊なパターンです。

```mermaid
flowchart LR
    subgraph INLINE["Mode 1: Inline"]
        direction TB
        IN1["Orchestrator reads\nstage file"]
        IN2["Load agent persona\n+ knowledge"]
        IN3["Execute stage steps\ndirectly in conversation"]
        IN4["User interaction\navailable"]
        IN5["Approval gate\n(AskUserQuestion)"]
        IN1 --> IN2 --> IN3 --> IN4 --> IN5
    end

    subgraph SUBAGENT["Mode 2: Subagent (simple)"]
        direction TB
        SA1["Orchestrator reads\nstage file"]
        SA2["Prepare context:\nartifacts + persona"]
        SA3["Task tool call\n(subagent_type specified)"]
        SA4["Subagent executes\n(no user interaction)"]
        SA5["Return structured\nsummary to orchestrator"]
        SA6["Orchestrator presents\ncompletion + approval"]
        SA1 --> SA2 --> SA3 --> SA4 --> SA5 --> SA6
    end

    subgraph TWOSTEP["Mode 3: Subagent (two-step RE)"]
        direction TB
        TS1["Orchestrator reads\nRE stage file"]
        TS2["Task: amadeus-developer-agent\ncode scan"]
        TS3["Developer returns\nscan results"]
        TS4["Task: amadeus-architect-agent\nsynthesis"]
        TS5["Architect produces\n9 artifacts"]
        TS6["Orchestrator presents\ncompletion + approval"]
        TS1 --> TS2 --> TS3 --> TS4 --> TS5 --> TS6
    end

    style INLINE fill:#e8f5e9,stroke:#4caf50
    style SUBAGENT fill:#e3f2fd,stroke:#2196f3
    style TWOSTEP fill:#fff3e0,stroke:#ff9800
```

---

## 8. セッション再開フロー

ユーザーが `/amadeus` を実行すると、オーケストレーターはアクティブな intent の `amadeus-state.md` を確認します。見つかった場合は 4 つの再開オプションを提示します。見つからない場合は最初の intent を誕生させます。オーケストレーターはまた、コンテキストのコンパクションによる状態の破損の可能性を検出するために `.amadeus-recovery.md` も確認します。

```mermaid
flowchart TD
    START(["/amadeus invoked"])
    ARG_CHECK{"Arguments\nprovided?"}
    STATUS_CHECK{"Argument =\n--status?"}
    STATE_EXISTS{"Active intent\nexists?"}
    RECOVERY_CHECK{".amadeus-recovery.md\nexists?"}
    CORRUPTION{"State matches\nrecovery file?"}
    WARN["Warn user about\npossible corruption"]

    RESUME_MENU["AskUserQuestion:\nResume Options"]
    OPT_RESUME["Resume from\nlast checkpoint"]
    OPT_REDO["Redo\ncurrent stage"]
    OPT_JUMP["Jump to\nspecific stage"]
    OPT_FRESH["Start fresh\n(archive existing)"]

    STATUS_DISPLAY["Display read-only\nstatus summary"]
    SCOPE_DETECT{"Known scope\nor freeform text?"}
    KNOWN_SCOPE["Use explicit scope"]
    FREEFORM["Auto-detect scope\nfrom keywords"]
    CONFIRM_SCOPE["Confirm scope\nwith user"]
    BIRTH["Birth the intent:\nmint record dir,\nstate + audit, begin\nfirst stage"]

    START --> ARG_CHECK
    ARG_CHECK -->|Yes| STATUS_CHECK
    ARG_CHECK -->|No| STATE_EXISTS

    STATUS_CHECK -->|Yes| STATUS_DISPLAY
    STATUS_CHECK -->|No| STATE_EXISTS

    STATE_EXISTS -->|Yes| RECOVERY_CHECK
    STATE_EXISTS -->|No| SCOPE_DETECT

    RECOVERY_CHECK -->|Yes| CORRUPTION
    RECOVERY_CHECK -->|No| RESUME_MENU
    CORRUPTION -->|Mismatch| WARN --> RESUME_MENU
    CORRUPTION -->|Match| RESUME_MENU

    RESUME_MENU --> OPT_RESUME
    RESUME_MENU --> OPT_REDO
    RESUME_MENU --> OPT_JUMP
    RESUME_MENU --> OPT_FRESH

    OPT_FRESH -->|"archive + confirm"| BIRTH

    SCOPE_DETECT -->|"Known scope"| KNOWN_SCOPE --> CONFIRM_SCOPE
    SCOPE_DETECT -->|"Freeform text"| FREEFORM --> CONFIRM_SCOPE
    CONFIRM_SCOPE --> BIRTH

    style START fill:#e1bee7,stroke:#7b1fa2
    style RESUME_MENU fill:#bbdefb,stroke:#1565c0
    style BIRTH fill:#c8e6c9,stroke:#388e3c
    style WARN fill:#ffcdd2,stroke:#c62828
```

---

## 9. スコープルーティング

> スコープルーティングテーブル: [Orchestrator Reference -- Scope Mapping](03-orchestrator.ja.md#scope-to-stage-mapping) を参照。

---

## 10. 知識の読み込み順序

各ステージは、厳密な 6 ステップの順序で知識を読み込みます。これにより、ガードレールが最優先され、続いて共有方法論、次にエージェント固有の知識、次にチームのカスタマイズ、最後に前段ステージの成果物が読み込まれます。以下のシーケンス図は、任意のステージ起動時の読み込み順序を示しています。

> **注:** ステップ 1〜5 はエージェント知識の読み込み(各エージェントファイルで定義)です。ステップ 6(前段ステージの成果物)は、ファイル読み込みステップではなく、実行時にオーケストレーターが追加するコンテキストです。

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant G as Rules
    participant SM as Shared Methodology
    participant AM as Agent Methodology
    participant TK as Team Knowledge
    participant TAK as Team Agent Knowledge
    participant PA as Prior Artifacts

    O->>G: Step 1: Load amadeus/spaces/<space>/memory/
    Note over G: org.md + team.md + project.md + phases/<phase>.md
    G-->>O: Rules loaded (strict-additive — all layers present)

    O->>SM: Step 2: Load .claude/knowledge/amadeus-shared/
    Note over SM: Shared methodology principles
    SM-->>O: Shared knowledge loaded

    O->>AM: Step 3: Load .claude/knowledge/[agent-name]/
    Note over AM: Agent-specific methodology
    AM-->>O: Agent methodology loaded

    O->>TK: Step 4: Load amadeus/knowledge/amadeus-shared/
    Note over TK: Team shared knowledge (if exists)
    TK-->>O: Team knowledge loaded

    O->>TAK: Step 5: Load amadeus/knowledge/[agent-name]/
    Note over TAK: Team agent-specific knowledge (if exists)
    TAK-->>O: Team agent knowledge loaded

    O->>PA: Step 6: Load prior stage artifacts
    Note over PA: As required by current stage inputs
    PA-->>O: Prior artifacts loaded

    Note over O: Stage execution begins with full context
```

---

## 11. 承認ゲートフロー

すべてのステージ(3 つの Initialization ステージを除く)は承認ゲートで終わります。オーケストレーターは、ユーザーにオプションを提示する前に監査証跡にオプションを記録し、その後ユーザーの応答を記録します。3 回の修正サイクルの後、「Accept as-is(現状のまま受け入れる)」というエスケープハッチが利用可能になります。Ideation および Inception のステージには、以前スキップしたステージを追加する条件付きの第 3 オプションが含まれる場合もあります。

```mermaid
flowchart TD
    COMPLETE["Stage work complete"]
    AUDIT_PRE["Append to audit.md:\nstage summary + options\n(fresh ISO timestamp)"]
    ASK["AskUserQuestion:\nApproval Gate"]

    APPROVE["Approve"]
    CHANGES["Request Changes"]
    ACCEPT["Accept as-is\n(escape hatch)"]
    ADD_STAGE["Add Skipped Stage\n(Ideation/Inception only)"]

    AUDIT_POST_A["Log: User approved\n(fresh timestamp)"]
    AUDIT_POST_C["Log: User requested changes\n(fresh timestamp)"]
    AUDIT_POST_ACC["Log: User accepted as-is\n(fresh timestamp)"]
    AUDIT_POST_ADD["Log: User added stage\n(fresh timestamp)"]

    REVISION_COUNT{"Revision\ncycle >= 3?"}
    NOTE_2ND["After 2nd revision:\nnote that escape hatch\nactivates next cycle"]

    UPDATE_STATE["Update amadeus-state.md:\nmark stage as completed"]
    PROGRESS["Display progress line:\nN/total overall"]
    NEXT_STAGE["Proceed to next stage"]

    REVISE["Apply user feedback\nto stage artifacts"]
    RE_PRESENT["Re-present completion\nmessage"]

    ADD_EXEC["Insert skipped stage\ninto workflow"]

    COMPLETE --> AUDIT_PRE --> ASK
    ASK --> APPROVE
    ASK --> CHANGES
    ASK --> ACCEPT
    ASK --> ADD_STAGE

    APPROVE --> AUDIT_POST_A --> UPDATE_STATE --> PROGRESS --> NEXT_STAGE
    ACCEPT --> AUDIT_POST_ACC --> UPDATE_STATE

    CHANGES --> AUDIT_POST_C --> REVISION_COUNT
    REVISION_COUNT -->|"< 3"| NOTE_2ND --> REVISE --> RE_PRESENT --> AUDIT_PRE
    REVISION_COUNT -->|">= 3"| REVISE

    ADD_STAGE --> AUDIT_POST_ADD --> ADD_EXEC

    style COMPLETE fill:#e8f5e9,stroke:#388e3c
    style ASK fill:#bbdefb,stroke:#1565c0
    style APPROVE fill:#a5d6a7,stroke:#2e7d32
    style CHANGES fill:#fff9c4,stroke:#f9a825
    style ACCEPT fill:#ffccbc,stroke:#bf360c
    style ADD_STAGE fill:#e1bee7,stroke:#7b1fa2
    style NEXT_STAGE fill:#c8e6c9,stroke:#388e3c
```

---

## 12. 状態トラッキング

`amadeus-state.md` ファイルは、チェックボックス記法で各ステージを追跡します: `[ ]`(未開始)、`[-]`(進行中)、`[x]`(完了)。ステージは常に中間の `[-]` 状態を経由して遷移します。`[ ]` から直接 `[x]` にジャンプすることはありません。この図はまた、skip、redo、jump 操作のサイドフローも示しています。

```mermaid
stateDiagram-v2
    [*] --> NotStarted

    state "[ ] Not Started" as NotStarted
    state "[-] In Progress" as InProgress
    state "[x] Completed" as Completed
    state "Skipped" as Skipped

    NotStarted --> InProgress : Stage begins\n(mark [-] in state file)
    InProgress --> Completed : User approves\n(mark [x] in state file)
    InProgress --> InProgress : Request Changes\n(revision loop)

    NotStarted --> Skipped : Not in scope\nor execution plan

    note right of Skipped
        Task created but immediately
        marked completed with skip reason.
        Description: "Skipped: [reason]"
    end note
```

```mermaid
flowchart TD
    subgraph NORMAL["Normal Flow"]
        direction LR
        NS1["[ ] Not Started"]
        IP1["[-] In Progress"]
        CO1["[x] Completed"]
        NS1 -->|"stage begins"| IP1
        IP1 -->|"user approves"| CO1
    end

    subgraph SKIP["Skip Flow"]
        direction LR
        NS2["[ ] Not Started"]
        SK2["[x] Completed\n(Skipped: reason)"]
        NS2 -->|"not in scope"| SK2
    end

    subgraph REDO["Redo Flow"]
        direction LR
        CO3["[x] Completed\nor [-] In Progress"]
        NS3["[ ] Not Started"]
        IP3["[-] In Progress"]
        CO3 -->|"user requests redo\n(delete artifacts)"| NS3
        NS3 -->|"re-execute stage"| IP3
    end

    subgraph JUMP["Jump Flow"]
        direction LR
        IP4["[-] In Progress\n(stage A)"]
        NS4["[ ] Not Started\n(stage B)"]
        IP4B["[-] In Progress\n(stage B)"]
        IP4 -->|"user requests jump\n(warn about skipped stages)"| NS4
        NS4 -->|"begin target stage"| IP4B
    end

    style NORMAL fill:#e8f5e9,stroke:#4caf50
    style SKIP fill:#fff9c4,stroke:#f9a825
    style REDO fill:#e3f2fd,stroke:#2196f3
    style JUMP fill:#fce4ec,stroke:#e91e63
```

---

## ステージ別実行モードのまとめ

このリファレンステーブルは、素早く参照できるように、すべてのステージをその実行モードとリードエージェントに対応付けています。

| Stage | Name | Mode | Lead Agent |
|-------|------|------|------------|
| 0.1 | Workspace Scaffold | inline (auto-proceed) | orchestrator |
| 0.2 | Workspace Detection | inline (auto-proceed, deterministic scanner) | orchestrator |
| 0.3 | State Init | inline (auto-proceed) | orchestrator |
| 1.1 | Intent Capture | inline | amadeus-product-agent |
| 1.2 | Market Research | inline | amadeus-product-agent |
| 1.3 | Feasibility | inline | amadeus-architect-agent |
| 1.4 | Scope Definition | inline | amadeus-product-agent |
| 1.5 | Team Formation | inline | amadeus-delivery-agent |
| 1.6 | Rough Mockups | inline | amadeus-design-agent |
| 1.7 | Approval & Handoff | inline | amadeus-delivery-agent |
| 2.1 | Reverse Engineering | subagent (two-step) | amadeus-developer-agent + amadeus-architect-agent |
| 2.2 | Practices Discovery | inline | amadeus-pipeline-deploy-agent |
| 2.3 | Requirements Analysis | inline | amadeus-product-agent |
| 2.4 | User Stories | inline | amadeus-product-agent |
| 2.5 | Refined Mockups | inline | amadeus-design-agent |
| 2.6 | Application Design | inline | amadeus-architect-agent |
| 2.7 | Units Generation | inline | amadeus-architect-agent |
| 2.8 | Delivery Planning | inline | amadeus-delivery-agent |
| 3.1 | Functional Design | inline | amadeus-architect-agent |
| 3.2 | NFR Requirements | inline | amadeus-architect-agent |
| 3.3 | NFR Design | inline | amadeus-architect-agent |
| 3.4 | Infrastructure Design | inline | amadeus-aws-platform-agent |
| 3.5 | Code Generation | subagent (amadeus-developer-agent) | amadeus-developer-agent |
| 3.6 | Build and Test | inline | amadeus-quality-agent |
| 3.7 | CI Pipeline | inline | amadeus-pipeline-deploy-agent |
| 4.1 | Deployment Pipeline | inline | amadeus-pipeline-deploy-agent |
| 4.2 | Environment Provisioning | inline | amadeus-aws-platform-agent |
| 4.3 | Deployment Execution | inline | amadeus-pipeline-deploy-agent |
| 4.4 | Observability Setup | inline | amadeus-operations-agent |
| 4.5 | Incident Response | inline | amadeus-operations-agent |
| 4.6 | Performance Validation | inline | amadeus-quality-agent |
| 4.7 | Feedback & Optimization | inline | amadeus-operations-agent |
