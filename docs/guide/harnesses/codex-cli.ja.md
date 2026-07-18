# Codex CLI 上の AI-DLC

> 言語: [English](codex-cli.md) | **日本語**

`dist/codex/` は、OpenAI **Codex CLI** ハーネス向けの、フレームワークのハーネス
ディストリビューションの 1 つです。1 つの決定論的なコア、多数のハーネス:
エンジン、ステートマシン、監査ログ、グラフ、swarm レフェリー、learnings ゲートは
すべてのディストリビューションでバイト単位で同一であり、異なるのはシェルだけです。
このツリーは `bun scripts/package.ts codex` によって `core/` + `harness/codex/` から
**生成** されます。手編集しないでください(ドリフトガードが CI で失敗します)。

## 前提条件

- **Codex CLI ≥ 0.139.0** — これより古いリリースはサブエージェントのフック
  ペイロードで実際のエージェントロールを表面化せず、ハイフン付きエージェント TOML を
  解決しません。`/amadeus --doctor` がこのピンを強制します。`codex --version` で確認してください。
- **bun** — Claude ハーネスと同じ要件です。すべてのツールとフックは bun 経由で実行されます。
- **モデルプロバイダ** — Codex は通常設定されたプロバイダとモデルを使います。
  同梱のプロジェクト `config.toml.example` はどちらもピンしません。プロジェクトに
  まだ存在しない場合のみ、それを `.codex/config.toml` にコピーしてください。
  プロバイダ/モデルの選択は `~/.codex/config.toml` に置くか、チームがこのプロジェクトで
  特定のランタイムを強制したい場合は意図的にプロジェクトローカルの上書きを追加してください。

## インストール

1. ディストリビューションをプロジェクトにコピーします(プロジェクトは **git
   リポジトリ** でなければなりません — Codex はその中でのみプロジェクトの
   `.codex/hooks.json` を発見します):

   ```bash
   cp -r dist/codex/.codex/  your-project/.codex/
   cp -r dist/codex/.agents/ your-project/.agents/
   cp -r dist/codex/amadeus/   your-project/amadeus/      # ワークスペースシェル(spaces/default/memory) — .codex/ の兄弟であり、中ではない
   cp dist/codex/AGENTS.md   your-project/AGENTS.md   # または既存のものにマージ
   cp -n your-project/.codex/config.toml.example your-project/.codex/config.toml
   ```

   `amadeus/` ディレクトリはワークスペースシェルです — エンジンが読み込む
   事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリーを同梱します。
   これは `.codex/` の **兄弟** なので、別途コピーしてください(または
   `dist/codex/` ツリー全体を一度にコピー)。存在しない場合、`$amadeus --doctor` は
   その「workspace shell ready」チェックで失敗します。

2. 同梱の `dist/codex/.gitignore` の契約と、`AGENTS.md` の § 「Git Integration」
   にあるエントリを、ワークフロー開始 **前** に project の `.gitignore` へ
   マージしてください — 各 intent の `audit/` 配下の
   per-clone 監査シャードは意図的にコミットされます(各クローンが自身の
   `<host>-<clone>.md` を書くため、並行 append が git 競合しません)。一方、
   per-user カーソルとマシンローカルなランタイム状態は無視されたままにします。
   既存の `.gitignore` を置き換えず、内容をマージしてください。同梱の Codex 向け
   ignore 契約には `.codex/hooks.json` も含まれます。

   続いて、ローカルの hook file を活性化します。

   ```bash
   cd your-project
   bun .codex/tools/amadeus-codex-hooks.ts activate
   ```

   `.codex/hooks.json.example` は、生成して Git で追跡する Amadeus の canonical
   設定です。`.codex/hooks.json` は、agmsg などの Codex 連携が更新できる、
   gitignore されたクローンごとの active file です。活性化では active file が
   存在しないときだけ canonical の内容をコピーします。既存の active file は
   一切上書きせず、Amadeus の canonical hook 契約を満たしていなければ
   処理を止めます。Amadeus の self repository では、`./scripts/run-codex.sh` と
   `scripts/team-up.sh` が Codex の起動または agmsg writer の適用より先に、
   同じ活性化処理を実行します。

