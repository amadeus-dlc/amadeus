# エージェントシステム

この章ではエージェントアーキテクチャを解説します。エージェントがどのように構造化・設定され、フレームワークによってロードされるか、そしてエージェントの追加や変更の方法を扱います。

ユーザー向けのエージェント説明については、[ユーザーガイド -- エージェント](../guide/06-agents.md)を参照してください。

---

## エージェントの構造

各エージェントは `.claude/agents/` 配下のフラットな `.md` ファイルで、YAMLフロントマターに続いてMarkdown本文が並びます。コンダクターはこれらのファイルを読み込み、インラインでのステージ実行時に自身の視点を形成したり、サブエージェント委譲のためのコンテキストを構築したりします。

### フロントマター契約

すべてのエージェントファイルには次のYAMLフロントマターを含める必要があります。

```yaml
---
name: amadeus-architect-agent               # Agent identifier (matches filename without .md)
description: >                      # Brief role summary (shown in Claude Code agent list)
  System architect responsible for application design,
  NFR design, and component decomposition.
disallowedTools: Task               # Agents cannot spawn subagents
modelOverride: opus                 # opus for high-judgment work; sonnet for templated output
---
```

| フィールド | 必須 | 説明 |
|-------|----------|-------------|
| `name` | Yes | エージェント識別子。ファイル名と一致する必要がある |
| `description` | Yes | 簡潔な役割サマリー |
| `tools` | No | オプションのallowlist。省略するとセッションのツールセット全体を継承する。指定するとエージェントが絞り込まれ、`mcp__<server>__<tool>` の id も列挙しない限り継承したMCPツールが失われる |
| `disallowedTools` | Yes | `Task` を含める必要がある -- 委譲を行うのはコンダクターのみ |
| `modelOverride` | No | `opus`(ほとんどのエージェントのデフォルト)または `sonnet`(テンプレート出力エージェントのみ) |

### Markdown本文のセクション

フロントマターの下のMarkdown本文で以下を定義します。

| セクション | 目的 |
|---------|---------|
| **Core Responsibilities** | 担当する各ステージでエージェントが行うこと |
| **Stages Owned** | リードおよびサポートのステージ割り当て |
| **Collaboration** | 受け取る相手 / 協働する相手 / 引き渡す相手 |
| **Knowledge Loading** | 6ステップのロード順序([ナレッジシステム](10-knowledge-system.md)を参照) |
| **Key Principles** | エージェントの行動ガイドライン |

---

## 共有設定

14個すべてのエージェントは共通の設定ベースラインを共有します。いずれも `tools:` allowlist を宣言していないため、すべてのエージェントは**セッションのツールセット全体**を継承します — Claude Code の組み込みツールすべてに加え、セッションにプロビジョニングされた任意のMCPツールです。唯一出荷時に設定されている制限は `disallowedTools: Task` です。

### セッションのツールセット(すべてのエージェントが継承)

すべてのエージェントは、以下を含むClaude Code組み込みツールを継承します。

| ツール | 目的 |
|------|---------|
| Read | ファイルシステムからファイルを読み取る |
| Edit | ファイル内の正確な文字列置換を実行する |
| Write | ファイルシステムにファイルを書き込む |
| Glob | 高速なファイルパターンマッチング |
| Grep | ripgrepを用いたコンテンツ検索 |
| AskUserQuestion | インタラクティブなユーザープロンプト(メインスレッドのステージのみ) |

### 共通の禁止Claude Codeツール

| ツール | 理由 |
|------|--------|
| Task | エージェントは委譲されたワーカーとして動作する。Task呼び出しを行うのは SKILL.md のコンダクターのみ。`disallowedTools: Task` によってサブエージェントの連鎖的な生成を防ぐ。 |

### 各ペルソナが行使することを期待されるツール

すべてのエージェントは継承によってBashとWebSearchに*到達可能*です。この表は、どのペルソナがステージ作業でそれらを使用することを方法論が**期待している**かを記録したものであり、エージェント単位の付与ではありません。ペルソナを本当に制限するには、オプションの `tools:` allowlist を追加します(これにより `mcp__<server>__<tool>` の id を列挙しない限り継承したMCPが失われます) — この実装ではそのような制限は出荷していません。

