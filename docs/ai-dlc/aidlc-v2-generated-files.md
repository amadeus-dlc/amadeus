# AI-DLC v2 生成ファイル完全一覧

出典(一次情報): `awslabs/aidlc-workflows` v2ブランチ(commit 9b77786, 2026-07時点)
- 公式リファレンス: `docs/guide/14-artifacts-reference.md`(ディレクトリツリー・git方針)
- ワークスペース構造: `docs/guide/03-spaces-and-intents.md`
- 正確なファイル名: `core/amadeus-common/stages/*/*.md` 全31ステージのfrontmatter `outputs:` から抽出

---

## 1. ワークスペースレベル(intent横断・スペース単位)

```
aidlc/
├── active-space                    # アクティブスペースのカーソル(gitignore, per-user)
├── .migrated                       # v1平置きレイアウトからの移行済みマーカー
├── .amadeus-clone-id                 # このクローンの監査シャード名(gitignore, machine-local)
├── .amadeus-sessions/                # 会話→intentマップ(gitignore)
└── spaces/<space>/
    ├── memory/                     # ルール層(コミット)
    │   ├── org.md                  #   フレームワーク既定
    │   ├── team.md                 #   チーム実践(orgを上書き)
    │   ├── project.md              #   プロジェクト固有(teamを上書き)
    │   ├── phases/                 #   フェーズ別ルール(ideation/inception/construction/operation)
    │   └── templates/              #   成果物フォーマット上書き(1アーティファクト1ファイル)
    ├── knowledge/                  # チーム知識(コミット、bootstrap時は空・自由形式)
    │   ├── amadeus-shared/           #   全エージェントがロード(規約)
    │   └── aidlc-<agent>-agent/    #   該当エージェント起動時にロード(規約)
    ├── codekb/<repo>/              # コード知識ベース(コミット、リポジトリごと、2.1が生成)
    │   ├── business-overview.md
    │   ├── architecture.md
    │   ├── code-structure.md
    │   ├── api-documentation.md
    │   ├── component-inventory.md
    │   ├── technology-stack.md
    │   ├── dependencies.md
    │   ├── code-quality-assessment.md
    │   └── reverse-engineering-timestamp.md   # 鮮度マーカー(staleなら再実行)
    └── intents/
        ├── active-intent           # アクティブintentのカーソル(gitignore, per-user)
        ├── intents.json            # レジストリ {uuid, slug, dirName, scope, repos, status}
        └── <YYMMDD>-<label>/       # ↓ intentごとのrecord dir(§2)
```

---

## 2. Intentレコードディレクトリ(1 intent = 1ライフサイクル実行)

`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` 配下。

### 2.0 ルート

| ファイル | 説明 | git |
|---|---|---|
| `amadeus-state.md` | ワークフロー状態(6状態チェックボックス) | コミット |
| `audit/<host>-<clone>.md` | 監査証跡(クローンごとの追記専用シャード、68イベント分類) | コミット |
| `verification/phase-check-<phase>.md` | フェーズ境界検証(3ファイル: ideation/inception/construction。stage 定義が作成を指示するのはこの3 phaseだけで、initialization と operation にはない。2026-07 の実機確認で訂正) | コミット |
| `.amadeus-recovery.md` | リカバリ用ブレッドクラム | gitignore |
| `runtime-graph.json` | 実行テレメトリ(監査シャードから再導出可能) | gitignore |
| `.amadeus-sensors/`, `.amadeus-hooks-health/` | センサー所見・ハートビート | gitignore |
| `archive/{ISO-date}-{stage-name}/` | redo時の旧成果物退避(オンデマンド生成) | コミット |

### 2.1 全ステージ共通の随伴ファイル

- `<phase>/<stage>/memory.md` — ステージ観察日誌(自動生成・オーケストレーター維持・手編集禁止。承認ゲートのLearnings Ritualが読み、採用分がmemory層ルールへ昇格)
- `<phase>/<stage>/<stage-name>-questions.md` — ユーザー入力を取るステージの質問ファイル(A-E+X選択肢、`[Answer]:` タグ。真実源)

### 2.2 Initialization(0.1–0.3)

| ステージ | 出力 |
|---|---|
| 0.1 workspace-scaffold | `scaffold-report.md`(+record dirツリーとknowledge/の骨組み生成) |
| 0.2 workspace-detection | `workspace-findings.md`(greenfield/brownfield分類、技術スタック検出) |
| 0.3 state-init | `state-init-summary.md`、`amadeus-state.md` 本体の初期化 |

### 2.3 Ideation(1.1–1.7)

| ステージ | 出力 | 条件 |
|---|---|---|
| 1.1 intent-capture | `intent-statement.md`, `stakeholder-map.md` | 常時 |
| 1.2 market-research | `competitive-analysis.md`, `market-trends.md`, `build-vs-buy.md` | 条件付き |
| 1.3 feasibility | `feasibility-assessment.md`, `constraint-register.md`, `raid-log.md` | 条件付き |
| 1.4 scope-definition | `scope-document.md`, `intent-backlog.md` | 常時 |
| 1.5 team-formation | `team-assessment.md`, `skill-matrix.md`, `mob-composition.md` | 条件付き |
| 1.6 rough-mockups | `wireframes.md`, `user-flow.md` | 条件付き |
| 1.7 approval-handoff | `initiative-brief.md`, `decision-log.md` | 常時 |

