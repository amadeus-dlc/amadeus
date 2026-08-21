# プラグイン

> 言語: [English](19-plugins.md) | **日本語**

**プラグインは、フレームワーク本体を編集せずに、1 つ以上のステージ・シームエントリ・
プロズフラグメントをホストワークスペースへ追加する、小さな手書きのバンドルです。**
`plugins/<name>/` 配下に一度オーサリングすれば、パッケージャが全ハーネスへ投影し、
ホスト合成エンジンがワークスペースへマージし、状態を報告し、再び除去します — すべて
可逆で、ワークスペースが既に所有するものを一切上書きしません。

この章は利用者向けリファレンスであり、オーサリングガイドです。プラグインシステムが
現在サポートする面、そのコマンドライン面、セッション起動時にプラグインがホストへ自動
compose される仕組み、利用者に見える安全契約、ローカルでの検証手順、そして
パッケージハーネス面とセルフインストール面の違いを記述します。これはいかなる
上流 README のコピーでもありません — 以下のパス・コマンド・失敗契約はすべて Amadeus
のものです。

実例はリファレンスプラグイン `test-pro` です。オーサリングソースは
`tests/fixtures/plugins/test-pro/` に置かれ、
`tests/integration/t254-reference-plugin-lifecycle.test.ts` が端から端まで駆動します。

---

## オーサリングパスと名前空間

プラグインはディレクトリ `plugins/<name>/` で、その名前が identity(全プラグインで
一意)です。`plugin.json` マニフェストと、マニフェストが参照するファイルを持ちます。
プラグインが同梱する全ファイルは、各ハーネスツリー内の予約名前空間
`plugins/<name>/` へ投影されるため、プラグインの出力はコアフレームワークの出力とも、
他の全プラグインとも構造的に素です。プラグイン間の衝突は構造上あり得ません。

オーサリングツリーはプラグインルート相対の自然な形にします。

```text
plugins/example/
  plugin.json
  stages/review.md
```

`plugins/example/plugins/example/stages/` のように名前空間を重ねてはいけません。

`plugin.json` マニフェストは 3 種類の貢献を宣言します。

- **`stages`** — プラグインがホストへコピーする新しいステージファイル。各エントリは
  `slug`(一意、ホストに既存であってはならない)と、プラグインルート相対の source
  `path`(例: `stages/review.md`)を持ちます。compose はその path から bundle bytes を
  解決し、独立に `plugins/<name>/<path>` をホスト着地点として生成します。着地点は
  既存であってはなりません。
- **`seams`** — 既存ホストステージのシーム配列へ追記されるエントリ。4 つのシームは
  `produces`・`consumes`・`sensors`・`required_sections` で、それ以外の名前は unknown
  seam として拒否されます。エントリは宣言順に追記され、ホストの既存内容に対して
  重複排除されます。
- **`fragments`** — 既存ホストファイルの名前付き `anchor` へ差し込むテキストブロック。
  `id` でタグ付けされ、drop 時に正確に切り出せます。

プロズファイル(`.md`)は投影時にハーネスごとに変換されます。`{{HARNESS_DIR}}`
トークンはそのハーネスのディレクトリ(`.claude`・`.kiro` など)になり、rules
ディレクトリをリネームするハーネス(kiro → `steering`)ではプロズ内の `rules/`
パスが書き換えられます。JSON と TypeScript はそのままコピーされます。

---

## ライフサイクル

1. **オーサリング** — `plugins/<name>/plugin.json` と参照ファイルを書きます。
2. **投影** — パッケージャが `plugins/` を discover し、各ソースを構造的に検証
   (マニフェスト存在・identity 一意・プラグイン自身のサブツリーを逸脱するパスなし)
   し、各プラグインを各パッケージハーネスツリーとハーネス中立バンドルへ投影
   します。プラグインが 0 件のとき、出力はプラグイン非対応ビルドと byte-identical
   です。
3. **inspect** — 合成エンジンが discover 済みプラグインをホストスナップショットと
   照合し、判定前に *すべて* の問題(同名ステージ・不正マニフェスト・unknown seam・
   clobber)を収集します。問題が 1 件でもあれば拒否し、プランは作りません。