3. プロジェクトを trust します。Codex の trust は **2 層** あり、どちらも
   `$CODEX_HOME/config.toml` に事前シードする必要があります:

   - **第 1 層 — プロジェクト trust:** `trust_level = "trusted"` を持つ
     `[projects."<プロジェクトの絶対パス>"]` テーブル。これがゲートです。
     **第 1 層が無いと Codex はこのプロジェクトの `.codex` フック層全体を
     無警告でスキップし**、第 2 層はそもそも実行されません。
   - **第 2 層 — フック trust:** `[hooks.state."..."]` エントリ。Codex は
     untrusted なフックを決して実行しません(`--dangerously-bypass-hook-trust`
     フラグでも実行しません)。

   `scripts/team-up.sh` は各 Codex メンバーについて両層を自動でシードします。
   手動でシードする場合は、対話的な TUI セッションを 1 回実行して hooks
   ダイアログで「Trust all and continue」を選ぶか、決定論的に事前シードします:

   ```toml
   # 第 1 層 — プロジェクト trust(手で追記)
   [projects."/abs/path/to/your-project"]
   trust_level = "trusted"
   ```

   ```bash
   # 第 2 層 — フック trust(そのまま貼り付け可能な形で出力)
   bun scripts/package.ts codex trust --project /abs/path/to/your-project
   ```

   第 2 層のコマンドは `$CODEX_HOME/config.toml` 用の、そのまま貼り付け可能な
   `[hooks.state]` エントリを追記します(ハッシュはパスではなくフックの
   アイデンティティをカバーします — 出力されるエントリは同梱の
   `hooks.json.example` から作成した `hooks.json` に対して正確です)。
   `$amadeus --doctor` は第 1 層の存在を loud に検査し、第 2 層について
   リマインドします。

4. プロジェクトが意図的に Codex 設定を所有する場合のみ `.codex/config.toml` を
   プロジェクトレベルに保ちます。そうでなければプロバイダ/モデルの選択は
   `~/.codex/config.toml` に置いてください。次で検証します:

   ```bash
   bun .codex/tools/amadeus-utility.ts doctor
   ```

   doctor は両方の JSON を parse し、Amadeus adapter の command を
   `(event, matcher または null, type, command)` の multiset として比較します。
   Amadeus 以外の追加、key や配列の順序、空白、minify の違いは許容します。
   一方、file の不在・JSON 不正と、Amadeus tuple の欠落・誤配置・重複・obsolete
   は失敗になります。診断には不足または余剰の tuple だけを表示し、active JSON
   全文、ローカルの絶対パス、Amadeus 以外の command は出力しません。活性化後に
   2 層の trust を確認してください。活性化も doctor も trust の付与は行いません。

## 既存の Codex 導入を安全に更新する

Amadeus の self repository と、Codex 配布物を導入した consumer project では、
Git 上の所有者が異なります。該当する手順を 1 つだけ選んでください。どちらの場合も、
先に Codex session とすべての agmsg writer / monitor を停止し、実 monitor の
acceptance が終わるまで repository 外の backup を残します。

### Amadeus の self repository

この手順は、現在の revision が `.codex/hooks.json` をまだ追跡している Amadeus
source repository でのみ実行します。staged・unmerged・untracked・無関係な tracked
変更がない状態から始めてください。writer が変更した `.codex/hooks.json` だけは
worktree に残っていて構いません。修正版 revision を fetch し、その revision に
含まれる helper を repository 外へ取り出してから、外部 helper に検証付きの
fast-forward を実行させます。

