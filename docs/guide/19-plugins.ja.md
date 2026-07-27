# プラグイン

> 言語: [English](19-plugins.md) | **日本語**

**プラグインは、フレームワーク本体を編集せずに、1 つ以上のステージ・シームエントリ・
プロズフラグメントをホストワークスペースへ追加する、小さな手書きのバンドルです。**
`plugins/<name>/` 配下に一度オーサリングすれば、パッケージャが全ハーネスへ投影し、
ホスト合成エンジンがワークスペースへマージし、状態を報告し、再び除去します — すべて
可逆で、ワークスペースが既に所有するものを一切上書きしません。

この章は利用者向けリファレンスであり、オーサリングガイドです。プラグインシステムが
現在サポートする面、そのコマンドライン面、セッション起動時にプラグインがホストへ自動
compose される仕組み、利用者に見える安全契約、ローカルでの検証手順、そして 7 つの
パッケージハーネス面と 5 つのセルフインストール面の違いを記述します。これはいかなる
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
   し、各プラグインを 6 つのパッケージハーネスツリーとハーネス中立バンドルへ投影
   します。プラグインが 0 件のとき、出力はプラグイン非対応ビルドと byte-identical
   です。
3. **inspect** — 合成エンジンが discover 済みプラグインをホストスナップショットと
   照合し、判定前に *すべて* の問題(同名ステージ・不正マニフェスト・unknown seam・
   clobber)を収集します。問題が 1 件でもあれば拒否し、プランは作りません。
4. **compose** — クリーンなプラグインは単一の三面アトミックトランザクションとして
   適用されます。ホストバイト・合成レコード・監査エントリを一括で書くか、まったく
   書かないかのいずれかです。合成レコードには明示 trust grant(plugin、content
   digest、timestamp)と各所有 stage の digestを永続化します。
5. **doctor** — 読み取り専用の診断が、現在のホスト状態から各アクティブプラグインの
   状態(`composed`・`drift`・`recovery-pending`)を射影します。
6. **drop** — レコード所有の除去が、プラグインの所有ファイルを削除し、各共有ファイルを
   base と *残り* のプラグインの貢献から再構築します。

---

## CLI

ホスト側の操作はすべて、ハーネス中立 CLI `amadeus-plugin.ts` の verb です。ハーネス
ツリーへ配布されたコピー経由で実行します — Claude Code なら次のとおりです。

```
bun .claude/tools/amadeus-plugin.ts <verb> [flags]
```

他のハーネスは各自のディレクトリ(`.codex`・`.cursor`・`.kimi` など)に置き換えます:
`bun <harness-dir>/tools/amadeus-plugin.ts <verb>`。verb は次のとおりです。

| verb | 動作 | exit |
| --- | --- | --- |
| `compose [--if-stale] [--project-root <dir>]` | 全インストール済みプラグインを単一のアトミックトランザクションとしてホストへ適用。`--if-stale` は合成レコードが既に最新なら即座に戻る no-op 高速路。 | 成功・no-op で `0`、適用失敗で `1` |
| `doctor [--project-root <dir>]` | 各 compose 済みプラグインの状態(`ok`・`drift`・`recovery-pending`)を表示。 | 健全なら `0`、degraded / recovery-pending があれば `1` |
| `drop <plugin-name> [--project-root <dir>]` | 1 プラグインの所有ファイルを除去し、残りのプラグインから共有ファイルを再構築。 | 成功で `0`、拒否・失敗で `1` |
| `status [--project-root <dir>]` | 件数(installed・composed・監査 revision)を表示。 | `0` |

`--project-root <dir>` はカレントディレクトリ以外のワークスペースを対象にします — CLI
が存在する場所以外のホストへ compose する手段で、パッケージされるがセルフインストール
されない `kiro` / `kiro-ide` 面では常に必要です。

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

7 つのパッケージ面のうち 6 面がこのトリガーを配線し、1 面は配線しません。

| 面 | session-start トリガー | 自動 compose |
| --- | --- | --- |
| `claude` | `SessionStart` | 配線あり |
| `codex` | `SessionStart` | 配線あり |
| `cursor` | `sessionStart` | 配線あり |
| `kimi` | `SessionStart` | 配線あり |
| `kiro` | `agentSpawn` | 配線あり |
| `kiro-ide` | `promptSubmit`(`--if-stale` で冪等) | 配線あり |
| `opencode` | なし(`chat.message` のみ) | **degraded — 手動のみ** |

`opencode` は `manual-only` クラスで、session-start シームを持たないため、唯一の契約は
手動 `compose` 床です。面がサイレントにスキップされることはありません — degrade は
doctor(後述)を通じて loud に表面化し、この面での `doctor` は `[degraded] opencode: no
session-start trigger — run 'amadeus-plugin.ts compose' manually` を出します。

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
- **`folder-drop-auto`**(`codex`・`cursor`・`kimi`・`kiro`・`kiro-ide`)— バンドルの
  `plugins/<name>/` を `<harness-dir>/plugins/<name>/` へコピー。自動 compose は
  `hooks/auto-compose.snippet` から配線されます。
- **`manual-only`**(`opencode`)— フォルダをコピー。セッションフックがないため、
  インストール後および全プラグイン変更後に `compose` を実行します。

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

## activation ポリシー: formal-model-check

同梱の `formal-model-check` プラグインは *advisory のみ* です。Amadeus はその spec
ファイル(`specs/tla/**`)の決定的ハッシュを計算し、最後に記録された verdict と比較
します。ハッシュが変化した場合 — または一度も記録されていない場合 — エンジンは
build-and-test の前に stderr のみの advisory をレンダリングし、doctor は
`formal-model-check: spec-hash CHANGED` の activation 行を追加します。モデルチェッカ
(TLC)を自動実行するものは何もなく、勝手に state を書くものも何もありません: advisory は
spec が drift したことを知らせ、*あなた* がチェック再実行を判断できるようにするものです。
ハッシュが一致するとき advisory は silent です。

---

## プラグインの検証

検証はローカルかつ一時的です — プラグインを試すためにコミット済みツリーを変更する
ことはありません。リファレンスライフサイクルテストがモデルです。canonical ソースを
使い捨ての一時ワークスペースへコピーし、パッケージャのソース/出力ルートをそこへ
リダイレクトし(`AMADEUS_PLUGINS_ROOT` / `AMADEUS_DIST_ROOT`)、6 面すべてへ投影し、
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

## 7 つのパッケージ面、5 つのセルフインストール面

パッケージャは各プラグインを **7 つ** のハーネス面へ投影します: `claude`・`codex`・
`cursor`・`kiro`・`kiro-ide`・`opencode`・`kimi`。セルフインストール(ハーネスを
プロジェクトルートへ反映すること)は **閉じた 5 面** のままです: `claude`・`codex`・
`cursor`・`opencode`・`kimi`。`kiro` と `kiro-ide` はパッケージされますがプロジェクト
ルートへは決して昇格しません。2 つのマトリクスは別々の期待集合に対して検証され、一方が
他方の代替に使われることも、5 面が 7 面へ広げられることもありません。
