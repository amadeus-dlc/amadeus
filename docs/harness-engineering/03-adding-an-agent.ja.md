# エージェントを追加する

エージェントはフレームワークの *誰* にあたります — ドメイン、ツールの許可リスト、モデルを持つペルソナです。出荷される11のエージェントは、プロダクト、デザイン、デリバリー、アーキテクチャ、AWS プラットフォーム、コンプライアンス、DevSecOps、開発、品質、パイプライン・デプロイ、オペレーションをカバーします。フレームワークがカバーしないドメイン(たとえばデータガバナンスのレビュアーやモバイルのスペシャリスト)がチームに必要になったら、`core/agents/` に単一の Markdown ファイルを置くことでペルソナを追加します。TypeScript は不要です。

この章ではワークフローを解説します。ペルソナファイルとは何か、そのフロントマターにおける判断のポイント、そして *可視* なエージェントがまだ *アクティブ* ではないという二段階の真実です。フィールドごとの契約については、Developer Reference へのリンクを張っています。ユーザーの席から見たこれらのエージェントについては [User Guide — Agents](../guide/06-agents.ja.md) を参照してください。

---

## ペルソナファイルとは何か、そしてどこに置かれるか

各エージェントは `core/agents/<slug>-agent.md` にある1つのフラットなファイルです。上部に YAML フロントマター、その下に Markdown 本体があります。出荷されるファイルはすべて `amadeus-` プレフィックスを持ちます(`amadeus-architect-agent.md`、`amadeus-developer-agent.md`)。あなたが追加するファイルはあなたのものであり、そのプレフィックスを使う必要はありません。出荷される11をフレームワークファイルとして扱ってください — それらはアップグレード時に上書きされるので、ファイルを編集するのではなく、team knowledge を通じて *既存エージェントが知っていること* をカスタマイズしてください([Team knowledge](07-team-knowledge.ja.md) を参照)。真に新しいペルソナは別の動きです。あなたが所有し、アップグレードを生き延びる新しいファイルです。

フロントマターはフレームワークがパースする部分です。本体は、エージェントがアクティブになったときに自分自身について読む散文です — その責務、所有するステージ、知識の読み込み方、作業原則です。機械が読むのはフロントマターだけです。本体はエージェント自身のフレーミングのためのものであり、出荷されるファイルの構造にマッチするように書きます。

以下は実在するエージェントのフロントマターで、`core/agents/amadeus-architect-agent.md` に作成されたものです:

```yaml
---
name: amadeus-architect-agent
display_name: Architect Agent
examples:
  - tech-stack.md
  - infrastructure-preferences.md
description: >
  Solutions architect responsible for application design, domain modelling,
  NFR patterns, and component decomposition.
disallowedTools: Task
modelOverride: opus
---
```

---

## フロントマターの契約と、あなたが行う判断

フィールドごとの完全なスキーマはリファレンスにあります。ここでは、実際にペルソナを作成するときに行う判断のポイントを示します。

**`name` はファイル名のステムと一致しなければならない。** `amadeus-data-governance-agent.md` にあるファイルは `name: amadeus-data-governance-agent` を宣言します。パーサーはこれをキーにするので、不一致は決して解決されないエージェントを作成するもっとも簡単な方法です。

**エージェントはデフォルトでセッションの全ツールセットを継承する。** 出荷される11のエージェントはどれも `tools:` の許可リストを宣言しないので、それぞれがセッションが提供するすべてのツールに手を伸ばします — `Read`、`Edit`、`Write`、`Glob`、`Grep`、`AskUserQuestion`、`Bash`、`WebSearch`、そして継承された MCP ツールも同様です。ペルソナを絞り込むには、それが使ってよいツールだけを名指しする任意の `tools:` 許可リストを追加します。`tools:` を列挙すると、ペルソナはそこで名指しされたツールに厳密に絞り込まれ、完全修飾の `mcp__<server>__<tool>` id も名指ししない限り、継承された MCP ツールは落ちます(下記の MCP 継承の注記を参照)。ドメインが本当に小さい表面を必要とするときにだけ手を伸ばしてください。ほとんどのペルソナは、すべてを継承させておくのが最善です。

