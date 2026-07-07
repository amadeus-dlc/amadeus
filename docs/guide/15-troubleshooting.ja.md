# トラブルシューティング

この章では、よくある問題とその解決策を症状別に整理して扱います。

> **ハーネスに関する注記。** 以下の症状と修正は **Claude Code**(フック
> ファイル名、`settings.json` ブロック、コンパクションの挙動)向けに書かれています。決定論的なコア
> — 状態、監査、エンジン — はすべてのハーネスで同一に振る舞いますが、
> シェルレベルの表層は異なります。Kiro と Codex はフックと設定を独自の方法で結線します
> ([他のハーネスでの実行](harnesses/README.ja.md) を参照)。修正が
> `.claude/` パスや Claude のメカニズムを名指す場合、同等のものはあなたのハーネスの
> 設定ディレクトリに存在します。

---

## クイックフィックス表

| 症状 | クイックフィックス |
|---------|-----------|
| 監査エントリが表示されない | `bun` がインストールされ PATH 上にあるか確認 |
| 状態ファイルが破損 | `/amadeus --doctor` を実行し、状態テンプレートと比較 |
| 承認ゲートで止まっている | 回答を入力する。`/amadeus --stage <target>` で先へジャンプ |
| セッション途中でコンテキストがコンパクトされた | `/amadeus` を実行してチェックポイントから再開 |
| 監査ログが大きすぎる | `audit-YYYY-MM.md` にリネーム。新しいものが自動的に作成される |
| フックがハングしているように見える | システム temp ディレクトリから古いロックディレクトリを削除(下記参照) |
| ステータスラインが "ready" を表示 | `amadeus-state.md` に `**Lifecycle Phase**` フィールドがあるか確認 |
| ステータスラインが表示されない | `bun` が PATH 上にあり、`settings.json` の `statusLine.command` が `amadeus-statusline.ts` を参照するか確認 |
| サブエージェントがタイムアウト | `/amadeus` を実行して再試行、またはステージをインラインで実行 |

---

## フックが発火しない

**症状**: ファイル書き込み後に intent の `audit/` シャードにエントリが表示されない、またはサブエージェント完了ログがない。

### `bun` がインストールされていないか PATH 上にない

11 個すべての TypeScript フック(`amadeus-mint-presence.ts`、`amadeus-audit-logger.ts`、`amadeus-sensor-fire.ts`、`amadeus-runtime-compile.ts`、`amadeus-log-subagent.ts`、`amadeus-stop.ts`、`amadeus-validate-state.ts`、`amadeus-sync-statusline.ts`、`amadeus-session-start.ts`、`amadeus-session-end.ts`、`amadeus-statusline.ts`)は `bun` を必要とします。非インタラクティブシェルで `bun` が欠落しているか PATH 上にない場合、これらのフックは発火しません。

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows
npm install -g bun
# または: powershell -c "irm bun.sh/install.ps1 | iex"

# 確認
bun --version
```

`bun` が `~/.zshenv`(zsh)、`~/.bashrc`(bash / Windows の Git Bash)の PATH 上にあることを確認してください — `~/.zshrc` だけでは不十分です。ネイティブの Windows PowerShell では、`npm install -g bun` が設定するシステム PATH エントリで十分です。

### フックが設定されていない

フックは `.claude/settings.json` でプロジェクト全体に登録されます(v0.6.0 以降。それ以前のバージョンではワークフロースパインのフックを SKILL.md のフロントマターで宣言していました)。`settings.json` に `PostToolUse`、`PreCompact`、`SubagentStop`、`Stop` エントリ(および `SessionStart`/`SessionEnd`)を含む `hooks` ブロックがあることを確認してください。これらを移動したアップグレードを取り込み、ディスク上の `settings.json` がそれより古い場合は、出荷される `settings.json` の hooks ブロックを再コピーしてください。

---

## 状態ファイルの問題

**症状**: オーケストレーターが状態の破損を報告する、またはワークフローが予期しない動作をする。

### 状態ファイルが欠落

状態ファイルは Initialization 中、または `/amadeus` にスコープが提供されたときに作成されます。

- `/amadeus --status` を実行してアクティブなワークフローがないことを確認
- `/amadeus` または `/amadeus <scope>` を実行して新しいワークフローを開始

### 状態ファイルが破損

`validate-state.ts` フックは、コンパクションのたびに 2 つの必須セクション `## Stage Progress` と `## Current Status` をチェックします。手動で修復するには:

1. アクティブな intent の `amadeus-state.md`(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` 配下)を開く
2. これらのセクションが存在することを確認: Project Information、Scope Configuration、Workspace State、Stage Progress、Current Status、Session Resume Point
3. `.claude/knowledge/amadeus-shared/state-template.md` のテンプレートと比較する
4. `audit/` シャードの履歴から値を埋めて、欠落したセクションをテンプレートから復元する

---

## サブエージェントのタイムアウト

**症状**: サブエージェントステージ(Workspace Detection、Reverse Engineering、Code Generation)がエラーまたは切り詰められた出力を返す。

### 何が起きるか

フレームワークは組み込みのリトライプロトコルに従います。

1. **コンテキストを削減したプロンプトで自動リトライ**
2. **リトライが失敗した場合**、2 つのオプション:
   - **インラインで実行** — メイン会話で直接ステージを実行(サブエージェント境界なし)
   - **スキップして後で戻る** — ステージを未完了とマークし、後で戻る

### 手動リカバリ

`/amadeus` を再実行します — `[-]`(進行中)状態を検出し、ステージの再開またはやり直しを提供します。何が失敗したかを理解するには `audit/` シャードのエラーエントリを確認します。

---

## 承認ゲートで止まっている

**症状**: ワークフローが承認ゲートであなたの応答を待っている。

### 進め方

プロンプトが出たら応答を入力します。オプションは以下です。

- **Approve** — 次のステージへ続行
- **Request Changes** — 修正のためのフィードバックを提供

### 修正ループの脱出ハッチ

同じステージで 3 回の修正サイクルの後、3 つ目のオプション **Accept as-is** が表示されます。これは現在のバージョンをアーカイブして先へ進みます。

### ステージのスキップ

`/amadeus --stage <target>` を使って別のステージへジャンプします。間のステージは状態ファイルで `[S]`(スキップ)にマークされます。

---

## コンテキストコンパクション

**症状**: Claude Code がそれ以前の会話コンテキストを要約した。セッションが最近の議論を「忘れた」ように感じるかもしれない。

### 保持されるもの

すべてのレコードディレクトリ成果物、`amadeus-state.md`、`audit/` シャード、`.amadeus-recovery.md` はディスク上に残ります。失われるのはインメモリの会話コンテキストと、まだファイルに書き込まれていない進行中の途中作業だけです。

### リカバリ方法

コンパクション後に `/amadeus` を実行します。フレームワークは:

1. `amadeus-state.md` を読んでワークフローの位置をロード
2. `.amadeus-recovery.md` を状態ファイルと比較 — 異なる場合は警告
3. 4 つの再開オプションを提供

リカバリのブレッドクラムが不一致を警告する場合は、**現在のステージをやり直す**を選び、コンパクション中に進行していたステージを安全に再実行します。

---

## 監査ログが大きくなりすぎる

**症状**: このクローンの監査シャードが長いプロジェクトにわたって数千行に成長した。

### アーカイブ方法

```bash
# intent のレコードディレクトリから。<host>-<clone>.md はこのクローンのシャード
mv audit/<host>-<clone>.md audit-archive/<host>-<clone>-2026-02.md
```

次の `/amadeus` 呼び出し(または任意のフックトリガーの書き込み)が新しいシャードを作成します。すべての監査コンテンツはアーカイブしても安全です — エンジンはルーティング決定のために `audit/` シャードを読みません。

### Git に関する考慮事項

`audit/` シャードはコミットされます(gitignore されません)— [コミットするものと Gitignore するもの](14-artifacts-reference.ja.md#what-to-commit-vs-gitignore) を参照してください。各クローンは独自の `<host>-<clone>.md` シャードを書くため、同時追記が決してマージ衝突しません。diff を扱いやすく保つため、コミット前にアーカイブ(上記参照)を検討してください。

---

## ロックファイルが残る

**症状**: フックが短時間ハングして見えた後スキップする。以降の監査エントリが書き込まれない。

監査フックは同時書き込みを防ぐため `mkdir` ベースのロック(`lib.ts` 経由)を使います。フックが中断されると、ロックディレクトリが残ることがあります。ロックファイルはシステム temp ディレクトリ(`os.tmpdir()` — macOS/Linux では通常 `/tmp/`、Windows では `%TEMP%`)に作成されます。

### 古いロックの検出

```bash
# macOS / Linux
ls -la /tmp/.amadeus-*

# Windows (PowerShell)
Get-ChildItem $env:TEMP -Filter ".amadeus-*"
```

ロックディレクトリはシステム temp ディレクトリ内で `.amadeus-audit-<hash>.lock` および `.amadeus-subagent-<hash>.lock` と命名されます。

### 古いロックのクリア

```bash
# macOS / Linux
rm -rf /tmp/.amadeus-audit-*.lock /tmp/.amadeus-subagent-*.lock

# Windows (PowerShell)
Remove-Item "$env:TEMP\.amadeus-audit-*.lock", "$env:TEMP\.amadeus-subagent-*.lock" -Recurse -Force
```

AI-DLC ワークフローがアクティブに実行されていないときはいつでも安全に実行できます。ロックは一時的なもので、各フック呼び出しで再作成されます。

---

## ステータスラインの問題

### ワークフローがアクティブなのに "ready" を表示

ステータスラインは `amadeus-state.md` から `**Lifecycle Phase**` フィールドを読みます。そのフィールドが欠落または空の場合、`[AIDLC] ready` にフォールバックします。

**修正:** `/amadeus --doctor` を実行して状態ファイルの整合性をチェックします。`## Current Status` セクションに `**Lifecycle Phase**` エントリが含まれることを確認します。

### 古いデータを表示

想定された挙動です — ステータスラインは状態ファイルが次に書き込まれるとき、通常はステージ遷移時に更新されます。

### まったく表示されない

1. `bun` が PATH 上にない — ステータスラインは `bun .claude/hooks/amadeus-statusline.ts` として呼び出される
2. `settings.json` ブロックが欠落 — `statusLine` 設定が存在することを確認
3. 状態ファイルがない — ワークフローがアクティブでないとき、ステータスラインは正しく `[AIDLC] ready` を表示する

---

## `--doctor` の使用

`--doctor` ユーティリティコマンドはセットアップを検証します。何かおかしいと思ったらいつでも実行してください。

```
/amadeus --doctor
```

以下をチェックします。前提条件(`bun`)、フックの利用可能性(`settings.json` が結線するすべてのフック — 11 個すべてのフレームワークフック — が `.claude/hooks/` に存在する必要があり、結線されているが欠落しているフックは明確に失敗する)、プロジェクト構造(`settings.json`)、ワークスペースシェルの準備状態(`.claude/` + `amadeus/spaces/default/memory/`)、状態/監査の一貫性、フックのハートビート、グラフの整合性(サイクルなし、すべてのグラフエントリがファイルを持つ)、9 つすべてのスコープにわたるスコープ検証、ステージスキーマ + グラフ参照、スコープ間のキーワード重複。また、常にパスする 2 つのアドバイザリ行(終了コードを決して変えない)も表面化します。**Rule drift**(populate された org ポリシー見出しと重なるチーム/プロジェクトルール。矛盾レビュー用にフラグ付け)と **Paired sensor coverage**(`pairing:` を持ち、その名指しセンサーがステージに解決するルール)です。完全にパスすると 0、いずれかが失敗すると 1 で終了します。どちらの場合もレポートは stdout に書き出されます。`--doctor` は**読み取り専用**です。intent がまだない新しいシェルでは何も作成しません — 最初の intent が生成される前に安全に実行でき、何かおかしいと思ったときに最初に試すべきものです。intent が存在すると `HEALTH_CHECKED`(および `GUARDRAIL_LOADED`)監査行を記録します。

各チェックが検証する内容と失敗の修正方法の完全な詳細については、[CLI Commands](12-cli-commands.ja.md#amadeus---doctor--health-check) を参照してください。

---

## 次のステップ

- [State Tracking and Audit Trail](10-state-and-audit.ja.md) — 状態ファイルの構造
- [Session Management](11-session-management.ja.md) — コンパクション後の再開オプション
- [CLI Commands](12-cli-commands.ja.md) — `--doctor`、`--status`、`--stage` の使い方
- [Glossary](glossary.ja.md) — コンパクション、リカバリのブレッドクラム、フックの定義