```bash
set -euo pipefail
amadeus_assert_external_path() {
  bun -e '
    import { existsSync, realpathSync } from "node:fs";
    import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
    const canonical = (value) =>
      existsSync(value)
        ? realpathSync(value)
        : resolve(realpathSync(dirname(value)), basename(value));
    const candidate = canonical(process.argv[1]);
    for (const rootValue of process.argv.slice(2)) {
      const root = realpathSync(rootValue);
      const rel = relative(root, candidate);
      const inside =
        rel === "" ||
        (rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel));
      if (inside) {
        console.error("external path resolves inside a Git-owned directory: " + candidate);
        process.exit(1);
      }
    }
  ' -- "$1" "$AMADEUS_PROJECT_DIR" "$AMADEUS_GIT_COMMON_DIR"
}

AMADEUS_PROJECT_DIR="$(git rev-parse --show-toplevel)"
cd "$AMADEUS_PROJECT_DIR"
AMADEUS_GIT_COMMON_DIR="$(cd "$(git rev-parse --git-common-dir)" && pwd -P)"
AMADEUS_MIGRATION_SOURCE_REF="main"
git fetch --no-tags origin "$AMADEUS_MIGRATION_SOURCE_REF"
AMADEUS_MIGRATION_TARGET_REF="FETCH_HEAD"
AMADEUS_HELPER_DIR="$(mktemp -d)"
AMADEUS_HELPER_PATH="$AMADEUS_HELPER_DIR/amadeus-codex-hooks.ts"
AMADEUS_HELPER_CONTRACT_PATH="$AMADEUS_HELPER_DIR/amadeus-codex-hooks-contract.ts"
AMADEUS_HELPER_MIGRATION_PATH="$AMADEUS_HELPER_DIR/amadeus-codex-hooks-migration.ts"
amadeus_assert_external_path "$AMADEUS_HELPER_PATH"
amadeus_assert_external_path "$AMADEUS_HELPER_CONTRACT_PATH"
amadeus_assert_external_path "$AMADEUS_HELPER_MIGRATION_PATH"
git cat-file -e "$AMADEUS_MIGRATION_TARGET_REF:.codex/tools/amadeus-codex-hooks.ts"
git cat-file -e "$AMADEUS_MIGRATION_TARGET_REF:.codex/tools/amadeus-codex-hooks-contract.ts"
git cat-file -e "$AMADEUS_MIGRATION_TARGET_REF:.codex/tools/amadeus-codex-hooks-migration.ts"
git show "$AMADEUS_MIGRATION_TARGET_REF:.codex/tools/amadeus-codex-hooks.ts" \
  > "$AMADEUS_HELPER_PATH"
git show "$AMADEUS_MIGRATION_TARGET_REF:.codex/tools/amadeus-codex-hooks-contract.ts" \
  > "$AMADEUS_HELPER_CONTRACT_PATH"
git show "$AMADEUS_MIGRATION_TARGET_REF:.codex/tools/amadeus-codex-hooks-migration.ts" \
  > "$AMADEUS_HELPER_MIGRATION_PATH"
bun "$AMADEUS_HELPER_PATH" migrate-self \
  --target-ref "$AMADEUS_MIGRATION_TARGET_REF" \
  --project-dir "$AMADEUS_PROJECT_DIR"
```

修正が別の branch または tag にある場合だけ、`AMADEUS_MIGRATION_SOURCE_REF` を
変更してください。helper は active file を動かす前に、現在の revision が active
file を追跡していること、対象 revision が active file を追跡せず、canonical example
と helper を追跡し、active path を ignore すること、対象が fast-forward 可能で
あることを確認します。無関係な変更、staged、unmerged、untracked のいずれかが
あれば処理を始めません。active file を非公開の repository 外ディレクトリへ移し、
SHA-256 を照合した後、`git merge --ff-only` を実行して同じ内容を復元します。
復元した file と残した backup の SHA-256 が更新前と同じことに加え、unmerged path
が 0 件、stash list に増減がないこと、worktree が clean であること、doctor が
通ることまで確認します。成功時に表示される `Backup` と `SHA-256` を記録し、
backup は残してください。上の実行可能な preflight は 3 つすべての helper module
について symlink を解決し、いずれかの出力先が worktree または Git common
directory の内側なら、どの module も書き出す前に停止します。`git cat-file` の
確認により、展開開始前に対象 revision に module 一式が存在することも保証します。

コマンドで確認できる事後条件も検証します。

```bash
if git ls-files --error-unmatch -- .codex/hooks.json >/dev/null 2>&1; then
  echo "active hooks are still tracked" >&2
  exit 1
fi
git check-ignore --quiet -- .codex/hooks.json
git ls-files --error-unmatch -- .codex/hooks.json.example
git diff --name-only --diff-filter=U
git status --short
bun .codex/tools/amadeus-utility.ts doctor
```

`git diff` と `git status` は何も表示しないことが正常です。`git pull`、`git stash`、
更新前の `git rm --cached`、広い範囲を対象にする `checkout`・`reset`・`clean` で
置き換えないでください。変更済みの tracked file を ignored file へ移す今回の更新は、
これらの方法では安全に完了できません。