4. **compose** — クリーンなプラグインは単一の三面アトミックトランザクションとして
   適用されます。ホストバイト・合成レコード・監査エントリを一括で書くか、まったく
   書かないかのいずれかです。合成レコードには明示 trust grant(plugin、content
   digest、timestamp)と各所有 stage の digestを永続化します。
5. **doctor** — 読み取り専用の診断が、project の選択・供給元・host staging・合成
   レコードを比較し、`source-missing`・`not-installed`・`stale`・`current` を区別します。
6. **drop** — レコード所有の除去が、プラグインの所有ファイルを削除し、各共有ファイルを
   base と *残り* のプラグインの貢献から再構築します。

---

## 入口

ホスト側の操作はすべて、ハーネス中立 CLI `amadeus-plugin.ts` の verb です。その 1 本の
CLI へ届く面は次の 3 つで、違いは体裁だけです — 下記の verb 契約はどの面でも同一です。

- **エンジン verb `/amadeus plugin <verb>`** — 第一表記であり、全ハーネスで同一です。
  `plugin` 以降はすべて未パースのままプラグイン CLI へ渡り、exit code はそのまま返る
  ため、CLI 自身の usage エラーが正本であり続けます。
- **スキル** — `/amadeus-plugin` はユーザー起動スキルで、まず read-only verb を実行し、
  解決された状態を説明してから、あなたが名前で選んだ 1 verb だけを実行します。変更を
  伴う verb(`install`・`drop`)へ至るガード付きの経路です。これとは別に、ステージを
  提供するプラグインを compose すると、そのステージ専用のランナースキル
  `/amadeus-<slug>` が生成されます。
- **生 CLI** — スクリプトや上級者向け。ハーネスツリーへ配布されたコピーを直接実行します。

  ```
  bun .claude/tools/amadeus-plugin.ts <verb> [flags]
  ```

  他のハーネスは各自のディレクトリ(`.codex`・`.cursor`・`.kimi` など)に置き換えます:
  `bun <harness-dir>/tools/amadeus-plugin.ts <verb>`。

verb は次のとおりです。

| verb | 動作 | exit |
| --- | --- | --- |
| `compose [--if-stale] [--project-root <dir>]` | 全インストール済みプラグインを単一のアトミックトランザクションとしてホストへ適用。`--if-stale` は合成レコードが既に最新なら即座に戻る no-op 高速路。 | 成功・no-op で `0`、適用失敗で `1` |
| `doctor [--project-root <dir>]` | project の選択・供給元・host staging・合成を比較し、`source-missing`・`not-installed`・`stale`・`current` を表示。 | 健全なら `0`、degraded / recovery-pending があれば `1` |
| `drop <plugin-name> [--project-root <dir>]` | 1 プラグインの所有ファイルを除去し、残りのプラグインから共有ファイルを再構築。 | 成功で `0`、拒否・失敗で `1` |
| `install <path> [--force] [--project-root <dir>]` | `<path>` のプラグインソースフォルダをホストの discovery ルートへ staging し、そのまま compose まで 1 操作で実行。`--force` は同名で staging 済みの *別* プラグインを置換します。 | 成功で `0`、拒否・失敗で `1` |
| `status [--project-root <dir>]` | 件数(installed・composed・監査 revision)を表示。 | `0` |

`--project-root` を省略した場合、ホストルートは **CLI 自身がインストールされている
ハーネスディレクトリ** です — `bun .codex/tools/amadeus-plugin.ts compose` はどこから
実行しても `.codex/` へ compose します。ここはエンジンが合成済みプラグインステージを
読み戻すルートと同一なので、install・compose・discovery が乖離することはありません。
`--project-root <dir>` はこれを上書きして別のホストを対象にします — CLI が存在する場所
以外のホストへ compose する手段で、パッケージされるがセルフインストールされない
`kiro` / `kiro-ide` / `pi` 面では常に必要です。

引数処理は fail-closed で、いかなる変更よりも **前** に行われます: 未知 verb・未知
フラグ・余剰引数は usage を stderr へ出して exit `2` で終わり、ホストには一切触れません。
`--help` フラグはありません。verb なしで実行すると usage ブロックが表示されます。

---