| ツール | 行使を期待されるエージェント |
|------|---------------------|
| Bash | amadeus-aws-platform-agent, amadeus-devsecops-agent, amadeus-developer-agent, amadeus-quality-agent, amadeus-pipeline-deploy-agent, amadeus-operations-agent |
| WebSearch | amadeus-product-agent, amadeus-design-agent, amadeus-compliance-agent |

### モデルオーバーライド

| モデル | エージェント |
|-------|--------|
| opus | amadeus-architect-agent, amadeus-product-agent, amadeus-design-agent, amadeus-developer-agent, amadeus-quality-agent, amadeus-devsecops-agent, amadeus-compliance-agent, amadeus-aws-platform-agent |
| sonnet | amadeus-delivery-agent, amadeus-pipeline-deploy-agent, amadeus-operations-agent |

デフォルトはopusです。エージェントがsonnetを使うのは、その出力が支配的にテンプレート的またはパターン追従的で(デリバリー計画、CI/CD YAML、可観測性/runbookのスキャフォールディング)、方法論がすでにナレッジファイルにエンコードされている場合のみです。

opusは、下流へカスケードする高判断・多制約の推論を伴う作業を持つエージェントに使用されます。

- **product** — 曖昧なintentの解釈
- **design** — UXのトレードオフ
- **architect** — アーキテクチャの分解
- **developer** — 密なコンテキスト下でのコード合成
- **quality** — リスクベースのテスト戦略
- **devsecops** — 脅威の優先順位付け
- **compliance** — 規制上のエッジケース
- **aws-platform** — クラウドアーキテクチャのトレードオフ

---

## エージェント比較マトリクス

| エージェント | Bash | WebSearch | Opusモデル | リードステージ | サポートステージ | 合計 |
|-------|------|-----------|------------|-------------|----------------|-------|
| amadeus-product-agent | No | Yes | Yes | 5 | 3 | 8 |
| amadeus-design-agent | No | Yes | Yes | 2 | 2 | 4 |
| amadeus-delivery-agent | No | No | No | 3 | 2 | 5 |
| amadeus-architect-agent | No | No | Yes | 6 | 3 | 9 |
| amadeus-aws-platform-agent | Yes | No | Yes | 2 | 4 | 6 |
| amadeus-compliance-agent | No | Yes | Yes | 0 | 4 | 4 |
| amadeus-devsecops-agent | Yes | No | Yes | 0 | 5 | 5 |
| amadeus-developer-agent | Yes | No | Yes | 2 | 3 | 5 |
| amadeus-quality-agent | Yes | No | Yes | 2 | 2 | 4 |
| amadeus-pipeline-deploy-agent | Yes | No | No | 4 | 0 | 4 |
| amadeus-operations-agent | Yes | No | No | 3 | 0 | 3 |

**観察:**
- amadeus-architect-agent は最も広いステージ関与を持つ(3フェーズにまたがる9ステージ)。
- 11エージェントのうち8つがopusで動作する。3つのsonnetエージェント(delivery、pipeline-deploy、operations)は支配的にテンプレート的な計画、CI/CD、runbook作業を担当する。
- amadeus-compliance-agent は純粋にアドバイザリーの立場で動作する(4サポートステージ、リードステージなし)。
- 11エージェントのうち6つがBashアクセスを持ち、いずれもCLIインタラクションを必要とする役割である。
- 3エージェントがリサーチタスク用にWebSearchアクセスを持つ。

---

## フェーズ参加

