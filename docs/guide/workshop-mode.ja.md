# Workshop モード

`workshop` スコープは、*ファシリテーション付きのグループセッション* 向けに設計された
唯一の AI-DLC スコープです — 典型的には、1 人(ファシリテーター)がグループが何を
構築するかを決め、N 人の参加者が共有リモートに対して並行して別々の Construction Bolt を
駆動する、ワークショップやトレーニングラボです。

この章は **手動レシピ** です: 今日すでに同梱されているプリミティブ
(`amadeus-worktree`、`amadeus-bolt`、および通常の git)を使ってワークショップ
フローを文書化します。専用の `--claim-bolt` CLI はまだありません — claim
セマンティクスは共有リモートへの `git push` に乗り、レシピはその契約を明示します。
将来のリリースはこの章が記述する動きを自動化するかもしれませんが、今のところ、
レシピが契約です。

スコープの depth/test-strategy/skip-list については [スコープと深さ § workshop](05-scopes-and-depth.ja.md#workshop) を、
この章が前提とする Bolt ごとの worktree メカニズムについては
[状態と監査](10-state-and-audit.ja.md) とオーケストレーターの
[Construction フロー](../reference/03-orchestrator.ja.md) を参照してください。
初めてのファシリテーター? まず [はじめに](01-getting-started.ja.md) を通してください
— 以下のいかなるワークショップステップの前にも、bun とハーネスのフレームワークコピーが
すでに配置されていなければなりません。

> **ハーネスに関する注記。** このレシピはハーネス中立です: `amadeus-worktree` と
> `amadeus-bolt` ツール(すべてのハーネスで共有)と通常の git を駆動します。
> コマンド例はオーケストレーターを `/amadeus`(Claude Code / Kiro)として起動します。
> Codex では `$amadeus` を使ってください。claim-and-merge の git 契約はどこでも同一です。

---

## Workshop モードを使うとき

Workshop モードは、次の **すべて** が真のときに適合します:

- ファシリテーターがプロジェクトスコープを事前決定している(ワークショップにはトピックがある — 参加者は何を構築するか選ばない)
- 複数の開発者が Construction の異なる部分を同時に作業し、各々が共有リポジトリの自分のクローン上で作業する
- すべてのステージでの必須ゲートが許容される(workshop モードはゲートのセレモニーを保つ — 目的は方法論を教えることであり、スキップすることではない)
- テストの深さよりペースが重要 — workshop はセッションを進め続けるため、Standard 深さと **Minimal** テスト戦略で出荷する

これは、単独開発者の作業、アドホックな並列コラボレーション、あるいは参加者が Bolt を
claim して明示的なハンドオフなしに立ち去るかもしれない状況には **適合しません**。
ソロ作業には `feature`、`mvp`、またはより小さいスコープのいずれかを選んでください。

---

## Workshop 実行の形

ワークショップ実行には 3 者がいます:

| 役割 | 何をするか |
|------|--------------|
| **ファシリテーター** | プロジェクトを事前決定し、共有リモート上で Inception をソロで実行し(全参加者が同じ承認済み Inception 成果物から始められるように)、次に並列 claim のために Construction を開く |
| **参加者** | 共有リモートをクローンし、そのブランチを最初に push して Bolt を claim し、その Bolt の Construction ステージを自分の worktree でローカルに実行し、ゲートが承認したら push で戻す |
| **グループ** | 各ゲートを一緒にレビューする — LLM が作業し、人間がゲートを駆動する |

Inception はファシリテーターがキーボードにいてシリアルに実行されます。Construction が
並列性の始まる場所です — `bolt-plan.md` が承認されると、すべての Bolt が claim 可能に
なります。

---

## ファシリテーターのセットアップ

### セッション前

プロジェクトで Claude Code を起動し(`cd workshop-project && claude`)、次に workshop
スコープで最初の intent を誕生させます:

```
/amadeus --scope workshop
```

新規ワークスペースでスコープを名指しすると、最初の intent が誕生し、その intent の
`amadeus-state.md` に `Scope: workshop` と `Default Test Strategy: Minimal` が刻印
されます。誕生した intent の状態を共有リモートに push すると、参加者はすでに
workshop だと分かっているプロジェクトをクローンします。

プロジェクトごとのデフォルトスコープは `.claude/settings.json` の
`AMADEUS_DEFAULT_SCOPE=workshop` で設定できます。これを設定すると、クローンで
`/amadeus` を実行するすべての参加者が、フラグを覚えていなくても自動的に workshop
ルーティングを得ます — [カスタマイズ § プロジェクトごとのデフォルトスコープ](13-customization.ja.md#per-project-default-scope) を参照。

### Inception をソロで実行

ファシリテーターは Inception ステージ 2.1 から 2.8 を順に駆動し、すべてのゲートに
当たります。workshop スコープは Ideation(1.1–1.7)を完全にスキップします —
プロジェクトが事前決定されているので、ideate すべきものがありません。

**ステージ 2.2(practices-discovery)は workshop モードにとって load-bearing です。**
ここでチームはブランチ戦略、walking-skeleton のスタンス、テスト姿勢、デプロイ頻度を
承認します — そして Construction はそれらの承認を Bolt ごとの各決定で読みます。承認
ゲートはソロではなくグループで実行してください: その答えが、ワークショップの残りの間、
すべての参加者のマシンで何が起こるかを統治します。

`delivery-planning`(2.8)が `bolt-plan.md` を発行したら、**Construction に進む前に
グループでそれをレビューしてください。** Bolt リストが誰が何を claim するかを決めます
— 参加者はそれを見る必要があります。

承認済みの Inception 成果物を共有リモートに push します。この時点以降、参加者は
pull して claim します。

---

## Claim セマンティクス: git push が claim である

このレシピは通常の git を使ってクローン間で slug の一意性を強制します。AI-DLC 固有の
claim レジストリはありません — **共有リモートのブランチ名前空間** がレジストリであり、
`git push` が 2 人の参加者が同じ Bolt でレースするのを防ぐアトミックなプリミティブです。

契約:

1. **claim の直前に必ず `git fetch --all` する。** 古いローカル ref は並行 claim を隠します。
2. **`foo` という名前の Bolt を claim するとは、`bolt-foo` を共有リモートに最初に push すること。** 最初の push が勝ちます。
3. **遅れた claim 者は non-fast-forward の push 拒否を見ます** — リモートにすでに `bolt-foo` がある場合。それが別の Bolt を選ぶシグナルです。
4. **プラクティスがブランチの形を統治する — 推測せず読む。** `amadeus/spaces/<space>/memory/team.md` の `## Branching` セクションが、`amadeus-pipeline-deploy-agent` が merge ディスパッチ時にマージターゲットと戦略を選ぶために読むものです。worktree を作成するベースブランチはその承認された形に一致しなければなりません: トランクベースのチームは `main` から、gitflow チームは `develop` から、リリースブランチのチームはアクティブなリリースブランチからベースします。参加者はこれを選びません — ファシリテーターの承認済みプラクティスがすでに選んでいます。amadeus-pipeline-deploy-agent が尊重する契約については [branching-strategies の knowledge ファイル](../../core/knowledge/amadeus-pipeline-deploy-agent/branching-strategies.md) を参照(それはハーネスの `knowledge/` ディレクトリに同梱されます)。

> **なぜここでは参加者が `--base` を手動で供給するのか。** 標準の(単独エンジニアの)Construction フローでは、コンダクターが `amadeus-pipeline-deploy-agent` をディスパッチして `amadeus/spaces/<space>/memory/team.md` を読み、あなたのために `--base` を解決します。workshop レシピは *手動* のマルチクローン変種です — 今日はコンダクター駆動の workshop ディスパッチャがないため、各参加者が全員 pull した同じ `amadeus/spaces/<space>/memory/team.md` から導出した同じ `--base` 値をコピーします。これがステージ 2.2 でのファシリテーターの `## Branching` の承認が load-bearing である理由です: それは全参加者が読む唯一のソースオブトゥルースです。

実際の `amadeus-worktree create` サブコマンドはローカル worktree とローカルブランチを
作成しますが、push は **しません**。push が claim を公開するものです。この分離は
意図的です: 貧弱な接続の参加者はまずすべてのローカル作業を行い、準備ができたら
claim をアトミックに push できます。

---

## 参加者フロー

### 1. クローン

```bash
git clone <shared-remote> participant-clone
cd participant-clone
```

クローンは、intent の `amadeus-state.md` がすでに `Scope: workshop` にピン留めされ、
承認済みの Inception 成果物がすでに intent のレコードディレクトリにある状態で届きます。

### 2. Bolt を選んで claim する

```bash
# claim 前に必須 — ローカル ref をリフレッシュ
git fetch --all

# すでに claim されているものを確認
git ls-remote --heads origin "bolt-*"

# bolt-plan.md から未 claim の Bolt を選び(例 user-profile-api)、
# worktree + ブランチをローカルに作成する。--base の値はチームの承認された
# ブランチ戦略に一致しなければならない(amadeus/spaces/<space>/memory/team.md から読む):
#   trunk-based  → --base main
#   gitflow      → --base develop
#   release-branch → --base release/<version>
bun .claude/tools/amadeus-worktree.ts create --slug user-profile-api --base main

# claim をアトミックに公開する。別の参加者があなたとレースした場合、
# この push は拒否される — 別の Bolt を選ぶ。
git push origin bolt-user-profile-api
```

push には 3 つの可能な結果があります:

| 結果 | 意味 | 何をするか |
|---------|--------------|------------|
| `* [new branch]      bolt-user-profile-api -> bolt-user-profile-api` | claim 成功。ブランチが origin で予約された。 | ステップ 3 に進む。 |
| `! [rejected]        bolt-user-profile-api -> bolt-user-profile-api (non-fast-forward)` または `(fetch first)` | あなたが準備している間に別の参加者が先に claim した。 | ローカル worktree を破棄(`amadeus-worktree discard --slug user-profile-api`)して別の Bolt を選ぶ。 |
| ネットワークエラー / 認証タイムアウト | push が origin に届かなかった。 | `git fetch --all` の後にリトライ — ローカル worktree はまだ安全。 |

### 3. Bolt をローカルで実行する

claim が公開されたら、通常のやり方で Bolt を実行します — Claude Code セッションで:

```
/amadeus
```

オーケストレーターは Bolt ごとのループから引き継ぎます。worktree がすでに存在し、
ブランチがすでに origin にあるため、参加者はどの単独開発者スコープとも全く同じように
作業します — 状態と監査は worktree にフォークし([状態と監査 § Construction worktrees](10-state-and-audit.ja.md) を参照)、
Construction ステージは worktree 内で実行され、Bolt の終わりの必須ゲートがグループ
レビューのために開きます。

### 4. マージして push する

ゲートが承認すると、標準の `amadeus-bolt complete --merge --slug user-profile-api`
フローが worktree の状態と監査を参加者のローカル main にマージバックします。
**更新された状態ファイルを origin に push してください**(`git push origin main`)—
参加者のローカルマージは `amadeus-state.md` を更新し(例: 最初の claim 者に対して
ラダープロンプトが発火した後の `Construction Autonomy Mode: autonomous` の設定)、
他の参加者はワークフローのモードを継承するために resume 前にそのファイルを pull
しなければなりません。コンダクターは `amadeus-pipeline-deploy-agent` をディスパッチして
`amadeus/spaces/<space>/memory/team.md` からチームのブランチ戦略を読み、マージ
ターゲット + 戦略を選びます。監査ログは各ディスパッチを `MERGE_DISPATCH_INVOKED` →
`MERGE_DISPATCH_RETURNED`(またはエージェントがタイムアウトしてコンダクターが `org.md`
デフォルトにフォールバックした場合は `MERGE_DISPATCH_FALLBACK`)で囲みます。
ワークショップ後にこれらの行を検査するのが、チームの承認したブランチが実際に尊重された
ことを確認する最速の方法です。

```bash
# amadeus-bolt complete --merge 成功後 — マージされたターゲットブランチを push
git push origin main    # またはチームの承認したブランチに従って develop / release-*
```

### 5. ハンドオフする(完了しない場合)

参加者が Bolt を claim したが完了できない場合、手動ハンドオフは次のとおりです:

```bash
# 元の claim 者のクローンで
bun .claude/tools/amadeus-worktree.ts discard --slug user-profile-api
git push origin :bolt-user-profile-api    # リモートブランチを削除

# 新しい claim 者のクローンで、fetch 後
git fetch --all
bun .claude/tools/amadeus-worktree.ts create --slug user-profile-api --base main
git push origin bolt-user-profile-api
```

各クローンの監査証跡はローカルのライフサイクル(`WORKTREE_CREATED` /
`WORKTREE_DISCARDED` / 新しいクローンでの新たな `WORKTREE_CREATED`)を記録します。
マシンをまたぐ resume はありません — 新しい claim 者は Bolt を最初から開始します。

---

## ワークスルー例: 2 人の開発者、3 つの Bolt

共有リモートは 3 つの Bolt を持つ `bolt-plan.md` を保持します: `user-profile-api`、
`billing-service`、`notifications-worker`。

Alice と Bob はそれぞれワークショップリポジトリをクローンしています。Inception の
ステージ 2.2 で、チームは `amadeus/spaces/<space>/memory/team.md` で
`## Walking Skeleton: always-skeleton` を承認したので、オーケストレーターは
walking-skeleton マーク付きの Bolt(`user-profile-api`)を選んで並列 claim を開く前に
ソロで実行します。**skeleton-merges-first ルールはオーケストレーターが強制します** —
Bob は待つことを覚えている必要はなく、オーケストレーターは skeleton が共有リモートに
着地するまで単に並列バッチをディスパッチしません。

### Walking-skeleton Bolt — Alice ソロ

```bash
# Alice のクローン
# (ワークスルー例はトランクベースのチームを前提 — gitflow チームでは --base develop、
#  リリースブランチのチームでは --base release/<version> に置き換える。
#  amadeus/spaces/<space>/memory/team.md に従う。)
git fetch --all
bun .claude/tools/amadeus-worktree.ts create --slug user-profile-api --base main
git push origin bolt-user-profile-api    # claim 成功 — 最初の claim 者
# Claude Code(`claude`)で実行: /amadeus
#   — worktree で Construction ステージ 3.1–3.5 を実行
# グループがレビューし always-gate を承認(workshop はすべてのゲートを保つ)
bun .claude/tools/amadeus-bolt.ts complete --merge --slug user-profile-api
git push origin main                      # マージ結果を公開
```

skeleton がマージされた後、コンダクターは **ラダープロンプト** を 1 回発火します:
「How should the remaining Bolts run? Continue autonomously / Gate every Bolt.」
グループの選択は `amadeus-state.md` に `Construction Autonomy Mode` として永続化
されます。Bob は次の `git fetch --all` でその選択を拾います — Alice と Bob は口頭で
調整する必要はありません。

> **`bolt-plan.md` が Bolt を walking-skeleton とマークしたが practices が skeleton-off と言う場合は?** Practices が勝ちます。オーケストレーターは競合を記録する `PRACTICES_OVERRIDE` 監査行を発行し(`Reason: bolt-plan-marker-conflict`、加えて practices のスタンスと bolt-plan マーカー)、マークされた Bolt は通常の Bolt として実行されます — always-gate なし、ラダープロンプトなし。Practices はチームの standing な声で、bolt-plan は 1 つのワークフローの解釈です。

### 並列 Bolt — Alice + Bob

両者とも `git fetch --all` を実行して Alice のマージ済み main を拾います。(以下の
両ブロックはトランクベースを前提 — gitflow チームでは `--base develop`、リリース
ブランチのチームでは `--base release/<version>` に置き換える。上の Alice のソロ
skeleton ブロックと同様。)

```bash
# Alice は billing-service を選ぶ
git fetch --all
bun .claude/tools/amadeus-worktree.ts create --slug billing-service --base main
git push origin bolt-billing-service      # 成功
```

```bash
# Bob は notifications-worker を並行して選ぶ
git fetch --all
bun .claude/tools/amadeus-worktree.ts create --slug notifications-worker --base main
git push origin bolt-notifications-worker # 成功 — 異なる slug、レースなし
```

両者はそれぞれのクローンで `/amadeus` を実行します。状態と監査は Bolt ごとの
worktree に独立してフォークします。各参加者の Construction 作業はマージするまで
ローカルです。

### Alice と Bob が同じ slug を選んだ場合

両者が `billing-service` を claim すると決めたとします:

```bash
# Alice
git push origin bolt-billing-service
# * [new branch]      bolt-billing-service -> bolt-billing-service     (Alice が勝つ)
```

```bash
# Bob(数秒遅れてレース)
git push origin bolt-billing-service
# ! [rejected]        bolt-billing-service -> bolt-billing-service (fetch first)
# error: failed to push some refs to '<remote>'
# hint: Updates were rejected because the remote contains work that you do
# hint: not have locally.
```

Bob のローカル worktree はまだ `.amadeus/worktrees/bolt-billing-service/` に存在します
— 無駄なローカルコピーであり、破損ではありません。Bob はそれを破棄して代わりに
`notifications-worker` を選びます:

```bash
bun .claude/tools/amadeus-worktree.ts discard --slug billing-service
git fetch --all
bun .claude/tools/amadeus-worktree.ts create --slug notifications-worker --base main
git push origin bolt-notifications-worker
```

レースは Bob におよそ 30 秒のローカルセットアップのコストを課しました。状態破損なし、
ブロックされた参加者なし。

### 最終収束

両方の Bolt が完了したとき:

```bash
# Alice(ゲート承認後)
bun .claude/tools/amadeus-bolt.ts complete --merge --slug billing-service
git push origin main                      # Bob が先に着いた場合は fetch+rebase が必要かも
```

```bash
# Bob(ゲート承認後)
bun .claude/tools/amadeus-bolt.ts complete --merge --slug notifications-worker
git fetch --all
git rebase origin/main                    # その間に Alice が push した場合
git push origin main
```

2 つの最終 push は通常の git メカニズムでシリアライズされます。共有リモートは、
3 つすべての Bolt が main にマージされ、加えてクリーンアップ可能な 3 つの `bolt-*`
ブランチを持つ状態で終わります:

```bash
# ワークショップ後に誰でもクリーンアップできる
git push origin :bolt-user-profile-api :bolt-billing-service :bolt-notifications-worker
```

### ワークショップの締めくくり

すべての Bolt がマージされ `bolt-*` ブランチが削除されたら、ファシリテーターは
次を行うべきです:

1. **`Bolt Refs` が空であることを検証** — `bun .claude/tools/amadeus-utility.ts status`(または `amadeus-state.md` を読む)が `Bolt Refs: [empty list]` を示すべきです。残った slug はクリーンにマージされなかった Bolt を示します。ワークショップを閉じる前に調査してください。
2. **保持された worktree を検査** — `bun .claude/tools/amadeus-worktree.ts list` がすべての保持された `.amadeus/worktrees/bolt-*/` ディレクトリを示します。これらは参加者が halt-and-ask 中に Skip または Abort を選んだため残りました。破棄する(`amadeus-worktree discard --slug <slug>`)か、ワークショップ後のデブリーフのために残すかを決めてください。
3. **監査ログをざっと見る** — intent の `audit/` シャードはすべての参加者の worktree からの監査エントリを運びます(各クローンのシャードはクリーンにマージし、競合なし)。`MERGE_DISPATCH_FALLBACK` 行は「チームの承認したブランチではなく黙ってトランクデフォルトを使った」の痕跡です — デブリーフで表面化させてください。
4. **適切ならリリースをタグ付け** — workshop スコープはすべての Construction Bolt がマージされて完了します。ワークショップのプロジェクトがさらに進むなら、これは自然なタグポイントです。`amadeus/spaces/<space>/memory/team.md` のチームの承認したデプロイ頻度に従って、これはステージングデプロイを自動トリガーするかもしれません。

フレームワークは各参加者のセッションごとの resume ケースを扱います — 下の
[ワークショップセッションの resume](#resuming-a-workshop-session) を参照 — 参加者の
セッションがバッチの途中で kill され、遅れてワークショップに再参加する場合に有用です。

---

## Workshop モードのゲート

Workshop モードは **すべてのステージで必須ゲート** を保ちます — それが全体の要点です。
パターンは次のとおりです:

1. LLM が参加者のクローンでステージの作業を完了する
2. 状態ファイルが `[?]`(承認待ち)に移る
3. グループが一緒に成果物をレビューする(部屋で、共有スクリーンで、ビデオ通話で — ワークショップ次第)
4. 参加者が Claude Code セッションで Approve をクリックし、ゲートがクリアされ、次のステージが始まる

グループレビューが workshop モードを `feature` や `mvp` と区別するものです — 状態
ファイルの同じ `[?]` チェックボックスですが、異なるレビューサーフェスです。ゲートは
1 人が見ているか 20 人が見ているかを知りません。

### 並列バッチのゲート

コンダクターが Bolt の並列バッチを実行するとき(例: 4 人の参加者が各々 4-Bolt
バッチの 1 つの Bolt を駆動)、ゲートは **バッチレベルで、Bolt ごとではありません** —
1 つの承認がバッチ内のすべての Bolt をカバーします。グループは各 worktree の diff を
順にレビューし、Approve all / Inspect / 1 つ以上を Reject を決めます。Reject された
Bolt はフォローアップのために worktree がディスク上に保持されます。

### マルチ失敗の halt-and-ask

**ソロ Bolt 失敗**(m=1)は、[オーケストレーターの Construction フロー](../reference/03-orchestrator.ja.md)
で文書化された標準の halt-and-ask 単一 AUQ パスを使います。walking-skeleton Bolt は
常にソロで実行されるため、その失敗はこのパスを取ります。

**同じ並列バッチ内の 2 つ以上の Bolt が失敗** したとき(例: `email-delivery` と
`admin-panel` の両方がコード生成エラーに当たる)、コンダクターは **シーケンシャル
AUQ** をレンダリングします — 失敗した Bolt を一度に 1 つずつ、slug 順で、質問本文に
`failure <k> of <m>` とタグ付けして。同じバッチ内の成功した Bolt は
**HOLD-MERGE 不変条件** を介してマージから保留されます。これは散文だけでなく
ツールで強制されます:

- AUQ シーケンスを開く前に、コンダクターは成功した各 Bolt に対して `amadeus-bolt hold-merge --slug <slug>` を実行します。これはその Bolt の Bolt ごとのフォーク状態ファイルに `Merge-Held: true` を書きます(冪等 — すでに保留された Bolt の再保留は静かに成功します)。
- マーカーが設定されている間、`amadeus-bolt complete --merge --slug <slug>` は非ゼロ終了と `{ok:false, reason:"merge-held", ...}` エンベロープで拒否します。コンダクターは AUQ シーケンスの途中で生存者を誤ってマージできません — ツール自体がそれをブロックします。
- 失敗したすべての AUQ が解決されると(リトライして成功、スキップ、または abort)、コンダクターは保留された各生存者に対して `amadeus-bolt release-merge --slug <slug>` を実行し、元のバッチ順でマージをディスパッチします。

各失敗について AUQ は Retry(同じ worktree でコード生成を再実行 — 反復回数は状態で
追跡)、Skip(状態で `[S]` とマーク、worktree をディスク上に保持)、または Abort
(Construction を停止。レンダリングされていない AUQ k+1..m は次のセッション resume に
延期)を提供します。保留マーカーはセッション kill を生き延びます — 下の resume ルールを
参照。

> **2 つの異なるクリーンアップ動詞。** `amadeus-bolt abort --name "<name>" --slug <slug> --reason "<text>"` は正典的な Bolt レベルの abort です — `BOLT_FAILED` を `Reason: aborted` で発行し、(US-1 AC4 に従って)デフォルトで worktree ディレクトリを保持します。`--discard` を追加すると worktree も撤去します。`amadeus-worktree discard --slug <slug>` は、レース敗北の回復に使われる低レベルの worktree のみのクリーンアップです(参加者が claim レースに負け、別の Bolt を選ぶ前にローカル worktree を処分したいだけのとき)。これらは互換ではありません — 失敗とマークすべき Bolt があるときは `amadeus-bolt abort` を、ないときは `amadeus-worktree discard` を使ってください。

保留された Bolt で `amadeus-bolt complete --merge --slug <slug>` を実行したときに
参加者が見るエラーメッセージは逐語的に次のとおりです:

```
Merge held by HOLD-MERGE invariant; resolve the failed-sibling halt-and-ask sequence
and run `amadeus-bolt release-merge --slug <slug>` before retrying.
```

これを見たら、オーケストレーターは AUQ シーケンスの途中です。失敗した sibling の
AUQ をすべて先に解決し、次に `amadeus-bolt release-merge --slug <slug>` がマーカーを
クリアします。

### ワークショップセッションの resume

ワークショップ参加者はセッションを失います — ラップトップがスリープし、ネットワークが
落ち、昼休みがあります。すべての load-bearing な決定は、resume するセッションが
再読できるコミット済み成果物(`amadeus-state.md`、`audit/` シャード、
`amadeus/spaces/<space>/memory/team.md`)にあるため、フレームワークは resume を
クリーンに扱います。

契約:

1. **resume 前に pull する。** 参加者のクローンで `git fetch --all && git pull` — 他の参加者からのマージ、autonomy-mode の変更、新しい claim を拾います。
2. **`/amadeus` はディスクから状態を再導出する。** エンジンは main 状態から `Bolt Refs` を読み、監査ログを歩き、どの Bolt がどのライフサイクルフェーズにあるかを再構築します。
3. **`Bolt Refs` にあり `STATE_FORKED` 行はあるが `STATE_MERGED` がない Bolt**: オーケストレーターは Phase 3 に再突入します(コード生成の resume)。
4. **`Bolt Refs` にありすでに `STATE_MERGED` を持つ Bolt**: スキップ — すでにマージ済み。
5. **フォーク状態に `Merge-Held: true` を持つ生存者**: 未マージ。オーケストレーターは `amadeus-worktree info --slug <slug>` を実行して JSON エンベロープの `merge_held: boolean` フィールド(post-merge のマイルストーン 13 fold-in で設定される — オーケストレーターは状態ファイルを手動でパースする必要がない)をチェックすることで、これを決定論的に検出します。未解決の失敗 Bolt AUQ をまず再レンダリングし、`amadeus-bolt release-merge --slug <slug>` でクリアされると、保留されたマージを元のバッチ順でディスパッチします。
6. **Walking-skeleton ラダープロンプトが未設定**: resume するセッションが `Construction Autonomy Mode: unset` を見て skeleton がすでに `[x]` の場合、ラダープロンプトが resume するエンジニアに発火します。最初に resume した者がモードを設定し、後続の resume 者は `git pull` でそれを継承します。

Practices と autonomy mode は共有リポジトリの明示的なコミット済み成果物です — マシン
間の魔法のような状態同期はありません。Pull、resume、continue。

---

## このレシピがカバーしないもの

- **専用の `--claim-bolt` CLI ユーティリティ。** そのユーティリティは、実際のワークショップのドッグフーディングが具体的な要件(レースでのより良いエラーメッセージ、監査のみのオフラインモード、自動化された stale-claim 検出)を表面化させたら、将来のリリースで同梱されるかもしれません。それまでは、`amadeus-worktree create` + `git push` を使う上のレシピが契約です。
- **Stale-claim 検出。** Bolt を claim してリリースせずに離脱した参加者は、origin に孤児 `bolt-<slug>` ブランチを残します。ファシリテーターが手動で削除します(`git push origin :bolt-<slug>`)。v0.4.0 マイルストーン 15 の将来の `--doctor` 拡張は stale ブランチを自動的にフラグするかもしれません。
- **監査のみ / オフラインモード。** 共有リモートなしでは、claim の調整はファシリテーターと参加者間の口頭合意にフォールバックします。Workshop モードは根本的にマルチクローンのパターンです。workshop スコープの単一ラップトップ実行は可能ですが、並列 claim の利点を失います。
- **マルチクローンワークショップ中の practices の新鮮さ。** Practices は **Construction 開始時に一度** 読まれます — コンダクターは `amadeus/spaces/<space>/memory/team.md` から `## Walking Skeleton` と `## Branching` を(`amadeus-lib.ts` の `extractMarkdownSection` 経由で)ロードし、その 1 回の読み取りがその参加者のセッションの Construction フェーズ全体をサービスします。ファシリテーターが参加者が Bolt を進行中に practices-discovery を再実行すると、進行中の参加者は `/amadeus` セッションを再起動する(そして新しい承認を `git pull` する)まで、ライブの `amadeus/spaces/<space>/memory/team.md` を再読しません。**ファシリテーターへのルール:** いずれかの Bolt が進行中の間に practices-discovery を再実行しないこと。すべての進行中の Bolt のゲートをまず終わらせること。**参加者へのルール:** セッションを resume する直前に必ず `git fetch --all && git pull` を実行すること — これは離れている間に着地した practices の変更を捕捉します。同じルールは参加者フローのステップ 2 の `--base` 値もカバーします: `amadeus/spaces/<space>/memory/team.md` からコピーする値は、最後の pull 時点でのみ新鮮です。

---

## 関連する読み物

- [スコープと深さ § workshop](05-scopes-and-depth.ja.md#workshop) — スコープのステージリスト、深さ、テスト戦略
- [状態と監査](10-state-and-audit.ja.md) — Construction worktree がどう状態と監査をフォークするか
- [CLI コマンド](12-cli-commands.ja.md) — `amadeus-worktree` と `amadeus-bolt` サブコマンドのリファレンス
- [オーケストレーター: Construction フロー](../reference/03-orchestrator.ja.md) — 各 Bolt の中で何が起こるか
- [ブランチ戦略(knowledge ファイル)](../../core/knowledge/amadeus-pipeline-deploy-agent/branching-strategies.md) — amadeus-pipeline-deploy-agent の merge-dispatch 契約