## セッション起動時の自動 compose

通常、`compose` を手で実行することはありません。session-start 相当のフックを持つ各
ハーネスは、セッション開始時に `amadeus-plugin.ts compose --if-stale` を呼ぶ自動
compose を配線しています。`--if-stale` 高速路により、合成レコードが既に最新のセッション
は数回の `existsSync` プローブだけで再 compose せずに戻るため、通常ケースでフックは
起動レイテンシを増やしません。フックの失敗は stderr 警告 1 行と exit 0 であり —
プラグインの問題がセッションをブロックすることはありません。

8 つのパッケージ面すべてがこのトリガーを配線します。Kiro CLI と Kiro IDE は同じ
`.kiro` host tree を共有するため、8 面は 7 個の host directory を対象にします。

| 面 | session-start トリガー | 自動 compose |
| --- | --- | --- |
| `claude` | `SessionStart` | 配線あり |
| `codex` | `SessionStart` | 配線あり |
| `cursor` | `sessionStart` | 配線あり |
| `kimi` | `SessionStart` | 配線あり |
| `kiro` | `agentSpawn` | 配線あり |
| `kiro-ide` | `promptSubmit`(`--if-stale` で冪等) | 配線あり |
| `opencode` | JavaScript plugin の `session.created` event | 配線あり |
| `pi` | extension の `session_start` event | 配線あり |

OpenCode は shell hook ではなく公式 JavaScript/TypeScript plugin event を使います。既存の
`.opencode/plugins/amadeus-opencode-plugin.ts` が `session.created` を処理し、`.opencode`
だけを再調整します。失敗は他 adapter と同様に可視の非ブロッキング警告になります。

---

## `--doctor` のプラグイン節

`/amadeus --doctor` には読み取り専用のプラグイン節が含まれます。これは既存 3 エンジン
リード(診断・合成 revision・drops レコード)の純粋な射影であり — 新しいスキャンも
新しい判定も行いません。各行は状態を pass/fail 寄与へ写像します。

| 状態 | 意味 | doctor |
| --- | --- | --- |
| `ok` | compose 済みでレコードと一致(`composed@<rev>`) | 可視・通過 |
| `drift` | 共有ファイルが記録された合成から乖離 | 可視・通過 |
| `advisory` | レコードが持つ drop 時 advisory | 可視・通過 |
| `degraded` | レコードが degraded と印を付けた面・drop | **loud fail** |
| `recovery-pending` | クラッシュが回復保留を残した(`run compose to recover`) | **loud fail** |
| `unknown` | 既知集合外の status・severity(fail-closed) | **loud fail** |

プラグイン 0 件のホストは単一の通過行 `Plugins: 0 installed` に degrade するため、
プラグイン節がプラグイン非対応プロジェクトの健全な `--doctor` exit を反転させることは
ありません。既知集合外のエンジン status・drop severity は信頼も暗黙破棄もされず —
チェックを fail させる `unknown` 行としてレンダリングされます。

---

## プラグインのホストへのインストール

パッケージャは 7 面それぞれに対し、面ごとの **インストールバンドル** と、面のホスト
クラスで分岐する手順を持つトップレベル `INSTALL.md` を出力します。

- **`native-manifest`**(`claude`)— ホストのプラグインマーケットプレイス経由で
  `.claude-plugin/plugin.json` を使ってインストール。自動 compose は `hooks/hooks.json`
  から走ります。
- **`folder-drop-auto`**(`codex`・`cursor`・`kimi`・`kiro`・`kiro-ide`・`pi`)— バンドルの
  `plugins/<name>/` を、プロジェクトルート配下の
  `<ハーネスディレクトリ>/.amadeus-plugin-src/<name>/`(Codex なら
  `.codex/.amadeus-plugin-src/<name>/`)へコピー。ここが `compose` の走査先であり、
  エンジンが合成済みプラグインステージを読み戻すルートでもあります。自動 compose は
  `hooks/auto-compose.snippet` から配線されます。
- **`native-plugin-auto`**(`opencode`)— JavaScript plugin が `session.created` を受け、
  同じ現在host再調整を呼び出します。