**MCP サーバーは継承であり、エージェント単位で付与されるものではない。** プロジェクトまたはユーザーのハーネス設定で宣言されたサーバーはセッションにプロビジョニングされ、すべてのエージェントが自動的にそれらを継承します — 作成すべきエージェント単位の付与はありません。ペルソナをあるサーバーから *遠ざける* には、その `tools:` 許可リストを、そのサーバーを省いた完全修飾の `mcp__<server>__<tool>` リストに絞り込みます(裸の `mcp__<server>` トークンは no-op であり、サーバーレベルの付与ではありません)。この継承と制限のモデルは `t110` の付与ハイジーンテストで検証されています([Testing](../reference/09-testing.ja.md) を参照)。

**`disallowedTools` は `Task` を含まなければならない。** これは任意ではありません。エージェントは委譲されたワーカーとして実行されます。エンジンの `run-stage` ディレクティブが `mode: subagent` を担うとき、コンダクター(ライブの `/amadeus` セッション)が `Task` 呼び出しを実行します。`Task` を許可すると、エージェントが自分自身のサブエージェントをスポーンでき、フレームワークが防ぐために作られている委譲チェーンがカスケードしてしまいます。出荷されるすべてのエージェントは `Task` を禁止しており、あなたのものもそうしなければなりません。

**`modelOverride` は opus か sonnet で、デフォルトは opus。** 高度な判断を要し、複数の制約にまたがる推論で、下流にカスケードする作業のペルソナには `opus` に手を伸ばしてください — 曖昧な intent を解釈し、密なコンテキストの下でアーキテクチャ上のトレードオフを秤にかけるような作業です。11のエージェントのうち8がまさにこの理由で opus で動きます。出力が主にテンプレート化されたものかパターン追従であり、メソドロジーがエージェントの知識ファイルに既にエンコードされているときにだけ `sonnet` を使ってください — 3つの sonnet エージェント(delivery、pipeline-deploy、operations)はデリバリープラン、CI/CD の YAML、runbook のスキャフォールディングを生成します。迷ったら opus。

さらに2つのフィールドが、挙動ではなく提示を駆動します。`display_name` は statusline がレンダリングする人間可読なラベルです(architect は "Architect Agent" として表示されます)。`examples` は agent→examples テーブルに文書化される推奨知識ファイル名を列挙します — それらは *ユーザーに提示される提案* です。ランタイムはそれらを決して読み込まず、エンジンはそれらをディスクに書き込みません。