### 2.4 Inception(2.1–2.8)

| ステージ | 出力 | 条件 |
|---|---|---|
| 2.1 reverse-engineering | codekbへ9ファイル(§1参照。record dirではなくスペースレベル) | brownfieldのみ |
| 2.2 practices-discovery | `team-practices.md`, `discovered-rules.md`, `evidence.md`, `practices-discovery-timestamp.md`(承認後 memory/team.md・project.md へ昇格) | 条件付き |
| 2.3 requirements-analysis | `requirements.md` | 常時 |
| 2.4 user-stories | `stories.md`, `personas.md`, `user-stories-assessment.md` | ユーザー向け機能あり |
| 2.5 refined-mockups | `mockups.md`, `interaction-spec.md`, `design-system-mapping.md`, `accessibility-checklist.md` | UIプロジェクト |
| 2.6 application-design | `components.md`, `component-methods.md`, `services.md`, `component-dependency.md`, `decisions.md` | 新コンポーネント必要時 |
| 2.7 units-generation | `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md` | 常時 |
| 2.8 delivery-planning | `bolt-plan.md`, `team-allocation.md`, `risk-and-sequencing-rationale.md`, `external-dependency-map.md` | 常時 |

### 2.5 Construction(3.1–3.7)

3.1–3.5は**Unit of Workごとに繰り返し**、`construction/{unit-name}/{stage-name}/` に出力。3.6–3.7は全Unit完了後に1回。

| ステージ | 出力 | 条件 |
|---|---|---|
| 3.1 functional-design | `business-logic-model.md`, `business-rules.md`, `domain-entities.md`, (条件付き) `frontend-components.md` | 計画次第・per unit |
| 3.2 nfr-requirements | `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md` | 計画次第・per unit |
| 3.3 nfr-design | `performance-design.md`, `security-design.md`, `scalability-design.md`, `reliability-design.md`, `logical-components.md` | 計画次第・per unit |
| 3.4 infrastructure-design | `deployment-architecture.md`, `infrastructure-services.md`, `monitoring-design.md`, `cicd-pipeline.md`, (条件付き) `shared-infrastructure.md` | 計画次第・per unit |
| 3.5 code-generation | `code-generation-plan.md`(チェックボックス+story追跡), `code-summary.md`(コード本体はrecord dirではなくコードリポジトリへ) | 常時・per unit |
| 3.6 build-and-test | `build-instructions.md`, `unit-test-instructions.md`, `integration-test-instructions.md`, `performance-test-instructions.md`, `security-test-instructions.md`, `build-and-test-summary.md`, `test-results.md` | 常時・全Unit後 |
| 3.7 ci-pipeline | `ci-config.md`, `quality-gates.md` | 条件付き・全Unit後 |

### 2.6 Operation(4.1–4.7、すべて条件付き)

| ステージ | 出力 |
|---|---|
| 4.1 deployment-pipeline | `cd-config.md`, `deployment-strategy.md`, `rollback-runbook.md` |
| 4.2 environment-provisioning | `environment-inventory.md`, `validation-report.md` |
| 4.3 deployment-execution | `deployment-log.md`, `smoke-test-results.md`, `health-check-report.md` |
| 4.4 observability-setup | `dashboards.md`, `alarms.md`, `slo-config.md`, `log-queries.md`, `tracing-config.md`, `anomaly-config.md` |
| 4.5 incident-response | `runbooks.md`, `incident-plan.md`, `escalation-matrix.md` |
| 4.6 performance-validation | `load-test-plan.md`, `test-results.md`, `nfr-validation-matrix.md` |
| 4.7 feedback-optimization | `slo-report.md`, `cost-analysis.md`, `drift-report.md`, `feedback-loop.md` |

---

## 3. コミット / gitignore の分割(公式方針)

| コミット | gitignore |
|---|---|
| `amadeus-state.md` | `aidlc/active-space`, `intents/active-intent`(per-userカーソル) |
| `audit/*.md`(per-cloneシャード) | `.amadeus-recovery.md` 等の `intents/*/.amadeus-*`(一時ブレッドクラム) |
| 全ステージ成果物 | `runtime-graph.json`(監査シャードから再導出可能) |
| `verification/` フェーズ検証結果 | `aidlc/.amadeus-clone-id`(machine-local) |
| スペースレベル `knowledge/` | `aidlc/.amadeus-sessions/` |
| ステージごと `memory.md` 日誌、スペース `memory/` 層 | `.amadeus-hooks-health/`, `.amadeus-sensors/` |

---

## 4. 補足

- **コードはrecord dirに入らない**。`aidlc/` は method / state / audit / artifacts のみで、生成コードはワークスペースのコードリポジトリ(単一repoならプロジェクト直下、マルチrepoなら兄弟ディレクトリ)へ。intentが触るrepoは誕生時に `intents.json` の `repos` 行に記録。
- ライフサイクル: 生成 → 承認ゲートでレビュー → コミット → 下流ステージが消費 → フェーズ境界で検証(traceabilityチェック)。
- センサー失敗の詳細は `<record>/.amadeus-sensors/<stage-slug>/<sensor>-<iso>.md` に出力される(gitignore)。