`install` verb はトランザクション化された 1 操作です。project `plugins/<name>/` へ供給元を
永続化し、現在の harness staging を生成し、共通 engine で compose した後、最後に昇順の
project 選択を書きます。`drop` は安全な host drop の成功後だけ名前を除去し、再選択用の
project 供給元は残します。

```
/amadeus plugin install path/to/plugins/example
```

プラグイン名はソースフォルダの basename で、staging されたコピーは
`<host>/.amadeus-plugin-src/<name>/` に置かれます。同一バイト列に対する再実行は冪等です。
同名で staging 済みの *別* プラグインは上書きされず拒否されます。`--force` はそれを置換し、
先に drop する選択肢もあります。ソース中のシンボリックリンクは 1 本ごとに stderr 行を
出してスキップされ、追跡されません。compose の失敗はそのまま返るため、失敗した stage が
そのまま見えます。

compose は、出力ディレクトリが空か、同一プラグイン・同一ハーネスの自分自身の以前の
投影である場合を除き、書き込みを拒否します。既存の非空ディレクトリ、*別* プラグイン・
別ハーネスの投影、通常ファイル、シンボリックリンク、壊れたシンボリックリンクがターゲット
にある場合は、それぞれ固有の理由で拒否されます — 生の filesystem スタックにも上書きにも
なりません。

---

## 安全契約

以下の保証は利用者に見え、あらゆる compose と drop で成立します。

- **上書きなし。** プラグインはホストが既に所有するファイルを決して上書きしません。
  所有パスの衝突や重複するフラグメント id は、書き込み前に拒否されます。
- **宣言物限定の変更。** 生成・検出・除去されるのはプラグインの宣言ステージ・シーム・
  フラグメントだけです。無関係なホストバイト、合成レコード外のパス、利用者オーサリング
  内容には一切触れません。
- **失敗時不変。** 拒否された inspect、失敗した self-heal 検証、あらゆる commit 失敗は、
  ホストバイト・合成レコード・監査ログを元のまま残します。同名ステージ・不正マニフェスト・
  unknown seam は loud に失敗します — サイレント成功や advisory にはなりません。
- **アトミックな回復。** 操作途中のクラッシュは、次操作時にワークスペースロック下で
  pre-state へ回復されます。ジャーナルや preimage の破損は loud に停止し、解消まで新規
  compose/drop をブロックします。
- **レコード所有の drop。** drop は合成レコードがプラグインに帰属させたものだけを
  除去します。共有ファイルが記録された合成から drift していれば、推測せず drop を拒否
  します — あなたの編集がサイレントに破棄されることはありません。
- **ファイルシステムのベースライン復元。** drop は、compose がプラグインのために作成した
  ディレクトリ(`plugins/<name>/stages/` とその親)が空になった時点で除去し、ホストツリーを
  compose 前の構造へ戻します。中身が残っているディレクトリには触れません。ハーネス
  ルートのエンジン dot-state — `.amadeus-plugin-drops.json` を含む — はホスト面ではなく
  監査データであり、drop 後に残存することがあります。その残存はベースライン復元の失敗とは
  判定されません。

---

## 見送っている面

以下は今日のプラグインシステムの一部では意図的に **ありません**。これらを前提とする
マニフェストはスコープ外で、本ガイドもサポート済みとして提示しません。

- マーケットプレイスやリモートプラグイン取得、
- ロックファイルやバージョン固定解決、
- `agents`・`scopes`・`memory`・`knowledge` の合成、
- 貢献に対する条件付き `when` 評価。

プラグインが合成するのはステージ・4 つの名前付きシーム・アンカー付きフラグメントだけ
です。上記はいずれも現在の機能ではなく将来の機能として扱ってください。

---

## advisory

プラグインの manifest は *advisory* を宣言できます。advisory は、エンジンがステージの
チェックポイントでプラグイン自身の evaluator を実行して評価する名前付きチェックです。
advisory は促しであって行動ではありません — エンジンが提示し、doctor が一覧に載せ、
判断はあなたが行います。advisory が立てた hold を解除できるのは宣言元プラグインの
evaluator だけなので、勝手に何かが実行されることも、state が書かれることもありません。

