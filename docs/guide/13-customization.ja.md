# カスタマイズ

> 言語: [English](13-customization.md) | **日本語**

AI-DLC はチームのニーズに適応するよう設計されています。この章では、設定の上書き、スコープ設定、ステージのカスタマイズ、ステータスライン、ツール権限について扱います。

> **ハーネス固有の設定。** ハーネス中立のカスタマイズ — スコープ
> 設定、ステージの深度、知識、ルール — はすべてのハーネスで適用されます。この章の
> メカニズムレベルの設定(`settings.json` / `settings.local.json`、
> ステータスラインコマンド、`$CLAUDE_PROJECT_DIR`、ツール権限ブロック)は
> **Claude Code 固有**です。Kiro は同等のものを
> `.kiro/settings/cli.json` + そのエージェント設定で、Codex は `.codex/config.toml`
> + Starlark ルールで設定します。各ハーネスの表層については [Kiro CLI での実行](harnesses/kiro-cli.ja.md) と
> [Codex CLI での実行](harnesses/codex-cli.ja.md) を参照してください。

---

## 設定の上書き (`settings.local.json`)

ディストリビューションは `.claude/settings.json.example` を出荷します。プロジェクトにまだない場合のみ `.claude/settings.json` にコピーしてください。チームに影響を与えずにローカル環境の設定を上書きするには、個人用の上書きファイルを作成します。

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

このファイルは `.gitignore` に記載されているため、個人的な変更がコミットされることはありません。以下の用途に使います。

- モデル選択の上書き(例: 別の Opus または Sonnet モデル ID に切り替え)
- ローカルセットアップ用の環境変数の設定
- セキュリティ要件に合わせたツール権限の調整

---

## プロジェクトごとのデフォルトスコープ

プロジェクト内のすべてのワークフローを同じスコープで開始すべき場合 — 例えば、全参加者が `workshop` を実行すべきワークショップ — `.claude/settings.json` またはローカル設定の上書きの `env` ブロックで `AMADEUS_DEFAULT_SCOPE` を設定します。

```json
{
  "env": {
    "AMADEUS_DEFAULT_SCOPE": "workshop"
  }
}
```

これを設定すると、素の `/amadeus` 呼び出しは `workshop` をデフォルトスコープとして使います。参加者は毎回 `/amadeus workshop` を覚える必要がありません。この環境変数はワークフロー初期化時のみ読み取られます。intent の `amadeus-state.md`(そのレコードディレクトリ配下)が存在すると、状態ファイルが正となり、環境変数の変更は進行中のワークフローに影響しません。

**優先順位(高い順):**

1. 明示的な CLI フラグ: `/amadeus feature` または `/amadeus --scope bugfix` が優先。
2. 自由形式テキストのキーワード検出: `/amadeus fix the login bug` は依然として `bugfix` にマップされる。ユーザーは既存の確認プロンプトで検出されたスコープを上書きできる。
3. `.claude/settings.json` の `AMADEUS_DEFAULT_SCOPE` 環境変数。
4. ハードコードされたフォールバック(intent 生成時は `poc`、未マッチな自由形式は `feature`)。

