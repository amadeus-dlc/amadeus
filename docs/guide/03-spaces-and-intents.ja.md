# Spaces and Intents

[Your First Workflow](02-your-first-workflow.md) では、1 回の実行を最初から最後まで順に見てきました。しかし実際の作業が一度に 1 つだけということはめったにありません: 進行中の機能があり、緊急のバグが飛び込み、2 つ目のチームがリポジトリを共有します。この章では、AI-DLC が **1 つの** 場所 — *ワークスペース* — で **多数の** 作業をどう整理するか、そしてそれをナビゲートするために使う 2 つの概念、**スペース** と **intent** を説明します。

手短に言うと: **intent** は 1 つの作業(ライフサイクルの 1 回の実行)であり、**スペース** は 1 つのチームの intent・知識・プラクティスの世界です。ほとんどの人は単一のスペース(`default` と呼ばれる)で作業し、スペースについてまったく意識しません — ただ intent を開始し、それらの間を切り替えるだけです。この章の残りでは、それがどう機能し、すべてがどこに置かれるかを示します。

---

## 1 つのワークスペース、作業対象で整理される

AI-DLC をインストールすると、そのエンジンをプロジェクトへコピーします — ハーネス固有の単一ディレクトリ(Claude Code では `.claude/`、Kiro では `.kiro/`、Codex では `.codex/`)です。そのディレクトリが、レイアウトのうち *唯一* ハーネスによって異なる部分です。それ以降、AI-DLC が生成するすべては、プロジェクトルートの 1 つの中立な `amadeus/` ディレクトリ配下に置かれます — たまたま実行するハーネスではなく、*何に取り組んでいるか* で整理されます。あなたは `amadeus/` を閲覧します。エンジンディレクトリを開く必要は決してありません。

以下は、2 つのチームと進行中のいくつかの intent を持つ完全なワークスペースです(エンジンディレクトリは `.claude/` として示していますが、それらのハーネスでは `.kiro/` または `.codex/` と読み替えてください)。上から下まで読んでください — これが、この章の残りが土台とするメンタルモデルです:

```
my-project/
│
├── .claude/                      THE ENGINE — tools, hooks, skills, agents.
│                                 (or .kiro/ / .codex/ — the one harness-specific dir)
│                                 You never browse this; it just runs /amadeus.
│
├── amadeus/                        EVERYTHING AI-DLC — neutral, browsable, committed to git
│   ├── active-space              ← cursor: which space you're in (gitignored, per-user)
│   └── spaces/
│       ├── default/              ★ the only space most people ever see
│       │   ├── memory/           THE METHOD — how this team works (committed)
│       │   │   ├── org.md          framework defaults
│       │   │   ├── team.md         your team's practices  (overrides org)
│       │   │   ├── project.md      project-specific practices (overrides team)
│       │   │   ├── phases/         phase-scoped rules
│       │   │   └── templates/      your output-format overrides, one per artifact
│       │   │
│       │   ├── knowledge/        DOMAIN KNOWLEDGE — standards an agent reads (committed)
│       │   │                       free-form; empty until you add files
│       │   ├── codekb/           CODE KNOWLEDGE — what each repo is (committed, per-repo)
│       │   │   └── <repo>/          architecture, component inventory, freshness marker
│       │   │
│       │   └── intents/          THE RECORD — one subdir per piece of work
│       │       ├── active-intent   ← cursor: which intent is current (gitignored)
│       │       ├── intents.json    the registry: every intent + its scope/repos/status
│       │       ├── 260620-inventory-api/        ✓ a completed intent
│       │       └── 260624-export-bug/           ◷ an in-flight intent
│       │           ├── amadeus-state.md             where this intent is in the lifecycle
│       │           ├── audit/                     the decision trail
│       │           └── inception/requirements-analysis/requirements.md   …artifacts
│       │
│       └── payments-team/        another SPACE (another team) — identical shape
│           └── memory/  knowledge/  codekb/  intents/
│
├── repo-a/                       YOUR CODE REPOS live as siblings (each its own git)
└── repo-b/                       an intent can span more than one
```

そのツリーから取り出す価値のあることが 3 つあります。これらがアイデアのすべてだからです:

- **`amadeus/spaces/<space>/`** は、1 つのチームの自己完結した世界です: そのメソッド(`memory/`)、その知識、そのコード知識、そしてすべての intent の記録。`spaces/default/` は無料で手に入り、ソロ開発者や単一チームであれば、それより先を見ることは決してありません。
- **`intents/<YYMMDD>-<label>/`** は 1 つの作業です — [Your First Workflow](02-your-first-workflow.md) が埋めていった、実行ごとの記録です。`<YYMMDD>` はコンパクトな UTC 日付なので記録が時系列でソートされ、`<label>` は短く人間可読な名前です。同一性そのものはディレクトリ名ではなくレジストリ内の UUIDv7 が持つため、同じ日・同じラベルの 2 つの intent も区別されたままです。
- **2 つのカーソル** — `active-space` と `active-intent` — は *今どこにいるか* を記録します。これらは per-user(gitignored)なので、2 人のチームメイトが共有ファイルを取り合うことなく、同時に異なる intent の中に座れます。

> **古いバージョンからのアップグレード?** 以前のリリースは、単一のワークフローをプロジェクトルートの 1 つのフラットなディレクトリに保持し、新しい実行がそれを上書きしていました。ワークスペースモデルは、上記の intent ごとのレコードディレクトリでそれを置き換えるため、1 つが別のものを潰すことなく、多数の作業を並べて保持できます。

---

## Intent — 作業ごとに 1 つ

**intent** は、AI-DLC ライフサイクルの単一の実行であり、1 つのタスクにスコープされます。すべての intent は、スペースの `intents.json` レジストリに 1 行 — `{uuid, slug, dirName, scope, repos, status}` — を持ち、その実行の状態・監査証跡・成果物を保持する **レコードディレクトリ** を持ちます。`uuid`(UUIDv7)は正典的で衝突しない同一性であり、`dirName` は人間可読なレコードディレクトリ名をそのまま記録します。

特別なコマンドで intent を作成することは決してありません。初めて作業を記述したとき、エンジンがあなたのために intent を **auto-birth** させます:

```
/amadeus Build a REST API for inventory management
```

新しいワークスペースでは、これが intent を発行し、そのレコードディレクトリを `amadeus/spaces/default/intents/260624-inventory-api/` に作成し、それをアクティブな intent にして、最初のステージを開始します — まさに前の章で見た実行です。

### 2 つ目の作業を開始する

ここでワークスペースがその真価を発揮します。機能の途中で、無関係なバグに対応が必要になったとしましょう。何もアーカイブせず、init コマンドも実行しません — 新しい作業を記述するだけです:

```
/amadeus Fix the timeout on the export endpoint
```

すでに intent がアクティブなとき、AI-DLC はこれが現在の機能の続きではなく *新しい無関係な* 作業だと認識し、最初のものと並べて 2 つ目の intent を開始することを **提案** します:

```
▸ This looks like new work, separate from "inventory-api". Start a second intent?
  (1) Yes — start a second intent (scope: bugfix)
  (2) No — this continues the inventory-api work
```

- **Yes** を選ぶと、AI-DLC は 2 つ目の intent(ここでは `bugfix`)を誕生させ、それに切り替え、最初のステージを開始します。あなたの inventory-api の intent は手つかずです — そのレコードディレクトリ、状態、進捗はすべて、あなたが離れた場所に正確に保存されています。
- **No** を選ぶと、AI-DLC はあなたのメッセージをアクティブな intent の一部として扱います。

AI-DLC は尋ねずに 2 つ目の intent を誕生させることは決してありません。プロンプトが本当に現在の作業のフォローアップ — ゲートへの回答、要求の訂正 — であれば、それはアクティブな intent にとどまります。提案は、作業が明らかに別物であるときにのみ現れます。

### intent 間の切り替え

スペース内の intent を一覧し、名前(その slug)で 1 つに切り替えます:

```
/amadeus intent                     List all intents in the active space
/amadeus intent export-bug          Switch the active intent to "export-bug"
```

切り替えは `active-intent` カーソルを移動させます。次の `/amadeus` は、その intent を止まった場所ちょうどから再開します — 同じステージ、同じ状態、同じ監査証跡。任意の数の intent を同時に抱え、それらの間を自由に移動できます。それぞれが独立した実行です。

> 裸の `/amadeus intent` は読み取り専用です — 一覧するだけです。機械可読な出力には `--json` を追加します。完全なフラグリファレンスは [CLI Commands](12-cli-commands.md) を参照してください。

---

## Space — チームごとに 1 つ

**スペース** は、1 つのチームの完全な世界です: 独自の `memory/`(メソッド)、`knowledge/`、`codekb/`、`intents/`。この章でこれまで起きたことはすべて、自動的に作成される `default` という名前の単一のスペースの中で起きました。**あなたがソロ開発者または単一チームであれば、これで話はおしまいです — スペースに名前を付けることは決してなく、すべてがただ機能します。**

スペースは、**複数のチームが 1 つのプロジェクトを共有** し、それぞれが衝突せずに独自のメソッド・知識・記録を望むケースのために存在します。チームの追加は純粋に加算的です: 同一の形をした新しい `spaces/<name>/` が `default/` の隣に現れます — 何も移動せず、何も移行しません。