現在 Amadeus に同梱されるプラグインで advisory を宣言するものはありません。したがって
既定のインストールではこの経路は休眠しており、advisory を供給するプラグインを導入する
まで advisory を目にすることはありません。エンジン側はそのまま、供給されれば動きます。

---

## プラグインの検証

検証はローカルかつ一時的です — プラグインを試すためにコミット済みツリーを変更する
ことはありません。リファレンスライフサイクルテストがモデルです。canonical ソースを
使い捨ての一時ワークスペースへコピーし、パッケージャのソース/出力ルートをそこへ
リダイレクトし(`AMADEUS_PLUGINS_ROOT` / `AMADEUS_DIST_ROOT`)、全面へ投影し、
一時ホストへ compose し、doctor を実行し、drop します。宣言物だけが生成・検出・除去
され、tracked tree に一時ファイルが 1 つも残らないことを assert します。

リファレンスプラグインを動かすには:

```
bun test tests/integration/t254-reference-plugin-lifecycle.test.ts
```

自作プラグインをオーサリングするときも同じ形に従ってください。ライフサイクルを一時
ワークスペースで駆動し、宣言物限定の契約を assert し、その後 `git status` がクリーンで
あることを確認します。

---

## import する全モジュールを宣言する

compose されたプラグインは、`plugin.json` が宣言したファイルだけを運びます。したがって
宣言済みツールが import しているのに `tools` へ載せ忘れたヘルパーモジュールは、単なる
記載漏れではなく、compose 後の全ホストにおける import 欠落です。ファイルがディスク上に
そのまま在る自分の作業ツリーではロードでき、実際にインストールされた先で失敗します。

パッケージャはこれを **import-closure guard** で塞ぎます。manifest が宣言する各ツールを
起点に *相対* import(`./x.ts`・`../y.ts`)の推移閉包を辿り、到達した全モジュールが
`plugin.json` に宣言され、かつプラグイン自身のソースとして実在することを要求します。
`node:crypto` のような bare specifier はランタイムがプラグインツリーの外から解決するため
対象外で、絶対指定は境界違反として報告されます。

guard は投影の一部として走るため、壊れた面を出荷する代わりにビルドが失敗します。
allowlist も skip フラグもありません — モジュールは宣言され所有されることで通り、
そうでなければ通りません。読めない参照は閉包から取り除かれるのではなく failure として
列挙されます。これが、import パスの typo が検査対象集合を無言で縮めることを防ぎます。

失敗は違反参照ごとに1行、プラグイン名を前置して出力されます。最初の1件で止まらず、
修復すべき集合が一度に列挙されます。

```
MISSING from my-plugin plugin.json: plugins/my-plugin/tools/helper.ts
MISSING from my-plugin owned sources: plugins/my-plugin/tools/helper.ts
UNREADABLE import in my-plugin: plugins/my-plugin/tools/typo.ts
```

3つの異なる修復として読みます。`MISSING from … plugin.json` は、ファイルはプラグイン内に
実在するが manifest が運んでいない — `tools` へ追加します。`MISSING from … owned sources`
は、manifest が名指すパスに対応するファイルがプラグイン内に無い状態です。
`UNREADABLE import` は参照自体が解決できなかった場合で、ファイル不在・不正なパス・
実体がリポジトリ外へ出る symlink のいずれかです。

guard の実体は `scripts/import-closure-guard.ts` にあります。内部構造とテスト配置は
[コントリビュート](../reference/11-contributing.ja.md#プラグイン-import-closure-guard)
を参照してください。

---

## 8 つのパッケージ面、6 つのセルフインストール面

パッケージャは各プラグインを **8 つ** のハーネス面へ投影します: `claude`・`codex`・
`cursor`・`kiro`・`kiro-ide`・`opencode`・`kimi`・`pi`。セルフインストール(ハーネスを
プロジェクトルートへ反映すること)は **閉じた 6 面** のままです: `claude`・`codex`・
`cursor`・`opencode`・`kimi`・`pi`。`kiro`・`kiro-ide` はパッケージされますがプロジェクト
ルートへは決して昇格しません。2 つのマトリクスは別々の期待集合に対して検証され、一方が
他方の代替に使われることも、6 面がパッケージ面の集合へ広げられることもありません。