**有効な値:** `enterprise`、`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`workshop`。無効な値は呼び出し時に明確なメッセージとともにエラーになります。チームは `.claude/scopes/amadeus-<name>.md` ファイルを配置し、メンバーステージの `scopes:` リストにタグ付けすることで、追加のスコープを定義できます — [Contributing: スコープの追加](../reference/11-contributing.ja.md#adding-a-scope) を参照してください。チームは `.claude/agents/` に追加のエージェントを定義することもできます — [Contributing: エージェントの追加](../reference/11-contributing.ja.md#adding-an-agent) を参照してください。

**設定の検証:** `/amadeus --doctor` を実行して環境変数が設定され有効であることを確認します。

```
✓  AMADEUS_DEFAULT_SCOPE=workshop (valid)
```

**init 通知:** 環境変数のデフォルトが適用されると、オーケストレーターはワークフロー開始時に 1 行の通知(`Using scope=<value> from AMADEUS_DEFAULT_SCOPE (.claude/settings.json)`)を出力するため、スコープのソースが効力を発する瞬間に見えるようになります。

なぜスコープだけで深度やテスト戦略ではないのか? 各スコープは既に独自の深度とテスト戦略のデフォルトを宣言しています(workshop → Standard 深度、Minimal テスト戦略)。スコープを設定するとそれらが自動的にカスケードします。どちらかを上書きする必要がある場合は、CLI で `--depth` または `--test-strategy` を渡します。

**機密の値:** `.claude/settings.json` はバージョン管理にコミットされます。シークレット、認証情報、個人的な上書きをここに置かないでください — 機密なものはすべて `.claude/settings.local.json`(gitignore 済み)を使います。

---

## スコープ設定

スコープは、どのステージをどの深度とテスト戦略で実行するかを制御します。AI-DLC は 9 つの名前付きスコープを提供します。完全な表(各スコープの EXECUTE/総ステージ数、デフォルト深度、テスト戦略、ユースケース)は [スコープ、深度、テスト戦略 § 9 つのスコープ](05-scopes-and-depth.ja.md#the-9-scopes) が単一の情報源です。このセクションではそれらの*設定*と上書きを扱います。

### スコープの選択

明示的に指定するか、オーケストレーターに自動検出させます。

```
/amadeus enterprise       # 明示的なスコープ
/amadeus Build a payments API  # "feature" を自動検出
/amadeus Fix the login bug     # "bugfix" を自動検出
```

### 実行時の上書き

ワークフロー中いつでもスコープを上書きできます。

- **任意の承認ゲートで**: 別のスコープや深度を要求
- **ユーティリティコマンド経由**: `/amadeus --scope enterprise` がアクティブなスコープを変更
- **ステージの追加**: Ideation と Inception の承認ゲートで、以前スキップしたステージをワークフローに戻せる

---

## ステージのカスタマイズ

各ステージは `.claude/amadeus-common/stages/[phase]/` 内の自己完結した `.md` ファイルです。ステージファイルは以下を指定します。

- **Metadata** — ステージ番号、フェーズ、実行モード、リード/サポートエージェント
- **Inputs** — ロードする以前の成果物
- **Steps** — 番号付き実行シーケンス
- **Outputs** — 生成する成果物
- **Completion** — 承認ゲートのパターン

ステージの挙動を変更するには、そのステージファイルを直接編集します。すべてのステージは共有パターン(承認ゲート、質問フォーマット、状態トラッキング)についてステージプロトコルを参照します。

### 深度レベル

各スコープには成果物の詳細度を制御するデフォルト深度があります。

| 深度 | 説明 |
|-------|-------------|
| **Minimal** | 簡潔な成果物、ターゲットを絞った分析、オプションコンテンツなし |
| **Standard** | バランスの取れた詳細度、主要および副次的な関心事をカバー |
| **Comprehensive** | 完全な詳細度、広範な分析、すべてのオプションコンテンツを含む |

任意の承認ゲートで別のレベルを要求することで深度を上書きできます。

---

## ステータスライン(Claude Code のみ)

**Claude Code** では、この実装はワークフロー進捗を示すステータスラインをターミナルのステータスバーに表示します。Kiro と Codex にはステータスラインがありません。ワークフローの位置を `/amadeus --status`(Kiro)や `update_plan` タスク進捗アイテム + `$amadeus --status`(Codex)を通して表面化します。

```
[AIDLC] IDEATION [▓▓▓▓▓░░░░░] 4/7 > Intent Capture -- Product Agent
```

これは順に、現在のフェーズ、フェーズ進捗(バーと比率 — どちらも現在のフェーズにスコープされる)、ステージの表示名、リードエージェントを示します。コンテキスト使用量は右側に表示され(例: `ctx:15%`)、残りのコンテキストが減るにつれて色分けされます。

### 設定

ステータスラインは `.claude/settings.json` で設定します。

```json
"statusLine": {
  "type": "command",
  "command": "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-statusline.ts"
}
```

### フォーマットのカスタマイズ

`.claude/hooks/amadeus-statusline.ts` を直接編集します。出力フォーマットはファイル末尾近くの `main()` 関数で定義されています。このフックは `amadeus-state.md` からフェーズ、ステージ、エージェントを読み、ステージ slug を表示名にマップし、同じフェーズローカルのチェックボックスパースから Unicode の進捗バーと `n/m` 比率の両方を構築します。

### ステータスラインの無効化

`settings.json` から `statusLine` ブロックを削除します。ターミナルのステータスバーは Claude Code のデフォルトに戻ります。

---

## ツール権限

`.claude/settings.json` の `permissions.allow` リストは Claude Code のツールを事前承認するため、ワークフローは呼び出しごとの権限プロンプトなしに実行されます。

```json
"permissions": {
  "allow": [
    "Read", "Edit", "Write",
    "Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)",
    "Bash", "Glob", "Grep", "Task", "WebSearch"
  ]
}
```

スコープされた `Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)` エントリは素の `Bash` より前に置かれるため、フレームワーク自身のツール呼び出しは常により狭いルールに先にマッチします。

### 権限の仕組み

- **プロジェクト全体の上限**: `settings.json` の allow リストが利用可能なツールの最大集合
- **エージェントはデフォルトでセッションのフルツールセットを継承**する。唯一の出荷制限は `disallowedTools: Task` で、ネストしたサブエージェントの生成をブロックする
- **オプションのエージェントごとの絞り込み**: エージェントはフロントマターに `tools:` の allowlist を追加することで絞り込める — 省略するとすべてを継承する。`tools:` を列挙すると、完全修飾の `mcp__<server>__<tool>` id も列挙しない限り、継承した MCP ツールが除外される

### 権限の拡張

追加の機能を必要とするカスタムステージを作成する場合のみ、allow リストにツールを追加します。

### 権限の絞り込み

allow リストからツールを削除すると、使用ごとに手動承認が必要になります。`Task` を削除すると、サブエージェントステージ(2.1 Reverse Engineering、3.5 Code Generation)が委譲のたびに権限を求めることに注意してください。Workspace detection(0.2)は `amadeus-utility init` 内で決定論的に実行されます — `Task` は使いません。

---

## AI-DLC の拡張

上記の設定、スコープ、深度、ステージ編集は、あなたが実行するワークフローの日々のチューニングをカバーします。チームのためにフレームワーク自体を再形成したいとき — ステージの追加、エージェントの追加、スコープの定義、常設ルールの教示、決定論的チェックの結線、ドメイン知識の追加 — それは独自のガイドを持つ別の仕事です: **[ハーネスエンジニアガイド](../harness-engineering/00-overview.ja.md)**。

境界線はデータかコードかです。そのガイドのすべては、フレームワークが読む YAML フロントマター付きの Markdown ファイルまたは JSON 設定です — TypeScript の編集はありません。各拡張の行き先:

| やりたいこと | 開始点 |
|--------------|----------|
| ステージの動作を編集、または新しいステージを追加 | [ステージの構造](../harness-engineering/01-anatomy-of-a-stage.ja.md)、[ステージの追加](../harness-engineering/02-adding-a-stage.ja.md) |
| エージェントの追加または変更 | [エージェントの追加](../harness-engineering/03-adding-an-agent.ja.md) |
| スコープの定義またはチューニング | [スコープ](../harness-engineering/04-scopes.ja.md) |
| 常設ルールの教示、または学習ループの運用 | [ルールと学習ループ](../harness-engineering/05-rules-and-the-loop.ja.md) |
| ステージに決定論的チェック(センサー)を結線 | [センサー](../harness-engineering/06-sensors.ja.md) |
| チームのドメイン知識を追加 | [チーム知識](../harness-engineering/07-team-knowledge.ja.md) |

変更がフレームワークの*コード* — オーケストレーター、フック、CLI ツール、コンパイルパイプライン — に対するものである場合は、[Developer Reference](../reference/00-overview.ja.md) を参照してください。

---

## 知識とルール

2 層の知識システムとルール/学習ループシステムの詳細については、以下を参照してください。

- [Knowledge](08-knowledge.ja.md) — チーム知識ディレクトリと方法論リファレンスファイル
- [Rules and the Learning Loop](09-rules-and-the-learning-loop.ja.md) — 挙動ルールと自己学習フロー

---

## 次のステップ

- [スコープ、深度、テスト戦略](05-scopes-and-depth.ja.md) — スコープからステージへの完全なマッピング
- [Agents](06-agents.ja.md) — エージェントの権限と機能
- [Troubleshooting](15-troubleshooting.ja.md) — ステータスラインの問題、フック設定
- [Glossary](glossary.ja.md) — スコープ、深度、ガードレール、知識の定義
