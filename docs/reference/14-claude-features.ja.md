# ハーネスプリミティブのマッピング

AI-DLC の方法論的な概念はハーネス中立であり、各 CLI ハーネスはそれらを
自身のネイティブなプリミティブを通じて表現します。本章では AI-DLC の概念を
各ハーネスが用いるプリミティブへとマッピングし、続いて **Claude Code** における
表現を詳しく解説します(最も網羅的に文書化されているハーネスです。Kiro と Codex は
同じ概念をそれぞれの等価物を通じて表現し、章ごとに要約されています。
[Running on other harnesses](../guide/harnesses/README.md) を参照。ハーネスを追加する際の
ソース契約は [Porting to a New Harness](../harness-engineering/09-porting-to-a-new-harness.md) です)。

フックについては [Hooks and Tools](06-hooks-and-tools.md) を参照。ナレッジについては [Knowledge System](10-knowledge-system.md) を参照。

---

## 概念からプリミティブへのマッピング(ハーネス別)

AI-DLC の概念が不変項であり、それを担うプリミティブがハーネスのパラメータです。
新しいハーネスへ移植する際は列を追加してください。

| AI-DLC の概念 | Claude Code | Kiro CLI | Codex CLI |
|----------------|-------------|----------|-----------|
| **オーケストレーターのエントリ**(`/amadeus` + runner群) | Skills (`/amadeus`) | Skills (`/amadeus`) | Skills (`$amadeus`) |
| **エージェントペルソナ**(11のドメインエキスパート) | `.claude/agents/*.md` | `.kiro/agents/*.json` + persona `.md` | `.agents/` TOMLs |
| **自動化**(監査、状態、トラッキング) | Hooks via `settings.json` | Hooks via `agents/amadeus.json` | Hooks via `.codex/hooks.json` (one adapter) |
| **常設ルール**(レイヤーチェーン) | `amadeus/spaces/<space>/memory/`(`.claude/rules/amadeus.md` の @-import スタブ経由) | `amadeus/spaces/<space>/memory/`(Kiro resources glob 経由) | `amadeus/spaces/<space>/memory/`(`AMADEUS_RULES_DIR` 経由) |
| **プロジェクトオンボーディング文書** | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| **パーミッション / 設定** | `.claude/settings.json` | `.kiro/settings/cli.json` + agent config | `.codex/config.toml`(+ Starlark `rules/`) |

その下にある決定論的なエンジン、状態機械、監査ログ、ステージグラフ、そして swarm
referee は、すべてのハーネスでバイト単位で同一です — 異なるのはそれらを担う
プリミティブだけです。本章の残りでは、各プリミティブの **Claude Code** における表現を
詳しく解説します。Kiro と Codex の等価物については、それぞれのガイド章を参照してください。

---

## Claude 固有

以下のセクションでは、特に Claude Code が各プリミティブをどう表現するか
— そのスキルのフロントマター、エージェントのロードモード、`settings.json` ブロック、
`.mcp.json` モデル — を説明します。Kiro と Codex は上表のプリミティブを通じて同じ概念を
担います。ある機構が Claude 固有の場合(`companyAnnouncements` のウェルカムメッセージ、
statusline コマンド、`AskUserQuestion` のゲートウィジェット)は、その旨を明記します。

---

## Skills

### エントリポイントとしての SKILL.md

オーケストレーターは `.claude/skills/amadeus/SKILL.md` に存在します。ユーザーは `/amadeus` コマンドで呼び出します。このファイルはメタデータを宣言するために YAML フロントマターを使用します:

```yaml
---
name: amadeus
description: >
  AI-DLC workflow orchestrator. Start, resume, or manage an AI-driven
  development lifecycle.
argument-hint: "[description | --status | --stage <slug|#> | --phase <name|#> | --help]"
user-invocable: true
---
```

オーケストレーターのフロントマターには `hooks:` ブロックがありません。v0.6.0 以降、すべてのフレームワークフックは `settings.json` 内でプロジェクト全体に登録されるため(hooks-move、Fork 2→B)、オーケストレーターおよびパッケージ済み・手書きのすべての runner は、runner ごとの `hooks:` ブロックをコピーすることなく決定論的なスパインを継承します。