| エージェント | Init (0) | Ideation (1) | Inception (2) | Construction (3) | Operation (4) |
|-------|----------|--------------|---------------|-------------------|---------------|
| amadeus-product-agent | -- | L (intent-capture, market-research, scope-definition), S (rough-mockups, approval-handoff) | L (requirements-analysis, user-stories), S (refined-mockups) | -- | -- |
| amadeus-design-agent | -- | L (rough-mockups) | L (refined-mockups), S (user-stories, application-design) | -- | -- |
| amadeus-delivery-agent | -- | L (team-formation, approval-handoff), S (scope-definition) | L (delivery-planning), S (units-generation) | -- | -- |
| amadeus-architect-agent | -- | L (feasibility), S (intent-capture) | L (application-design, units-generation), S (reverse-engineering, delivery-planning) | L (functional-design, nfr-requirements, nfr-design) | -- |
| amadeus-aws-platform-agent | -- | S (feasibility) | S (application-design) | L (infrastructure-design), S (nfr-design) | L (environment-provisioning), S (feedback-optimization) |
| amadeus-compliance-agent | -- | S (feasibility) | -- | S (nfr-requirements, infrastructure-design) | S (environment-provisioning) |
| amadeus-devsecops-agent | -- | -- | S (practices-discovery) | S (nfr-requirements, infrastructure-design, build-and-test) | S (environment-provisioning) |
| amadeus-developer-agent | -- | -- | L (reverse-engineering), S (practices-discovery) | L (code-generation), S (functional-design) | S (deployment-execution) |
| amadeus-quality-agent | -- | -- | S (practices-discovery) | L (build-and-test), S (nfr-requirements) | L (performance-validation) |
| amadeus-pipeline-deploy-agent | -- | -- | L (practices-discovery) | L (ci-pipeline) | L (deployment-pipeline, deployment-execution) |
| amadeus-operations-agent | -- | -- | -- | -- | L (observability-setup, incident-response, feedback-optimization) |

L = リード、S = サポート

---

## エージェントの追加方法

エージェントの表示名と例示ナレッジファイルは、各エージェントの `.md` フロントマターにある `display_name` と `examples` フィールドが正典です — TypeScriptの編集は不要です。完全なレシピ(必須フロントマターフィールド、検証手順、何が自動的に検証され何が手動かの区別)については、[コントリビュート: エージェントの追加](11-contributing.md#adding-an-agent)を参照してください。手順の簡単なサマリーは以下のとおりです。

1. 必須フロントマター(`name`、`display_name`、`examples`、`description`、`disallowedTools`(`Task` を含む)、`modelOverride`)を持つ `core/agents/{name}-agent.md` を作成する。オプションの `tools:` allowlist は継承ツールセットを絞り込む。省略するとセッションのツールセット全体を継承する。`core/tools/amadeus-lib.ts` の `loadAgents()` が次回の呼び出しでファイルを検出する。
2. `core/knowledge/{name}-agent/` にナレッジファイルを追加する
3. エージェントが参加するステージファイル(`core/amadeus-common/stages/`)にエージェントを追加する — 各ステージのフロントマターで `lead_agent` / `support_agents` を設定する。コンパイル済みの `tools/data/stage-graph.json` はそのフロントマターから `bun scripts/package.ts` によって生成される。手編集は絶対にしない(`package.ts --check` のドリフトガードが手編集されたdistでCIを失敗させる)。
4. ディストリビューションを再生成する: `bun scripts/package.ts`(その後 `--check` でドリフトがないことを確認)
5. 手動保守のナレッジテーブルにエージェント→examplesの行を追加する(space レベルのチームナレッジディレクトリは `amadeus/knowledge/{name}-agent/` で、コンテンツがあるときにチームが作成する — エンジンはスキャフォールドしない)
6. テストを更新する: ファイル存在のスモークテスト、ステージ-エージェント相互参照のフィーチャーテスト
7. このファイルと [reference/agents/](agents/) のドキュメントを更新する

## エージェントの変更方法

- **ツールの変更**: フロントマターに `tools:` allowlist を追加または編集してエージェントを絞り込む。省略するとセッションのツールセット全体を継承する。`tools:` リストは、`mcp__<server>__<tool>` の id も列挙しない限り継承したMCPツールを失う。
- **モデルの変更**: `modelOverride` を `opus` または `sonnet` に編集する。
- **挙動の変更**: Markdown本文のセクション(責務、原則)を編集する。
- **ステージ割り当ての変更**: エージェントファイル(Stages Owned セクション)と関連するステージファイル(`core/amadeus-common/stages/`)の両方を編集し、`bun scripts/package.ts` で再生成する — コンパイル済みのステージグラフはステージフロントマターから導出され、手編集されることはない。

---

## 相互参照

- [アーキテクチャ](01-architecture.md) -- エージェント層を含む5層モデル
- [ナレッジシステム](10-knowledge-system.md) -- ナレッジのロード順序
- [エージェント技術リファレンス](agents/) -- エージェント別の技術詳細
- [ステージプロトコル](04-stage-protocol.md) -- エージェントペルソナのロードルール
