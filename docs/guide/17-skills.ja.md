# スキルとランナーコマンド

> 言語: [English](17-skills.md) | **日本語**

**AI-DLC はコマンドのファミリーです。** `/amadeus` オーケストレーターに加えて、
タイプ可能な 1 単語のランナーコマンド群が手に入ります: スコープごとに 1 つ、
ステージごとに 1 つ、そしてセットアップ用に 1 つ。これらはオーケストレーターが
すでに公開しているスライスへの便利な入口なので、`/amadeus` 単体からフレームワーク
全体に到達することも、フラグを飛ばして欲しい入口を直接タイプすることもできます。

> **ハーネスに関する注記。** この章は Claude Code のサーフェスを使います —
> `.claude/skills/` 配下のスキルで、ピッカーから先頭に `/` を付けてタイプします。
> Kiro は同じランナーセットを `.kiro/skills/` 配下に同梱します(こちらも `/` で
> タイプ)。Codex はそれらを `.agents/skills/` に同梱し、`$`(`$amadeus-bugfix`)で
> タイプします。ランナーの *セット* と各々の動作はハーネス間で同一です — 異なるのは
> ディレクトリと接頭辞だけです。[他のハーネスで実行する](harnesses/README.ja.md) を参照。

---

## 多くのスキル、1 つのエンジン

この実装が同梱するすべてのコマンドは `.claude/skills/` 配下のスキルです。それらは
すべて同じ決定論的エンジンを駆動します — 異なるのは、開始前に何をベイクインするか
だけです:

- **`/amadeus`** — フルのオーケストレーター。フラグはベイクインされません。スコープを
  検出(または欲しいものを説明)し、スコープ内のすべてのステージを完了まで駆動します。
  最もよく使うものです。
- **スコープランナー** — `/amadeus-bugfix`、`/amadeus-feature`、`/amadeus-mvp`、
  `/amadeus-security-patch`。同じフルワークフローで、スコープが固定され、スコープ検出が
  スキップされます。
- **ステージランナー** — `/amadeus-application-design`、`/amadeus-code-generation`
  ほか 27 個。1 つのステージを単独で実行し、メインワークフローには触れません。
- **`/amadeus-init`** — 最初の intent を誕生させる(Initialization フェーズ全体を実行)
  ことを 1 ステップで行う。エンジンの auto-birth に対するオプトインのパッケージング。
- **セッションスキル** — `/amadeus-session-cost`、`/amadeus-replay`、
  `/amadeus-outcomes-pack`、`/amadeus-grilling`。任意の時点で使える読み取り専用スキル。
  最初の 3 つは [セッション管理](11-session-management.ja.md) で扱うワークフロービューで、
  `/amadeus-grilling` は独立した grilling インタビューです([インタラクションモード](07-interaction-modes.ja.md) を参照)。

ランナーが行うことはすべてフラグ付きの `/amadeus` から到達可能です。ランナーは
パッケージングです — `/amadeus-bugfix` とタイプして `/` メニューに現れるのは良い
エルゴノミクスであり、それ以上ではありません。すべてのランナーを削除すればショート
カットは消えますが、能力は残り、`/amadeus` のフラグを通じて到達可能です。

---

## スコープランナー — 問題クラスごとの名前付き入口

スコープランナーは、1 つのスコープを固定してフルワークフローを駆動します。どんな
種類の作業をしているかすでに分かっていて、スコープ検出をスキップしたいときに使います。

```
/amadeus-bugfix          特定のバグを修正 — minimal depth、合理化されたパス
/amadeus-feature         新機能を構築 — standard depth、全ステージ
/amadeus-mvp             コアを出荷 — 後半の operations ステージをスキップ
/amadeus-security-patch  CVE / 脆弱性対応
```

各々はオーケストレーターに `--scope` を渡すのと同一です:

```
/amadeus-bugfix          ==  /amadeus --scope bugfix
/amadeus-feature         ==  /amadeus --scope feature
```

`/amadeus` に対するのと全く同じように、説明とフラグをそのまま通せます:

```
/amadeus-bugfix The profile API returns 500 when display_name is null
/amadeus-feature --status
```

**ランナーを同梱するのは 4 つのスコープだけ** — トラフィックの多いものです。
フレームワークは合計 10 個のスコープを定義しています([スコープ、深さ、テスト戦略](05-scopes-and-depth.ja.md) を参照)。
他のすべて — `chore`、`enterprise`、`infra`、`poc`、`refactor`、`workshop` — は常に
オーケストレーター経由で到達可能です:

```
/amadeus --scope enterprise
/amadeus --scope poc
```

ワークフローが一度開始すると、そのスコープは `amadeus-state.md` に固定されるため、
同じランナーを再実行すると、再スタートではなくワークフローを resume します。別の
スコープで実行するには `/amadeus --scope <name>` を使ってください。

---

## ステージランナー — 1 ステージだけ実行し、ワークフローには触れない

ステージランナーは **1 つのステージを単独で** 実行します。メインワークフローの
`Current Stage` を決して進めません。その分離はツール自体が強制します。

```
/amadeus-application-design
/amadeus-code-generation
/amadeus-requirements-analysis
/amadeus-reverse-engineering
```

各々は `/amadeus --stage <slug> --single` をパッケージングしたものです:

```
/amadeus-code-generation    ==  /amadeus --stage code-generation --single
```

### いつ使うか

- **ワークフローにコミットせずに方法論の 1 片を適用する。** ある問題に対して
  requirements analysis が欲しいが、ライフサイクル全体を駆動する準備はできていない。
  `/amadeus-requirements-analysis` を実行し、成果物を得て、止める。