| フィールド | 目的 |
|-------|---------|
| `name` | スキルを Claude Code のコマンドシステムに `/amadeus` として登録する |
| `description` | スキルの発見機能とヘルプテキストに表示される |
| `argument-hint` | 受け付ける引数を示すために `/amadeus` の後に表示されるプレースホルダーテキスト |
| `user-invocable` | ユーザーが直接トリガーできるように `true` に設定する |

SKILL.md の本体は薄いフォワーディングループ — コンダクターです。オーケストレーションエンジン(`amadeus-orchestrate next`)を呼び出し、返された型付きディレクティブに応じて動作し(ステージを実行する、質問をする、swarm をファンアウトする)、結果を報告し(`report`)、これを繰り返します。ステージ間の判断 — セッション検出、スコープからステージへのマッピング、ステージグラフ、ルーティング、ステージの前進 — はエンジンと、それが読み取るコンパイル済みデータ(`tools/data/stage-graph.json`、`scope-grid.json`)に存在し、このファイルには存在しません。[Engine and Skill System](17-skill-system.md) を参照。

### プロジェクト全体のフック

すべてのフレームワークフックは `settings.json` 内でプロジェクト全体に登録されます(ワークフロースパインのフックは、セッションライフサイクルおよび statusline のフックとそこで合流します)。各フックは **自己ゲート** します — ワークフローがアクティブでないときは早期終了します — ため、AI-DLC の外での通常の Claude Code 使用中は no-op になります。詳細は [Hooks and Tools](06-hooks-and-tools.md) を参照。

### コンパニオンファイル

SKILL.md は `.claude/skills/amadeus/` 内の2つのコンパニオンファイルセットを参照します:

- **`stage-protocol.md`** -- 全32ステージに対する必須プロトコル(承認ゲート、質問のフォーマット、監査ログ規則、完了メッセージ、フェーズ境界の検証)。
- `stages/initialization/`、`stages/ideation/`、`stages/inception/`、`stages/construction/`、`stages/operation/` 内の **ステージファイル** -- 32個の個別ステージ定義。

---

## Agents

### エージェントファイルのフォーマット

この実装は AI-DLC のエージェントロールを `.claude/agents/` 内のフラットな `.md` ファイルとしてレンダリングします — 13ファイル: 11のドメインエキスパートペルソナに加えて、レビュー専用の2エージェント(product-lead、architecture-reviewer)。各ファイルは YAML フロントマターに続けて markdown 本体を用います。フロントマターはエージェントがアクティブ化されたときの Claude Code の挙動を制御し、本体はペルソナ、責務、ステージのオーナーシップ、コラボレーションパターン、ナレッジのロード順序、そして主要な原則を提供します。

エージェントシステムの完全なドキュメントは [Agent System](05-agent-system.md) を参照。

### インライン vs サブエージェントのロード

コンダクターはエージェントのアクティブ化に2つのモードを使用します:

**インライン実行(32ステージ中30):**
コンダクターはエージェントの `.md` ファイルを読み、メイン会話の中で直接そのペルソナを採用します。ユーザーはエージェントとリアルタイムでやりとりします。

**サブエージェント実行(2ステージ: 2.1、3.5):**
コンダクターは Claude Code の Task ツールを介して別の Claude インスタンスに委譲します。サブエージェントは分離された環境で実行され、プロンプト経由でコンテキストを受け取り、構造化された要約を返します。

| ステージ | Claude Code サブエージェントタイプ | エージェント | 理由 |
|-------|---------------------------|-------|--------|
| 2.1 Reverse Engineering | `amadeus-developer-agent` then `amadeus-architect-agent`(2ステップ) | amadeus-developer-agent + amadeus-architect-agent | 深いコード分析は大きな中間出力を生成する |
| 3.5 Code Generation | `amadeus-developer-agent` | amadeus-developer-agent | コード作成は unit 仕様に焦点を当てたクリーンなコンテキストの恩恵を受ける |

ワークスペース検出(0.2)は以前はサブエージェントでしたが、現在は `amadeus-utility init` 内で決定論的に実行されます。

### モデルの上書き