### Codex 配布物を使う consumer project

consumer project では、その project の所有者が Git index と commit を管理します。
staged・unmerged・untracked・無関係な tracked 変更がない状態から始めてください。
writer が変更した `.codex/hooks.json` だけは worktree に残っていて構いません。
active file を worktree と Git directory の両方から外れた場所へ backup し、
SHA-256 を記録してから package を更新します。次の関数は OS 固有の checksum
command を使わず、前提条件の Bun だけで SHA-256 を計算します。

```bash
set -euo pipefail
amadeus_hook_sha256() {
  bun -e 'import { createHash } from "node:crypto"; import { readFileSync } from "node:fs"; const file = process.argv[1]; console.log(createHash("sha256").update(readFileSync(file)).digest("hex"))' -- "$1"
}
amadeus_assert_external_path() {
  bun -e '
    import { existsSync, realpathSync } from "node:fs";
    import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
    const canonical = (value) =>
      existsSync(value)
        ? realpathSync(value)
        : resolve(realpathSync(dirname(value)), basename(value));
    const candidate = canonical(process.argv[1]);
    for (const rootValue of process.argv.slice(2)) {
      const root = realpathSync(rootValue);
      const rel = relative(root, candidate);
      const inside =
        rel === "" ||
        (rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel));
      if (inside) {
        console.error("external path resolves inside a Git-owned directory: " + candidate);
        process.exit(1);
      }
    }
  ' -- "$1" "$AMADEUS_PROJECT_DIR" "$AMADEUS_GIT_COMMON_DIR"
}

AMADEUS_PROJECT_DIR="$(git rev-parse --show-toplevel)"
cd "$AMADEUS_PROJECT_DIR"
AMADEUS_GIT_COMMON_DIR="$(cd "$(git rev-parse --git-common-dir)" && pwd -P)"
git status --short
while IFS= read -r AMADEUS_STATUS_LINE; do
  case "$AMADEUS_STATUS_LINE" in
    " M .codex/hooks.json") ;;
    *) echo "unrelated worktree change blocks migration: $AMADEUS_STATUS_LINE" >&2; exit 1 ;;
  esac
done < <(git status --porcelain=v1 --untracked-files=all)
AMADEUS_CONSUMER_BACKUP_DIR="$(mktemp -d)"
AMADEUS_CONSUMER_BACKUP_PATH="$AMADEUS_CONSUMER_BACKUP_DIR/hooks.json"
amadeus_assert_external_path "$AMADEUS_CONSUMER_BACKUP_PATH"
chmod 700 "$AMADEUS_CONSUMER_BACKUP_DIR"
cp .codex/hooks.json "$AMADEUS_CONSUMER_BACKUP_PATH"
chmod 600 "$AMADEUS_CONSUMER_BACKUP_PATH"
AMADEUS_ACTIVE_SHA_BEFORE="$(amadeus_hook_sha256 .codex/hooks.json)"
test "$(amadeus_hook_sha256 "$AMADEUS_CONSUMER_BACKUP_PATH")" = \
  "$AMADEUS_ACTIVE_SHA_BEFORE"

bunx @amadeus-dlc/setup upgrade --harness codex \
  --target "$AMADEUS_PROJECT_DIR" --yes

test "$(amadeus_hook_sha256 .codex/hooks.json)" = "$AMADEUS_ACTIVE_SHA_BEFORE"
git check-ignore --no-index --quiet -- .codex/hooks.json
git ls-files --error-unmatch -- .codex/hooks.json.example
test -f .codex/tools/amadeus-codex-hooks.ts
git rm --cached -- .codex/hooks.json
git add -- .agents .codex .gitignore AGENTS.md amadeus
git diff --cached --stat
git commit -m "chore: adopt local Codex hooks ownership"
```

最初の `git status --short` は何も表示しないか、unstaged の
`.codex/hooks.json` だけを表示します。それ以外の変更があると、後続の loop が
処理を止めます。実行可能な preflight は symlink を解決し、backup path が worktree
または Git common directory の内側なら、`cp` より前に停止します。package 更新は
active file の内容を保ったまま、canonical example、ignore rule、helper を追加しなければ
なりません。明示した `git add` の pathspec は、Codex package が所有する 5 つの root
だけを対象にし、project のほかの場所にある変更を stage しません。commit 前に
staged diff を確認してください。更新前に無関係な変更がなく、active file は更新後に
ignore されるため、この commit には確認済みの package 更新と consumer 自身が行った
index deletion だけがまとまります。