- **あなたがオーケストレーターである。** 作業を手で順序付けていて、目の前の
  ステージだけをフレームワークに実行させたい — 人間が駆動し、フレームワークが
  方法論の 1 ステージを供給します。
- **ステージを単独で再実行する** — メインワークフローが別の地点でパークしている間に。
  単一ステージ実行はそれを乱すことができません。

### なぜ安全か

`--single` 不変条件はツールで強制されます。単一ステージ実行は、その作業を合成
ワークフロー id 配下に記録し、メインワークフローの `Current Stage` の書き込みを
拒否します。ランナーがメインポインタを進めようとすると、エンジンは代わりにエラーを
返します。エンジンがこれを保証するので、ドキュメントが間違っていても安全性は保たれます。

3 つのブートストラップ **initialization** ステージはステージランナーを同梱しません
— intent の半分を誕生させることには単独の意味がありません。代わりに initialization
フェーズ全体が 1 つのコマンドとしてパッケージングされています:

```
/amadeus-init [--scope <name>] [description]   最初の intent を誕生させる(== 新規ワークスペースで /amadeus を実行)
```

---

## ランナーファミリーの一覧

| ファミリー | 例 | 何をするか | オーケストレーター等価 |
|---|---|---|---|
| オーケストレーター | `/amadeus` | フルワークフロー、スコープ検出 | — |
| スコープランナー | `/amadeus-bugfix`、`/amadeus-feature`、`/amadeus-mvp`、`/amadeus-security-patch` | フルワークフロー、スコープ固定、検出なし | `/amadeus --scope <name>` |
| ステージランナー | `/amadeus-application-design`、`/amadeus-code-generation`、…(計 29) | 1 ステージを単独で、ワークフローを決して進めない | `/amadeus --stage <slug> --single` |
| Init ラッパー | `/amadeus-init` | 最初の intent を誕生させる(Initialization を実行) | 新規ワークスペースでの `/amadeus` |
| セッションビュー | `/amadeus-session-cost`、`/amadeus-replay`、`/amadeus-outcomes-pack` | 読み取り専用のワークフローレポート | [セッション管理](11-session-management.ja.md) を参照 |
| Grilling インタビュー | `/amadeus-grilling` | プランや設計についての読み取り専用の一問一答インタビュー | [インタラクションモード](07-interaction-modes.ja.md) を参照 |

ライフサイクル内の実行可能なステージごとにステージランナーが 1 つあります。全体の
セットを見るには、スキルディレクトリを一覧してください:

```bash
ls .claude/skills/
```

---

## 自分のランナーを作成する — ステージファイルを書く

フレームワークをカスタマイズしているなら重要な部分がここです: **ランナーは手で
書きません。** それらはコンパイル済みのステージグラフとスコープファイルから
生成されます。

ステージランナーを追加するには、ステージを追加します。ステージファイルを書き、
グラフを再コンパイルし、再生成します:

```bash
bun .claude/tools/amadeus-runner-gen.ts write
```

ジェネレーターはコンパイル済みのステージリスト(唯一のソースオブトゥルース)を読み、
実行可能なステージごとにランナーシェルを出力します。新しいステージの
`/amadeus-<your-stage>` コマンドが自動的に現れます — 作成すべきランナーファイルも、
コピーすべきボイラープレートもありません。スコープランナーも同じように動作します:
`.claude/scopes/` 配下にスコープファイルを置き、再生成すれば、ランナーが追随します。

```bash
bun .claude/tools/amadeus-runner-gen.ts scopes      # スコープランナーを生成
```

ランナーセットは手で保守されるのではなく導出されるため、それがカバーするステージや
スコープからドリフトすることはあり得ません。オンディスクのセットがソースオブ
トゥルースから乖離した瞬間に、2 つのチェックが CI で失敗します:

```bash
bun .claude/tools/amadeus-runner-gen.ts check            # ステージランナーのドリフト
bun .claude/tools/amadeus-runner-gen.ts scopes --check   # スコープランナーのドリフト
```

ランナーを再生成せずにグラフに追加されたステージ — あるいは消えたステージに対する
孤児ランナー — は diff を伴って大声で失敗します。ステージファイルを追加して再生成
することが作成パスのすべてです。ランナーはジェネレーターがあなたのために保守する
結果として追随します。

ステージファイルを書くメカニズムについては [カスタマイズ](13-customization.ja.md) と
[フェーズとステージ](04-phases-and-stages.ja.md) を参照。エンジン、ディレクティブ契約、
ランナーシェルが内部で `next`/`report` をどう駆動するかについては、リファレンス章の
[スキルシステム](../reference/17-skill-system.ja.md) を参照してください。

---

## クイックリファレンス

```
# フルワークフロー
/amadeus                              スコープを検出し、すべてを実行
/amadeus --scope enterprise           10 スコープのいずれか

# スコープランナー(トラフィックの多い 4 つの入口)
/amadeus-bugfix · /amadeus-feature · /amadeus-mvp · /amadeus-security-patch

# 1 ステージ、単独(ワークフローを決して進めない)
/amadeus-code-generation              == /amadeus --stage code-generation --single

# 最初の intent を誕生させる(Initialization フェーズ)
/amadeus-init [--scope <name>]        == 新規ワークスペースでの /amadeus

# 自分のものを追加: ステージ/スコープファイルを書き、次を実行
bun .claude/tools/amadeus-runner-gen.ts write
bun .claude/tools/amadeus-runner-gen.ts scopes
```

参照: [CLI コマンド](12-cli-commands.ja.md) · [スコープ、深さ、テスト戦略](05-scopes-and-depth.ja.md) · [カスタマイズ](13-customization.ja.md)