| モデル | エージェント | 根拠 |
|-------|--------|-----------|
| `opus` | architect, product, design, developer, quality, devsecops, compliance, aws-platform (8) | 決定が下流にカスケードする、高度な判断と多制約推論を要するもの — アーキテクチャ境界、intent 解釈、UX のトレードオフ、コード合成、脅威の優先順位付け、規制上のエッジケース、クラウドアーキテクチャ |
| `sonnet` | delivery, pipeline-deploy, operations (3) | 出力が主にテンプレート化された計画テーブル、CI/CD YAML、または可観測性/runbook のスキャフォールディングであり、方法論はエージェントのナレッジファイルにエンコードされている |

---

## Rules

### レイヤー化されたルールファイル

この実装は挙動ルールを `amadeus/spaces/<space>/memory/` のスペースメモリレイヤーから読み取り、`.claude/rules/amadeus.md` の @-import スタブを介して Claude のコンテキストに取り込みます。継承チェーンのレイヤーごとに1ファイルです:

```
amadeus/spaces/<space>/memory/
├── org.md                        # framework defaults (shipped)
├── team.md                       # this team's affirmed practices
├── project.md                    # this project's specialization
└── phases/                       # rules scoped to a phase
    ├── ideation.md
    ├── inception.md
    ├── construction.md
    └── operation.md
```

各ファイルはトピック別の `##` 見出し(Way of Working、Testing Posture、Deployment、Code Style、Forbidden、Mandated など)を持ちます。ワークフロー開始時に compile resolver がチェーン **org → team → project → phase → stage** を辿り、解決されたルールセットを各ステージのグラフノードに焼き込みます。このモデルは **strict-additive(厳格加法的)** です: すべてのレイヤーの適用可能なルールがエージェントのコンテキストに同時に現れます — 狭いレイヤーが広いレイヤーを暗黙のうちに上書きすることは決してありません。より広いスコープのルールと *矛盾する* ルールは、書き込み時の admission gate(受け入れゲート)で拒否され、実行時に調停されることはありません。権威あるレイアウト、スコープの導出、そして矛盾のセマンティクスは [Rule System](08-rule-system.md) にあります。

**org/team ファイルが簡潔に保たれる理由:** Claude Code はスペースメモリファイルを(`.claude/rules/amadeus.md` の @-import スタブ経由で)AI-DLC でないものを含むすべての会話にロードします。出荷されるレイヤーを簡潔でトピック別の構造に保つことで、通常の開発セッションを汚染することを避けます。上流の仕様がルールに置く詳細な方法論は、代わりに `.claude/knowledge/amadeus-shared/` または SKILL.md と stage-protocol.md に存在し、`/amadeus` がアクティブなときにのみロードされます。

### 学習ループ

ルールファイルは静的ではありません — v0.5.0 の学習ループは、ワークフロー内での是正を次回のための常設ルールへと変えます。分業は意図的です: LLM の唯一の仕事は、ステージ実行中にステージの `memory.md` 日記に観察を書き込むこと(Interpretations / Deviations / Tradeoffs / Open questions)です。それ以外はすべて決定論的なツールか人間の判断です:

1. **日記(LLM)。** ステージ中、観察は intent の record dir `<record>/<phase>/<stage>/memory.md`(`<record>/` = `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)に蓄積されます。
2. **サーフェス(ツール)。** 承認ゲートで、`amadeus-learnings.ts surface` が日記を読み、構造化された候補を出力します — LLM は再パースも分類もしません。
3. **確認(人間)。** コンダクターが候補をレンダリングし、あなたがどれを残すかを選び、フリーテキストの追加については、宛先を導く単一の見出しを選びます。
4. **受け入れチェック(ナレッジ)。** 残された各学習は `org.md` の対応するセクションと照合されます。矛盾はあなたが修正、スキップ、またはエスカレーションできるよう表面化されます。
5. **永続化(ツール)。** `amadeus-learnings.ts persist` が確認済みの各学習をプラクティスとして `amadeus/spaces/<space>/memory/{project,team}.md` に日付付きエントリとして書き込み、センサーバインディングの学習については、マニフェストとステージの `sensors:` import を1つのロックされたトランザクション内でインストールします。`RULE_LEARNED` / `SENSOR_PROPOSED` を出力します。

ユーザー向けのウォークスルー(実例付き)は [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md) に、ハーネスエンジニアの著述の観点は [Rules and the Learning Loop](../harness-engineering/05-rules-and-the-loop.md) にあります。

---

## CLAUDE.md

### プロジェクトレベルの指示

`.claude/CLAUDE.md` は、すべての会話にロードされるプロジェクトレベルの指示を提供します。AI-DLC においては、ブートストラップ文書として機能します。

**主要なセクション:**

| セクション | 内容 |
|---------|----------|
| Prerequisites | `bun`(唯一のランタイム依存);`mkdir` ベースのロッキング |
| AI-DLC Structure | スキル、エージェント、ルール、ナレッジ、フックの場所 |
| Conventions | 成果物は `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` の下の intent の record dir へ;アプリケーションコードはワークスペースルートへ |
| Session Resumption | 起動時に `amadeus-state.md` を確認し、再開オプションを提示 |
| Git Integration | コミットポリシー(下記参照) |

### Git Integration

```
Commit: amadeus/ workspace (memory layer, intents registry, per-intent
        amadeus-state.md, audit/ shards, and stage artifacts)
Gitignore:
  - amadeus/active-space, amadeus/spaces/*/intents/active-intent  (per-user cursors)
  - amadeus/.amadeus-clone-id, amadeus/.amadeus-sessions/             (machine-local)
  - amadeus/spaces/*/intents/*/runtime-graph.json              (re-derivable)
  - amadeus/spaces/*/intents/*/.amadeus-*                          (incl. .amadeus-recovery.md)
  - amadeus/spaces/*/intents/.amadeus-*                        (no-intent fallback root)
```

監査証跡は **per-clone のシャード**(`audit/<host>-<clone>.md`)としてコミットされます: 各クローンは自身のシャードに追記するため、並行する追記が git 上で競合することはありません。per-user のセッションカーソルとマシンローカルな派生状態は無視されます。

---

## Settings

### パーミッションの設定

`.claude/settings.json` は、呼び出しごとのパーミッションプロンプトなしにワークフローが実行されるよう、Claude Code のツールを事前承認します:

```json
{
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Bash",
      "Glob", "Grep", "Task", "WebSearch"
    ]
  }
}
```

これがないと、Claude Code は各ツールの初回使用時に「このツールを許可しますか?」とプロンプトを出し、ワークフローを中断させてしまいます — 特にユーザーが直接やりとりしていないサブエージェント委譲の間に。

### ステータスラインの設定

```json
"statusLine": {
  "type": "command",
  "command": "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-statusline.ts"
}
```

ターミナルのステータスを最新に保つため、(ツール使用時だけでなく)定期的に実行されます。

### SessionStart および SessionEnd フックの設定

```json
"hooks": {
  "SessionStart": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-session-start.ts"
    }]
  }],
  "SessionEnd": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-session-end.ts"
    }]
  }]
}
```

`settings.json` に(プロジェクト全体で)登録されています — v0.6.0 の hooks-move 以降、すべてのフレームワークフックと同様です。セッションライフサイクルイベントは、`/amadeus` がアクティブ化される前に発火し、終了した後にも発火するため、いずれにせよプロジェクト全体でなければなりません: `session-start.ts` は再開コンテキストを注入し、`session-end.ts` は監査の完全性のために `SESSION_ENDED` を出力します。

### 個人設定の上書き

`.claude/settings.local.json`(gitignore 対象)は、リポジトリに影響を与えずに共有設定を上書きします:

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

---

## MCP Servers

### プロジェクト MCP レジストリ

Claude Code のディストリビューションはデフォルトではプロジェクトの `.mcp.json` を出荷しません。プロジェクトが MCP サーバーを必要とする場合は、通常の Claude Code のプロジェクトまたはユーザーの MCP 設定に宣言してください。認証情報は環境や個人設定を通じて流れるべきであり、シークレットをプロジェクトにコミットしないでください。

### プロビジョニングと継承

アクセスモデルはプロビジョニングに続いて継承であり、その間に grant(付与)ステップはありません:

1. **一度宣言する。** サーバーはプロジェクトまたはユーザーの MCP 設定にリストされます。
2. **セッションへプロビジョニングする。** Claude Code は宣言されたサーバーを起動し、それらのツールを `mcp__<server>__<tool>` の id としてセッションに公開します。
3. **どこでも継承する。** サブエージェントはデフォルトですべてのセッション MCP ツールを継承します。すべての AI-DLC エージェント — インラインで実行されるか、委譲されたサブエージェント(ステージ 2.1、3.5)として実行されるかを問わず — はすべての宣言されたサーバーに到達します。

per-agent の grant ステップは存在せず、必要もありません: 継承がデフォルトであり、すべてのエージェントにわたって加法的です。新しいエージェントファイルは、フロントマターにサーバーをリストすることによってではなく、存在することによって MCP アクセスを得ます。

### なぜ per-agent の grant がないのか

これが load-bearing(要となる)教訓であり、蒸し返されないよう率直に述べる価値があります。**MCP アクセスは追加によってエージェントに付与できません — それは継承されるものであり、唯一のレバーは制限です。** Claude Code 2.1.159 に対する経験的なスパイクが境界を確立しました:

- エージェントはフロントマターでサーバーを *名指し* しても何も得ません。加法的な grant フィールドは存在しません。継承がすでにエージェントにすべてのセッション MCP ツールを与えています。
- エージェントがサーバーを使用するのを *防ぐ* には、その `tools:` allowlist(実際の Claude Code フロントマターフィールド)を、呼び出しを許可される完全修飾された `mcp__<server>__<tool>` の id に絞り込みます。設定済みの `tools:` リストからツールを省くことが、それを拒否する手段です。
- 素の `mcp__<server>` トークンは **尊重されません** — サーバーレベルのワイルドカードは存在しません。完全修飾された `mcp__<server>__<tool>` の id のみがマッチします。
- `disallowedTools` は denylist 側の実在する、機能するフィールドです。この実装は入れ子のサブエージェント生成をブロックするために `disallowedTools: Task` を使用します。この拒否は MCP サーバーアクセスに影響しません。

スパイクはまた、別のフロントマターの落とし穴を明るみに出しました: `allowedTools` は Claude Code のサブエージェントフィールドとして **認識されず**、暗黙のうちに無視されます。`allowedTools: Read` を宣言するエージェントは依然として MCP ツールに到達し、inherit-all(すべて継承)と同一の挙動をしましたが、同じエージェントを `tools: Read` にした場合は正しくそれを拒否しました。解決策(v0.5.4): 暗黙のうちに無視される `allowedTools` フィールドは、出荷されるすべてのエージェントファイル(`.claude/agents/*.md`)から削除されました。エージェントは現在、意図的にセッションの全ツールセット — 組み込みツールと MCP ツールの双方 — を継承し、宣言される唯一の制限は `disallowedTools: Task` です。文書化されたオプトインの絞り込みは実際の `tools:` allowlist であり、完全修飾された `mcp__<server>__<tool>` の id も同時にリストされない限り、継承された MCP をドロップします。したがって inherit-all は今や、無視されるフィールドの偶然ではなく、意図的で文書化されたモデルです: すべてのエージェントは今日、すべての宣言されたサーバーに到達します。

### settings.json パーミッションとの関係

2つの設定ファイルは異なる問いに答えるものであり、重複しません:

- `.claude/settings.json` の `permissions.allow` は、セッションが初回使用時にプロンプトを出さないよう *組み込みの Claude Code ツール*(Read、Edit、Write、Bash、Glob、Grep、Task、WebSearch)を事前承認します(上記の [Settings](#settings) を参照)。MCP サーバーについては何も述べません。
- プロジェクトまたはユーザーの MCP 設定は、*どの MCP サーバーが存在するか* とそれらをどう起動するかを宣言します。プロビジョニングと継承は `settings.json` ではなく、Claude Code の MCP レイヤーによって統治されます。

セッションに MCP サーバーが現れるのは、MCP 設定と利用可能な認証情報の関数であり、`settings.json` のいかなる allow-list エントリの関数でもありません。per-agent の絞り込みは、それが配線されている場合、`settings.json` ではなくエージェントの `tools:` フロントマターに存在します。

---

## 機能相互作用マップ

| 機能 | ファイル | ロードされるタイミング | 役割 |
|---------|---------|---------------|------|
| CLAUDE.md | `.claude/CLAUDE.md` | すべての会話 | ブートストラップ: 構造、前提条件、規約 |
| Settings | `.claude/settings.json` | すべての会話 | Claude Code ツールを事前承認 |
| Rules | `amadeus/spaces/<space>/memory/*.md`(`.claude/rules/amadeus.md` @-スタブ経由) | すべての会話 | 最小限のガードレール;自己学習による是正 |
| Skill | `.claude/skills/amadeus/SKILL.md` | `/amadeus` 呼び出し時 | オーケストレーター: セッション、スコープ、ステージグラフ、委譲 |
| ワークフロースパインのフック | `.claude/settings.json` | 常時オン;ワークフローがないときは自己ゲート | PostToolUse、PreCompact、SubagentStop、Stop |
| Agents(インライン) | `.claude/agents/*.md` | ペルソナのアクティブ化 | 32ステージ中30: コンダクターがエージェントペルソナを採用 |
| Agents(サブエージェント) | `.claude/agents/*.md` | Task ツール委譲 | 2ステージ(2.1、3.5): 分離実行 |
| Knowledge(Tier 1) | `.claude/knowledge/` | ペルソナのアクティブ化(ステップ 2-3) | 56の方法論リファレンスファイル |
| Knowledge(Tier 2) | スペースレベルの `amadeus/knowledge/`(`intents/` の兄弟) | ペルソナのアクティブ化(ステップ 4-5) | チーム管理のカスタマイズ |
| Stage protocol | `stage-protocol.md` | すべてのステージ実行 | 必須の挙動契約 |
| Stage files | `stages/**/*.md` | エンジンのルーティング | 32個の個別ステージ定義 |
| State file | `amadeus-state.md` | セッション開始時 + 全体を通して | 永続的なワークフロー状態 |
| Audit file | `audit.md` | 実行全体を通して | 追記専用の監査証跡 |

### ロードシーケンス

ユーザーが `/amadeus feature` を実行すると:

```
1.  CLAUDE.md loads              (every conversation)
1a. statusLine command starts    (settings.json -- runs continuously)
2.  settings.json loads          (every conversation; all hooks register here, project-wide)
2a. SessionStart hook fires      (settings.json -- if session resume)
3.  memory/ rules load            (every conversation)
4.  SKILL.md activates           (skill invocation -- the conductor)
5.  Conductor calls the engine   (`amadeus-orchestrate next $ARGUMENTS`)
6.  Engine reads state + graph   (decides the move, emits a typed directive)
7.  Conductor acts on directive  (run-stage: load agent .md + knowledge, run the body)
8.  Stage executes               (stage work)
9.  Hooks fire as needed         (Claude Code tool calls, compaction, subagent stop)
10. Conductor reports the outcome (`amadeus-orchestrate report` -- commits state)
11. Loop back to step 5          (next directive) until the engine emits `done`
```

ステップ 1-2a は AI-DLC でないものも含むすべての会話で起こります — そして、すべてのフックが(スキルのアクティブ化時ではなく)`settings.json` にプロジェクト全体で登録されているため、決定論的なスパインは `/amadeus` が呼び出される前に整っています。各フックはワークフローがアクティブでないとき no-op に自己ゲートします。ステップ 3 はルールレイヤーをロードします。ステップ 4 以降は、ユーザーが `/amadeus` を呼び出したときにのみワークフローをセットアップし駆動します。ステップ 5-11 はディレクティブごとに1回繰り返されます — 各反復が何を行うかを決めるのは SKILL.md ではなくエンジンです。

---

## クロスリファレンス

- [Architecture](01-architecture.md) -- すべての機能レイヤーを含む5レイヤーモデル
- [Orchestrator](03-orchestrator.md) -- SKILL.md の深掘り
- [Agent System](05-agent-system.md) -- エージェントのフロントマター、ツール制限、モデル上書き
- [Hooks and Tools](06-hooks-and-tools.md) -- フックシステム、監査タクソノミー、CLI ツール
- [Knowledge System](10-knowledge-system.md) -- 2層ナレッジ、ロード順序
- [Porting to a New Harness](../harness-engineering/09-porting-to-a-new-harness.md) -- 上記マッピングに列を追加する方法: マニフェスト、フックアダプター、`emit.ts` 契約
- [Running on other harnesses](../guide/harnesses/README.md) -- これらのプリミティブの Kiro および Codex 表現、ハーネスごと