この実行例には POSIX 互換 shell が必要です。POSIX filesystem では、backup directory の
`chmod 700` と file の `chmod 600` がアクセス制限として保証されます。native Windows
では Git Bash からだけ実行してください。Git Bash で手順自体は実行できますが、
`chmod` は NTFS 上で同等の Windows ACL 分離を設定しません。copy 前に、現在の
Windows account だけがアクセスできる場所へ一時 directory を配置し、その ACL を
確認してください。Windows では `0700` / `0600` の保証を主張できません。

commit 後に所有境界と内容を検証します。

```bash
test "$(amadeus_hook_sha256 .codex/hooks.json)" = "$AMADEUS_ACTIVE_SHA_BEFORE"
test "$(amadeus_hook_sha256 "$AMADEUS_CONSUMER_BACKUP_PATH")" = \
  "$AMADEUS_ACTIVE_SHA_BEFORE"
if git ls-files --error-unmatch -- .codex/hooks.json >/dev/null 2>&1; then
  echo "active hooks are still tracked" >&2
  exit 1
fi
git check-ignore --quiet -- .codex/hooks.json
git ls-files --error-unmatch -- .codex/hooks.json.example
git diff --name-only --diff-filter=U
git status --short
bun .codex/tools/amadeus-utility.ts doctor
```

ここでも `git diff` と `git status` は何も表示しないことが正常です。setup tool、
launcher、doctor は consumer の Git index を変更せず、commit も作りません。
`git rm --cached` は consumer 自身が実行する操作であり、package 更新が active file
を保持し、backup 済みであることを確認した後に限って実行します。Codex を起動する
前に、project trust と hook trust をもう一度確認してください。

## 実 monitor の acceptance

hermetic integration test は CI の blocking gate ですが、外部の agmsg / Codex push
bridge が実際に起動し、再起動後も動くことまでは証明しません。monitor bridge の
変更を検証するときは、Issue を完了する前に次の opt-in 確認を行います。

1. 手動の `inbox.sh` poller をすべて止め、`./scripts/run-codex.sh` から新しい Codex
   session を起動します。
2. 最初の turn を送り、delivery mode が `monitor` で、bridge が alive と報告する
   ことを確認します。
3. 人間が session を停止して再起動し、再起動後の session で 1 turn 送ります。
4. leader から一意な ping を送ります。手動の `inbox.sh` を使わずに session へ
   表示されることを確認し、返信して leader 側の受信も確認します。
5. agmsg と Codex の version、delivery mode、bridge status、ping 識別子、送受信時刻を
   記録します。

この acceptance が通るまで、どちらの移行手順で作った backup も削除しないでください。
失敗または未実施の場合、monitor bridge の変更は未完了です。

## 使い方

オーケストレーターは `$amadeus`(または `/skills` → amadeus)にスコープや説明を
続けて起動します — Claude ハーネスと同じコマンドです(`$amadeus --status`、
`$amadeus --help`、…)。ステージランナーは明示指定のみです:
`$amadeus-application-design`、`$amadeus-bugfix` など(37 個のランナー説明が
インデックスを汚染しないよう、暗黙のスキルマッチングから除外されています)。

## Claude Code との相違点

- **ゲート** は常に番号付き prose で描画します(番号または自由テキストで回答)。
  Codex の組み込み質問ツールへの回答は同梱の PostToolUse hook から観測できませんが、
  prose への回答は UserPromptSubmit adapter に到達し、human-presence guard が要求する
  監査可能な `HUMAN_TURN` を記録できます。ゲートのセマンティクスは引き続き
  エンジンにあります。
- **カスタムステータスラインなし** — ワークフローの位置は `update_plan` ツール
  (`task-progress` ステータスライン項目)と `$amadeus --status` に乗ります。