intent の動詞を正確に反映する動詞で、スペースを作成・一覧・切り替えします:

```
/amadeus space                      List all spaces
/amadeus space-create payments-team Create a new space, seeded from the framework baseline
/amadeus space payments-team        Switch the active space to "payments-team"
```

新しく作成されたスペースは、フレームワークのデフォルトメソッド(`org.md`)と、新鮮で空の `team.md` / `project.md` プラクティスファイルから始まります — 新しいチームは、別のチームのプラクティスを継承するのではなく、自分自身のプラクティスを獲得します。その `knowledge/` と `codekb/` も空で始まります。

スペースを切り替えると、2 つのものが自動的にカーソルに追従します:

1. **AI-DLC 自身のリゾルバ** — 次に開始する intent、そしてエージェントがロードするプラクティスと知識は、すべて切り替え先のスペースから来ます。
2. **ハーネスがコンテキストにロードするルール** — 切り替えは、ハーネスのネイティブなルールインクルード(Claude の `@`-import、Kiro の resources glob、Codex の rules dir)を新しいスペースの `memory/` に再ポイントするため、次のターンはそのチームのメソッドの下で動作します。

`default` では、この再ポイントは no-op です。だからこそ、単一チームのワークスペースは、コミット済みファイルを一切かき乱しません。

### どのスペースにいるかを知る

複数のスペースが存在するとき、ステータスラインはアクティブな `space · intent` を、恒久的な「あなたはここにいます」として表示します — シェルプロンプトが現在のディレクトリを表示するのと同じように — ので、作業が間違ったスペースに着地することはありません。`default` しか持たない単一チームのユーザーには、スペーストークンはまったく表示されません。

---

## 1 つの intent に複数のリポジトリ

intent は単一のリポジトリに限定されません。あなたのコードリポジトリはワークスペースの兄弟であり(そのどれか 1 つの内側にネストされていない)、intent は必要なだけ多くにまたがることができます。

リポジトリの集合は **intent が誕生するときに** 捕捉されます — 追加で何もタイプしません。デフォルトでは AI-DLC は、すべての兄弟リポジトリ(ワークスペースルートの各直下の子で、独自の `.git` を持つもの)を自動発見し、その集合を intent の `intents.json` の行に記録します。Construction 中、各 git 操作はその後、正しいリポジトリに自動的にアンカーされます。

```
my-project/
├── amadeus/          # the workspace
├── checkout-api/   # repo-a   ┐ both auto-discovered as siblings;
└── checkout-web/   # repo-b   ┘ an intent here can touch either or both
```

リポジトリを記録しない intent は、通常の単一リポジトリのケースです。レコードディレクトリの詳細は [Artifacts Reference](14-artifacts-reference.md) を、用語集の [Multi-repo intent](glossary.md) を参照してください。

---

## コミットされるものとされないもの

`amadeus/` は git にチェックインされるため、チームがその作業を **共有** します — メソッド、intent レジストリ、各 intent の状態、監査証跡、成果物はすべてリポジトリとともに移動します。2 種類のファイルは、代わりに意図的に **gitignore** されます:

| Gitignore されるもの(per-user、machine-local) | 理由 |
|---|---|
| `amadeus/active-space`, `…/intents/active-intent` | カーソル — 「今どこにいるか」。コミットすると `/amadeus` のたびにツリーが汚れ、切り替えのたびにチームメイトがカーソルを取り合うことになる。 |
| `…/intents/<id>/runtime-graph.json`, `.amadeus-*`, `amadeus/.amadeus-sessions/` | 派生した machine-local なランタイム状態。 |

スペース配下のそれ以外すべて — `memory/**`、`knowledge/**`、`codekb/**`、`intents.json`、各記録の `amadeus-state.md`、`audit/` シャード、成果物 — はコミットされます。経験則: **カーソルとランタイムのスクラッチはローカル、共有される作業はコミットする。**

---

## 次のステップ

- [Phases and Stages](04-phases-and-stages.md) — 1 つの intent の実行の中で何が起きるか
- [Knowledge](08-knowledge.md) — チームの標準をスペースの `knowledge/` に追加する
- [Rules and the Learning Loop](09-rules-and-the-learning-loop.md) — スペースの `memory/` メソッドがどう著述され、学習されるか
- [Artifacts Reference](14-artifacts-reference.md) — intent ごとのレコードディレクトリの詳細
- [CLI Commands](12-cli-commands.md) — 完全な `space` / `intent` 動詞リファレンス
- [Glossary](glossary.md) — Space、Intent、Record dir、Multi-repo intent の定義