正確な必須/任意のテーブルと共有設定のマトリクスについては、[Agent System: Frontmatter Contract](../reference/05-agent-system.ja.md#frontmatter-contract) を参照してください。

---

## 可視はアクティブではない: 二段階の真実

これが体得すべき唯一のことです。ファイルを置くとエージェントは *可視* になります。それをステージに配線するとエージェントは *アクティブ* になります。両方のステップが必須であり、さもなければ存在するが決して実行されないエージェントができあがります。

- **ディスカバリーが可視にする。** `.claude/tools/amadeus-lib.ts` の `loadAgents()` は、次の呼び出し時に `.claude/agents/` 内のすべての `.md` ファイルを読み、メタデータマップを導出します。コードの編集も登録ステップも不要です — ファイルの存在が登録です。この時点から statusline はその display name をレンダリングでき、チームはそのスペースレベルの `amadeus/knowledge/<slug>-agent/` ディレクトリの下に標準を追加できます。
- **ステージバインディングがアクティブにする。** ステージは、そのフロントマターの `lead_agent` / `support_agents` フィールドで、リードとサポートのエージェントを slug で名指しします(`.claude/tools/data/stage-graph.json` にコンパイルされます)。いずれかのステージがあなたの slug を参照するまで、どの `run-stage` ディレクティブもそれを名指しせず、コンダクターは決してそのペルソナに委譲しません。

これはフレームワークの中核的な非対称性を反映しています — ステージはそのエージェントを名指しし、エージェントは決してそのステージを名指ししません。したがってエージェントファイルだけでは、設計上、不活性です。新しいペルソナを働かせるには、それを使うべきステージを編集してください。バインディングの仕組みは [Adding a Stage](02-adding-a-stage.ja.md) にあります。

各エージェントは、あなたが `core/knowledge/amadeus-<slug>-agent/`(フレームワークのメソドロジー)に作成する知識ディレクトリと、スペースレベルの任意のチームオーバーレイ `amadeus/knowledge/<slug>-agent/`(あなたの標準)ともペアになります。スペースレベルの `amadeus/knowledge/` ディレクトリはブートストラップ時には自由形式かつ空です。チームはコンテンツがあるときにエージェント単位のサブディレクトリを作成します — エンジンはそれをスキャフォールドしません。二層の知識ワークフローは [Team knowledge](07-team-knowledge.ja.md) で扱っています。

---

## 手順

リファレンスのレシピを反映して、ワークフローをエンドツーエンドで示します。

1. **エージェントファイルを作成する** — `core/agents/<slug>-agent.md` に、必須フロントマター(`name`、`display_name`、`examples`、`description`、`disallowedTools`(`Task` を含む)、`modelOverride`)を付けて。任意の `tools:` 許可リストはペルソナを絞り込みます。省略するとセッションの全ツールセットを継承します。本体は出荷されるファイルの構造(Core Responsibilities、Stages Owned、Collaboration、Knowledge Loading、Key Principles)にマッチするように書いてください。
2. **知識ファイルを追加する** — ペルソナがアクティベーション時に読み込むべきメソドロジーのために、`core/knowledge/amadeus-<slug>-agent/` の下に。
3. **ステージに配線する** — それがリードまたはサポートする各ステージファイル(`core/amadeus-common/stages/<phase>/<slug>.md`)の `lead_agent` / `support_agents` フロントマターに slug を追加し、その後 `stage-graph.json` が再生成されるように再コンパイル(`bun .claude/tools/amadeus-graph.ts compile`)します。`stage-graph.json` を手編集してはいけません — それはビルド成果物であり、次のコンパイルが手作業の変更を上書きします([Adding a Stage](02-adding-a-stage.ja.md#4-compile-so-stage-graphjson-regenerates) を参照)。これがそれをアクティブにするステップです。
4. **team-knowledge ディレクトリを文書化する** — チームがスペースレベルの `amadeus/knowledge/<slug>-agent/` の下に標準を追加することを記します。エンジンはこのディレクトリを作成しません。チームはコンテンツがあるときにそれを作成します(スペースの `amadeus/knowledge/` はブートストラップ時には自由形式かつ空です)。
5. **手作業でメンテナンスされるドキュメントのテーブルを更新する** — Phase Participation マトリクスと agent→examples テーブルは自身を再生成しません(下記の「自動で検証されないもの」を参照)。

完全なレシピ — ディスカバリー、intent 誕生、statusline 検証のコマンドを含む — は [Contributing: Adding an Agent](../reference/11-contributing.ja.md#adding-an-agent) にあります。既存エージェントのツール、モデル、ステージ割り当てを追加するのではなく変更するには、[Agent System: How to Modify an Agent](../reference/05-agent-system.ja.md#how-to-modify-an-agent) を参照してください。

### 自動で検証されるもの

- `loadAgents()` は次の呼び出し時に `.claude/agents/` 内の新しい `.md` ファイルをディスカバーします — コードの編集も登録も不要です。
- `name` または `display_name` が欠落している場合、パーサーはファイルと欠落フィールドを名指しして例外を投げます。
- エージェントは slug でアルファベット順にソートされて返されるので、ディスカバリーの順序はどのプラットフォームでも同一です。
- intent 誕生は空のスペースレベル `amadeus/knowledge/` ディレクトリを作成します。エージェント単位のサブディレクトリや README はシードしません。
- statusline は導出されたメタデータから display name をレンダリングします。

### 自動で検証されないもの

- **stage-graph への参加。** `stage-graph.json` はエージェントを slug で参照します。そこに配線せずにエージェントを追加すると、それは存在しますが決して実行されません。ディスカバリーとアクティベーションは別のステップです。
- **知識ファイルの存在。** `examples` は agent→examples テーブルに文書化される推奨ファイル名です — 何もそれらを作成・チェックしません。実際のコンテンツはあなたが `amadeus/knowledge/<slug>-agent/`(スペースレベルの知識ディレクトリ)の下に置きます。
- **手作業でメンテナンスされるドキュメントのテーブル。** [Agent System](../reference/05-agent-system.ja.md#phase-participation) の Phase Participation マトリクスと、知識 README テンプレートの agent→examples テーブルは手作業で編集されます。エージェントを追加するのと同じ変更の中でそれらを更新してください。
- **エージェントファイルの本体。** フロントマターだけがパースされます。本体の散文はエージェントがアクティブになったときにエージェント自身によって読まれるので、出荷される11にマッチするよう注意深く書いてください。

---

## 次へ

[Scopes](04-scopes.ja.md) — 特定の種類の作業に対してどのステージ(したがってどのエージェント)が実行されるかを決めます。