- **サンドボックス下の Git**: `workspace-write` は設計上、サンドボックス内で
  `.git` を読み取り専用に保ちます。対話的セッションは自動でエスカレートし、
  同梱の `.codex/rules/default.rules` が `git worktree`/`commit`/`add` を
  事前許可します。ヘッドレス実行(CI、exec ワーカー)には
  `writable_roots = ["<main repo>/.git"]` が必要です — 同梱の
  `config.toml.example` テンプレートにあります(リンクされた worktree は
  `<main>/.git/worktrees/*` に解決されるため、メインリポジトリの `.git` でなければなりません)。
- **Swarm フロア = `codex exec` ワーカー** — Bolt worktree 内で Construction
  ユニットごとに 1 つのヘッドレスワーカー(常に `< /dev/null`)、同じ決定論的
  レフェリーを使います。`AMADEUS_USE_SWARM=1` はここでは Workflow ツールを持たず、
  loud-degrade します(`SWARM_DEGRADED` が監査されます)。
- **セッションライフサイクル**: Codex には SessionEnd イベントがありません。
  閉じられなかったセッションは、次のセッション開始時に推論された `SESSION_ENDED`
  監査行として調整されます。Codex 専用の PostCompact イベントは compaction 後に
  ワークフローミッションを再注入します — Claude ハーネスに対する決定論の向上です。
- **成果物の監査精度**: ヘッドレスな `codex exec` 実行ではモデルがしばしば
  シェルヒアドキュメント経由でファイルを書き込み、これは `apply_patch` フック
  マッチャーをバイパスします — `ARTIFACT_*` 行がまばらになることがあります。
  対話的な TUI セッション(システムプロンプトが `apply_patch` を義務付ける)が
  高精度の監査モードです。
- **AIDLC ルールレイヤー** はワークスペースルート配下の
  `amadeus/spaces/<space>/memory/` にあります(1 つの手編集可能なソース、
  すべてのハーネスで同一)。`config.toml` の `AMADEUS_RULES_DIR` 環境シームが
  リゾルバをそこへ向け、オーケストレーターが `@amadeus/spaces/<space>/memory/...`
  というプロンプトメンションを注入します。Codex ネイティブの `.codex/rules/`
  ディレクトリは Starlark 権限ルールを保持します — AIDLC メソッドとは別物です。
- **ウェルカムメッセージなし**: Claude ハーネスはセッション開始時に
  `settings.json` の `companyAnnouncements` から Phases/Stages/Scopes の
  オンボーディングバナーを描画しますが、Codex には相当物がありません。
  セッション開始パスは resume コンテキストのみを注入します。
- **MCP サーバー**: Codex は `config.toml`(プロジェクトの `.codex/config.toml`
  または `~/.codex/config.toml`)の `[mcp_servers.<name>]` テーブルから MCP 定義を
  読みます — 必要なサーバーをそこに追加してください。同梱の設定は **1 つも** 宣言
  しません(Claude も Codex もデフォルトでプロジェクト MCP サーバーをゼロ同梱します)。

## 再生成

```bash
bun scripts/package.ts codex          # core/ + harness/codex/ から dist/codex を再生成
bun scripts/package.ts --check        # CI ドリフトガード(全ハーネス)
```

コアの `.ts` ファイルはそれらの `core/tools/` と `core/hooks/` のソースと
バイト単位で同一です(`tests/unit/t150-codex-packaging.test.ts` でピン留め)。
プロセ(散文)は `{{HARNESS_DIR}}` トークンを持ち、パッケージャがこれを `.codex`
に置換します(加えて `rules/` → `amadeus-rules/` のリネーム)。これが許可された
唯一の変換クラスです。ライブなエンドツーエンドの旅路は
`tests/e2e/t-exec-codex-status.serial.test.ts` です(ゲート:
`AMADEUS_CODEX_EXEC_LIVE=1`)。

## 次のステップ

インストールと trust が完了しましたか? 方法論はどのハーネスでも同じです — 中立な
章を続けてください:

- [最初のワークフロー](../02-your-first-workflow.ja.md) — 注釈付きのエンドツーエンド実行。
- [フェーズとステージ](../04-phases-and-stages.ja.md) — 5 フェーズと 32 ステージ。
- [スコープ、深さ、テスト戦略](../05-scopes-and-depth.ja.md) — 実行の適正サイズ化。
- [用語集](../glossary.ja.md) — すべての用語の定義。

他のハーネス: [Kiro IDE で AI-DLC を実行する](kiro-ide.ja.md) · [ハーネスファミリーの索引](README.ja.md)。
