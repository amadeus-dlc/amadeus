# テスト

> 言語: [English](09-testing.md) | **日本語**

## 概要

AI-DLC のテストスイートは **完全に TypeScript** です — すべてのテストは
`bun` の下で実行される `t*.test.ts` ファイルであり、シェル(`.sh`)テストファイルは
ゼロです。これは構成によるプラットフォーム不変性の保証です: 同じファイルが
macOS、Linux、ネイティブ Windows で同一に実行されます。

スイートは **4つのレベル** — `smoke`、`unit`、`integration`、
`e2e` — に構成され、それぞれ `tests/` 配下に1つのディレクトリを持ちます。この4レベルは、
速度と網羅性のバランスを取る古典的な3層テストピラミッドにマッピングされます:

```
            /\
           /  \    ACCEPTANCE — フルワークフロー、成果物 + 体験の検証
          / L3 \   Level: e2e  ·  When: リリース前 (--release / --all)
         /------\
        /        \
       /   L2     \  STAGE — スタブ入力による個別ステージ、成果物を検証
      /------------\ Level: integration  ·  When: CI push (--ci, 全 PR)
     /              \
    /      L1        \  PROTOCOL — 契約、構造、相互参照
   /------------------\ Levels: smoke + unit  ·  When: あらゆるローカル変更
```

`--ci` プロファイルとフラグなしのデフォルトは、いずれも **smoke + unit +
integration** を実行します(したがって integration レベルはすべてのローカル
`bun tests/run-tests.ts` に相乗りします)。`--release` / `--all` は `e2e` を追加します。上記のピラミッドは
各レベルが概念的にどこに位置するかを示します — 実際にそれらを選択するのは
以下のプロファイルフラグです。

**ファイル名規約。** テストのファイル名は `t<NN>[-description].test.ts` です —
それが置かれているレベルディレクトリと、任意の人間可読な説明だけです。名前に
**メカニズムセグメントはありません**: テストのメカニズム(CLI を起動するか、SDK を
駆動するか、ライブ TUI をレンダリングするか)は、ファイル名で宣言されるのではなく、
本体が実際に呼び出すドライバから計算される *派生セット* です。各テストが何をカバーするかの
機械チェック済みインデックスは、ここに手動保守されるテーブルではなく、
`tests/.coverage-registry.json`(`tests/gen-coverage-registry.ts` が
ディスク上の `covers:` ヘッダから生成)に存在します — 後述の
[テストレジストリ](#test-registry)を参照。

## テストサイズと層の純度

すべてのテストは **独立した** 2つの軸で記述されます。この2軸を分離しておくことが、
カバレッジを偽らずにスイートを高速に保つ鍵です。

- **スコープ / 階層** — テストが置かれているディレクトリ(`smoke`、`unit`、
  `integration`、`e2e`)。*システムのどこまでを結線して動かすか* に答えます。
- **サイズ** — テストの動的な実行時の振る舞い(`small`、`medium`、`large`):
  プロセス内に留まるか、それともプロセスを spawn する・ファイルシステムに触れる・
  タイマーを待つ・ソケットを開くか。テストピラミッドの本当の段は、ディレクトリ
  **ではなく** サイズです(t_wada、Google SWE 14章)。

**階層の責務(現行)。**

- **smoke** — 構造的な fail-fast ゲート: ファイル存在、パーミッション、設定、命名。
  あらゆるローカル変更で実行し、破綻したら早期に abort します。
- **unit** — 純粋・プロセス内の契約: ステージフロントマター、グラフ整合性、
  フックロジック、関数直接呼び出しで駆動する分類器/ゲートのシーム。
- **integration** — 決定論的フィクスチャによるコンポーネント横断の契約と、
  ライブのステージ/CLI ユーティリティ。
- **e2e** — フルライフサイクル、worktree、レンダリング済みターミナルのジャーニー。
  リリース前に実行します。

**サイズは宣言でなく導出。** ファイルのサイズは
[`tests/lib/test-size.ts`](../../tests/lib/test-size.ts) の `classifyTestSize`
が計算します — ファイル自身のソース(コメント除去後)を走査し、次の4つのシグナル
クラスを検出する決定論的な静的シグナルプロキシです:

| シグナルクラス | それが強制する最小サイズ |
| --- | --- |
| ネットワーク(`node:net/http/…`、`WebSocket`、`fetch`、`.listen`) | large |
| プロセス spawn(`child_process`、`spawn*`、`Bun.spawn`、`node-pty`) | medium |
| ファイルシステム(`node:fs`、`readFileSync`、`mkdtempSync`、…) | medium |
| タイマー / 待機(`setTimeout`、`setInterval`、`Bun.sleep`) | medium |

いずれも持たないファイルは `small` です。サイズ順序(`SIZE_ORDER`)、シグナル
パターン、および助言的な wall-clock 帯(`WALL_CLOCK_BANDS`。ランナーの動的ドリフト
レポートが使用)は、いずれもそのモジュールに **一度だけ** 定義されています —
本ページは数値しきい値を意図的に再記載しません。コードが唯一の正典です。ファイルは
`// size:` ヘッダで意図するサイズを宣言してもよく、ドリフトガードがそれを計測サイズと
突き合わせます。

**層 × サイズの純度。** 各階層は含んでよい最大サイズを持ちます:

| 階層 | 最大サイズ | 規約 |
| --- | --- | --- |
| unit | small | `unit` テストはプロセス内に留まること |
| integration | medium | spawn / fs 接触は想定内。ネットワークは不可 |
| e2e | large | 上限なし |
| smoke | —(除外) | ピラミッド軸から **外す** |

`smoke` は意図的に除外します: その各ファイルは、ファイルを読み・ランナーを spawn
して存在・設定・パーミッションをアサートする構造的ゲートであり、本質的に `medium`
です。それらを grandfather 化するのではなく軸から外すことで、軸を誠実に保ちます。

**強制。** 上記の規約は単なる散文ではありません。`tests/unit/t-test-size-drift.test.ts`
がすべてのテストファイルを計測し、階層の最大サイズを超えたら CI を赤にします。
既知・未是正の `unit`×非 small ファイルは、生成されるラチェット許容リスト
(`tests/.test-size-purity-allowlist.json`)で grandfather 化されます。許容リストは
ライブの違反集合と厳密に一致しなければならないため、是正が進むにつれて **縮小のみ**
可能です — 新規の非 small な `unit` テストや、水増しされた許容リストはガードを
赤にします。許容リストは `classifyTestSize` から生成され、手書きしません。

> **Refs.** 導出サイズの方式と純度ラチェットは #684(テストピラミッド施策)と
> #837 complexity-gate のベースライン様式に由来します。FR-3 の smoke 除外裁定は
> intent の requirements に記録されています。経緯はそちらにあります — 本節は
> 現行の契約のみを述べます。

## レイヤー1: Protocol(あらゆる変更、LLM なし、秒単位)

LLM を呼び出さずにオーケストレーターの構造的正しさを検証します。これらがパスすれば、プロトコルは内部的に整合しています — ステージは有効なファイルを参照し、入出力が正しくチェーンし、ルーティングテーブルがステージファイルと一致します。

**レベル:** smoke、unit、integration

**テスト対象:**
- ファイル存在、パーミッション、命名規約(smoke)
- フックスクリプト(bun 経由の 11 個の TypeScript)、ステージフロントマター、ナレッジインベントリ(unit)
- スコープ-ステージマッピング、グラフ整合性、ステージ I/O 契約チェーン、プロトコル準拠(integration)
- ステージ出力からステップへの検証: 宣言されたすべての出力が指示ステップで参照されている(integration、`amadeus-validate.ts` CLI ツール経由で決定論的)

**実行:** `bun tests/run-tests.ts`(デフォルト、フラグ不要)。`bash tests/run-tests.sh` は既存の POSIX コマンド向けの互換ラッパーです。

## レイヤー2: Stage(CI push、LLM、分単位)

既知のワークスペース + 状態フィクスチャで個別ステージを分離して実行します。各ステージが決定論的入力を与えられたときに正しい成果物を生成することを検証します。

**レベル:** integration

**テスト対象:**
- プリフライトヘルスゲート: Claude CLI が PATH 上にある、AWS 認証情報が有効、Claude が応答する(exit 0)、応答が非空(preflight)
- CLI ツールのユーティリティハンドラ: intent-birth、--doctor、--status、--stage、--phase(integration)
- greenfield/brownfield スタブによる個別ステージ、成果物検証(integration)

**実行:** `bun tests/run-tests.ts --ci`

## レイヤー3: Acceptance(リリース、LLM、時間単位)

フルワークフローを実行し、体験を検証します: 状態遷移を超えて、成果物の内容、ステージ横断の一貫性、ドメインの正しさをチェックします。

**レベル:** e2e

**テスト対象:**
- brownfield スタブ + 成果物アサーションによる完全な bugfix ライフサイクル
- greenfield スタブ + 成果物アサーションによる完全な POC ライフサイクル
- 状態進行、スコープルーティング、監査の完全性、ジャンプ機構
- ステージ指示品質の LLM 意味的レビュー(明確さ、論理的流れ、曖昧さ検出)

**実行:** `bun tests/run-tests.ts --release`

## クロスプラットフォームカバレッジ

テストスイートは、ネイティブな Bun ランナーを通じて macOS、Linux、Windows で実行されます:

```bash
bun tests/run-tests.ts [--ci | --all --debug -P 8]
```

`bash tests/run-tests.sh ...` は POSIX 互換ラッパーとして残り、同じ TypeScript ランナーに委譲します。ランタイムでは、この実装のフック、CLI ツール、テストランナーは `bun` を必要とします。Bash はもはや主要なランナー基盤ではありません。

**スイートに焼き込まれた移植性制約:**

- **パス**: `tests/harness/fixtures.ts` の `createTestProject` は、一時プロジェクトパスを正規化し、JSON とネイティブ `bun` を通じてクリーンにラウンドトリップするようにします。
- **インプレース編集**: テストでは TypeScript のファイル書き込みを優先します。シェルヘルパーが避けられない場合、BSD/GNU 固有の `sed -i` 形式を避けます。
- **`grep -qiF`**: Git Bash には `-i` と `-F` の組み合わせに関する既知のバグがあります。パターンに正規表現メタ文字がなければ `-i` 単独を使います。テストは修正前の t16 でこれに遭遇しました。
- **`tar` アーカイブ**: macOS の `tar` はデフォルトで `._*` AppleDouble サイドカーファイルを注入します。クロスプラットフォームなテスト実行のためにソースをバンドルするときは、`COPYFILE_DISABLE=1 tar …` または `git archive` を使います。
- **Windows での LLM タイミング**: Windows EC2 からの Bedrock 呼び出しは、macOS からよりも大幅に遅くなることがあります(初回呼び出しのコールドスタート、MSYS のプロセスフォークのオーバーヘッド)。SDK/tui テストはドライバの結果サーフェスをアサートし、ランナーの preflight/ファイルごとの Claude ゲートに、基盤の不在と実際の失敗を切り分けさせるべきです。

**Windows でスイートを手動実行する:**

1. `bun`、Node.js、Claude Code CLI をインストールします。
2. フルスイートまたは POSIX ラッパー互換 smoke を実行する場合は Git for Windows をインストールします。ネイティブランナーのパス自体は Bash を必要としません。
3. e2e TUI テストのために、node が `node-pty` と `@xterm/headless` を解決できるよう、npm で開発依存をインストールします。
4. `AMADEUS_NODE_BIN` を具体的な `node.exe` パスに設定し、フルアクセプタンス実行のために `AMADEUS_TUI_LIVE=1` を設定します。
5. `bun tests/run-tests.ts --all --debug -P 8` を実行します。

WSL や Docker は不要です。サポートされる検証基盤はネイティブ Windows です。

**再現可能な MR10 Windows EC2 ランブック:**

1. SSM アクセスを持つ使い捨ての Windows Server 2022 ホストを立ち上げます:

   ```bash
   aws cloudformation deploy \
     --stack-name amadeus-windows-test \
     --template-file tests/harness/windows/windows-test.cfn.yaml \
     --capabilities CAPABILITY_NAMED_IAM \
     --parameter-overrides VpcId=vpc-... SubnetId=subnet-...
   ```

2. テスト対象のコミット済み git ツリーを同期します:

   ```bash
   bun tests/harness/windows/sync.ts --stack-name amadeus-windows-test HEAD
   ```

3. ボックスにリポジトリの開発依存をインストールします:

   ```bash
   bun tests/harness/windows/ssm-run.ts --stack-name amadeus-windows-test -- \
     powershell -ExecutionPolicy Bypass -File C:\amadeus\tests\harness\windows\setup.ps1 -ProjectDir C:\amadeus
   ```

4. ライブ TUI を有効にして Windows `--all` ゲートを実行します:

   ```bash
   bun tests/harness/windows/ssm-run.ts --stack-name amadeus-windows-test -- \
     powershell -ExecutionPolicy Bypass -File C:\amadeus\tests\harness\windows\run-all.ps1 -ProjectDir C:\amadeus -Parallel 8
   ```

5. ホストを破棄します:

   ```bash
   aws cloudformation delete-stack --stack-name amadeus-windows-test
   ```

`run-all.ps1` は `bun tests/run-tests.ts --all --debug -P <N>` を呼び出す前に `AMADEUS_NODE_BIN` と `AMADEUS_TUI_LIVE=1` をエクスポートするため、グリーンの結果がライブ TUI ジャーニーを黙ってスキップして得られることはありません。ネイティブインストーラは CloudFormation UserData ブートストラップを実行したユーザー(EC2Launch v2 では Administrator)のもとに `claude.exe` を配置するため、`C:\Users\Administrator\.local\bin` と systemprofile ホームにまたがって claude バイナリを探索します。

スタックのデフォルトは **`c5.4xlarge`** です — フルの `--all -P 8` ライブ実行に実証済みのサイズです。e2e 層はテストごとに `bun:test` タイムアウトを持ち(Bolt-worktree ライフサイクルテストは c5.4xlarge で 5s の予算のうち ~5.5s に達します)、そのため小さいボックス(例: `t3.large`)は並列負荷下で決定論的な Bolt/ランタイムテストを偽のタイムアウトに陥らせます。より軽い層の選択を実行するときにのみ、`InstanceType` パラメータを縮小します。

## プリフライト検証

フィルタなしのライブ実行可能レベル(integration または e2e)を実行する前に、ランナーは `tests/integration/t19.test.ts` をゲートとして実行します。これは **Claude Agent SDK** を通じて小さな実際のターンを駆動し(integration 層が使うのと同じライブ経路)、決定論的なサーフェスのみをアサートします。プリフライトが失敗した場合、決定論的ファイルは依然として実行され、Claude 依存のファイルはファイルごとの `SKIP` エントリでスキップされます。

| アサーション | サーフェス | 失敗時 |
|-----------|---------|--------|
| AWS 認証情報が有効 | `aws sts get-caller-identity` が exit 0(`aws` CLI が不在のときは PASS-by-skip) | bail — Bedrock は IAM 認証を必要とする |
| ライブターンが終端結果に到達 | SDK 実行が非 `undefined` の `resultEvent` を生成する(層が必要とするバイナリが存在し到達可能) | bail — 基盤/API に到達不能 |
| ターンがエラーなく完了 | `resultEvent.is_error === false`(`claude -p` exit 0 の決定論的な等価物。124/137 ハングでは undefined のまま) | bail — API 無応答 |
| 応答が非空 | 実行が *何らかの* 出力を捕捉した — `tool_result` またはアシスタントテキスト(存在のみ、内容は問わない) | bail — API が何も生成しなかった |

ここでのレッドは実際の環境所見(`claude` の欠落、期限切れの認証情報)であり、和らげるべきフレークでは決してありません — まさにゲートの仕事である、下流の LLM 層を素早く bail することです。

## テストレジストリ

スイートは **登録されるのではなく、発見されます**: `bun tests/run-tests.ts` は
4つのレベルディレクトリ(`tests/{smoke,unit,integration,e2e}/`)を走査し、見つかった
すべての `t*.test.ts` を実行します。同期を保つべき手動保守のテストごとのテーブルは
ありません — テストファイルを追加するだけで、ランナーがそれを拾います。

各テストが何を *カバー* するかは、
**`tests/.coverage-registry.json`** で機械的に追跡され、
`bun tests/gen-coverage-registry.ts` がテストファイルの先頭コメントブロック
(通常は1行目。いくつかのファイルは正当に何も宣言せず、単にカバレッジの主張を
提供しません)の `covers:` ヘッダから生成します。ジェネレータはフレームワークの
ユニットを7つのクラス(`function`、`audit`、`scope`、`stage`、`hook`、`subcommand`、
`render-surface`)にわたって列挙し、各 `covers:` の主張を列挙されたユニットにマッピングし、
カバレッジカウントとラチェットフロアを発します。ドリフトの再生成と検証:

```bash
bun tests/gen-coverage-registry.ts          # ディスクからレジストリを書き直す
bun tests/gen-coverage-registry.ts --check  # コミット済みレジストリが古い場合は失敗
```

`tests/.coverage-registry.json` は権威ある機械チェック済みのインデックスです —
どのテストが特定の関数、監査イベント、スコープ、ステージ、フック、サブコマンド、
レンダーサーフェスを行使するかを見つけるには、これを参照します(または `covers:`
ヘッダを直接 grep します)。`--check` モードはスイートに組み込まれており、ディスクから
ドリフトしたレジストリはゲートをレッドにします。

> **注:** t19 は unit(`tests/unit/t19.test.ts`、ジャンプ CLI
> ツール)と integration(`tests/integration/t19.test.ts`、ライブプリフライト
> ゲート)の両方に現れます — このような衝突は、素の ID ではなく、レベル/ファイルパスで
> 曖昧さを解消します。

## プロジェクトカバレッジゲート

`tests/coverage-project-gate.ts` は Codecov の project ステータスを置き換える
セルフホスト版のゲートです。CI(`coverage` ジョブ、`bun run coverage:ci` の直後)で
実行され、スイート全体の行カバレッジがコミット済みベースラインから下がりすぎた場合に
ビルドを失敗させます。

- **母集団。** ゲートの母集団は、ランナーが `coverage/coverage-totals.json`
  (`{ "schemaVersion": 1, "hits": <int>, "lines": <int> }`)に発する
  **正規化済み LCOV の合計**であり、カバレッジ HTML レポートを生成するのと同じ
  パースから書き出されます。したがって **LCOV が数えるものすべて**を数えます —
  Codecov の `ignore` リストが除外する `tests/**` などのパスも含みます。これは
  カバレッジ HTML ページに表示される数値と完全に同一です。
- **Codecov UI とは意図的に食い違う。** 母集団が Codecov のもの
  (`codecov.yml` の `ignore`/`fixes` を尊重する)と異なるため、ゲートの絶対
  パーセンテージは Codecov UI の project % と**一致しません**。これは想定どおりで
  問題ありません: このゲートの役割は外部ツールとの絶対的な一致ではなく、
  **変更前後の一貫性**です。絶対値は、同じ方法で計算された直前コミットの数値と
  比較されるだけです。
- **合格ルール。** ビルドは `current% >= baseline% − 0.02pp` のときにのみ合格します。
  判定は浮動小数点を使わず厳密な整数(BigInt)演算で計算されるため、ベースラインを
  ちょうど `0.02pp` 下回るカバレッジは合格し、そこから 1 ヒット下回ると失敗します
  (`DROP_EXCEEDED`)。emit の欠如、ベースラインの欠如、不正なファイル(誤った
  `schemaVersion`、負値・非整数、`hits > lines`)、空の母集団(`lines == 0`)は
  それぞれ固有の理由コードとともに stderr に出力して失敗します。
- **ベースラインの更新。** ベースラインは
  `tests/.coverage-project-baseline.json` にあります。PR がカバレッジを**改善する**
  場合、作成者は**その同じ PR 内で** `bun run coverage:ci` に続けて
  `bun tests/coverage-project-gate.ts --update`(実測した `hits`/`lines` を転記する
  — 数値を手書きしない)を実行してベースラインを再生成します。自動的なバンプは
  なく、ベースラインは人間がコミットしたときにのみ動きます。
- **ベースラインの引き下げ。** ベースラインを意図的に**引き下げる**(より低い
  カバレッジを受け入れる)には、**PR に記録された明示的なユーザー承認**が必要です —
  これは通常のリフレッシュではなく、意図的なポリシー判断です。

## トリガーポイント

| トリガー | レイヤー | コマンド | 場所 |
|---------|--------|---------|------|
| `git commit` | L1 | `bun tests/run-tests.ts` | ローカル(pre-commit フック) |
| CI パイプライン | L2 | `bun tests/run-tests.ts --ci` | CI/CD パイプライン |
| リリース / main へのマージ | L3 | `bun tests/run-tests.ts --release` | CI/CD パイプライン |

L1 は git pre-commit フックで強制できます: `bun tests/run-tests.ts || exit 1`。

## スタブ

### Greenfield スタブ: `tests/fixtures/greenfield-todo/`

ソースコードのないプロジェクト記述。ワークスペース検出は greenfield として分類します。ideation ステージのために LLM に決定論的な intent コンテキストを与えます。

内容: TypeScript と Vite による React Todo App を記述した `README.md` のみ。

### Brownfield スタブ: `tests/fixtures/brownfield-todo/`

最小限の React+TypeScript+Vite ソース(~10 ファイル、~200 LOC)。ワークスペース検出は brownfield として分類します。RE、requirements、design ステージが分析する具体的なコードを持ちます。

内容:
- `package.json` — react、react-dom、typescript、vite、vitest
- `tsconfig.json`、`vite.config.ts`、`index.html`
- `src/main.tsx`、`src/App.tsx`
- `src/types/todo.ts` — Todo インターフェース(id、title、completed)
- `src/components/TodoList.tsx` — リスト + 追加フォーム(~40 行)
- `src/components/TodoItem.tsx` — チェックボックス + タイトル + 削除ボタン
- `src/hooks/useTodos.ts` — addTodo、toggleTodo、deleteTodo

### RE 成果物フィクスチャ: `tests/fixtures/re-artifacts/`

下流ステージテストのための事前シードされた reverse-engineering 出力。セットアップ時にテストプロジェクトの intent レコードディレクトリ `$PROJ/amadeus/spaces/default/intents/<record>/inception/reverse-engineering/` にコピーされます。

内容: brownfield-todo アプリを記述した4つの最小限の .md ファイル(architecture-overview、technology-stack、codebase-analysis、integration-points)。

### Inception 成果物フィクスチャ: `tests/fixtures/inception-artifacts/`

construction にジャンプするテストのための事前シードされた inception フェーズ出力。セットアップ時に `$PROJ/amadeus/spaces/default/intents/<record>/inception/{requirements-analysis,application-design,units-generation}/` にコピーされます。

内容: Todo アプリを記述した7つの最小限の .md ファイル(requirements、components、component-methods、services、component-dependency、unit-of-work、unit-of-work-story-map)。ユニット名: `todo-core`。

### Construction 成果物フィクスチャ: `tests/fixtures/construction-artifacts/`

construction 中盤のステージ(例: code-generation)にジャンプするテストのための事前シードされた construction フェーズ出力。セットアップ時に `$PROJ/amadeus/spaces/default/intents/<record>/construction/todo-core/functional-design/` にコピーされます。

内容: todo-core ユニットのコンポーネント仕様と状態管理を記述した1つの最小限の .md ファイル(functional-design)。

## 状態フィクスチャ

| フィクスチャ | プロジェクトタイプ | スコープ | 状態 | 使用元 |
|---------|-------------|-------|------|--------|
| `state-pre-workspace-detection.md` | -- | feature | Welcome+scaffold 完了、次は workspace-detection | t70, t71 |
| `state-initialization-done.md` | Greenfield | feature | Init 完了、次は intent-capture | t73 |
| `state-brownfield-init-done.md` | Brownfield | bugfix | Init 完了、次は RE | t72 |
| `state-mid-inception.md` | Brownfield | bugfix | RE 完了、次は requirements-analysis | t74 |
| `state-mid-ideation.md` | Greenfield | feature | Intent+market 完了、次は feasibility | t08, t10, t11, t12, t20, t22, t24, t25, t37 |
| `state-construction.md` | -- | -- | Construction フェーズ | t07, t10, t11, t26, t57 |
| `state-operation.md` | -- | -- | Operation フェーズ | t07, t10, t11 |
| `state-completed.md` | -- | -- | 全ステージ完了 | t08, t11 |
| `state-jumped.md` | Brownfield | bugfix | ジャンプ履歴を持つワークフロー中盤 | t11, t37, t42 |
| `state-corrupted.md` | -- | -- | 無効/破損した状態 | t08, t10 |

## ステージテストの追加方法

1. テストするステージを選び、それが必要とする状態フィクスチャを特定します(状態はそのステージを現在/次のステージとして示していなければなりません)
2. `tests/fixtures/` に状態フィクスチャを作成または再利用します
3. `tests/integration/tNN-stage-SLUG.test.ts` を作成し、シェルの TAP ヘルパーではなく共有 TypeScript ハーネスヘルパー(`tests/harness/fixtures.ts`、`tests/harness/sdk-drive.ts`、または `tests/harness/tui-drive.ts`)を使います。
4. `bun tests/run-tests.ts --integration` で、または直接 `bun test tests/integration/tNN-stage-SLUG.test.ts` で実行します

## アクセプタンスアサーションの追加方法

`tests/e2e/` 配下の既存の e2e ワークフローテストに成果物アサーションを追加するには:

1. 現在のテストを読み、既に何をチェックしているかを理解します
2. 既存の `test(...)` ブロック内に `expect(...)` アサーションを追加します(bun:test
   は呼び出し自体からアサーションをカウントします — 同期を保つべき `plan` 行はありません)
3. 柔軟なパターンを使います: 完全一致の文字列ではなく、`readFileSync` の内容に対して
   `/[Tt]odo/` をマッチさせます
4. 非決定論的な LLM 出力形式に依存するアサーションには `test.skipIf(...)` /
   早期リターンを使います
5. サイズ境界チェックには `expect(statSync(path).size).toBeGreaterThan(minBytes)` を使います

## アサーション設計原則

- **キーワードクラス** — 大文字小文字を区別しない正規表現を使う: `[Tt]odo`、`[Rr]eact`、`[Bb]rownfield`
- **柔軟な発見** — 正確な名前をチェックするのではなく、`find` + `wc -l` でファイル数を数える
- **サイズ境界** — 最小コンテンツには `statSync(path).size` を `toBeGreaterThan()` とともに使う
- **グレースフルデグラデーション** — アサーションが非決定論的な LLM 出力に依存する場合は `skip` を使う
- **内容より構造** — 内容をチェックする前に、markdown 見出し(`^#`)、ファイル存在、ディレクトリ作成をチェックする

## 環境変数

| 変数 | デフォルト | 説明 |
|------|----------|------|
| `AMADEUS_TEST_TIMEOUT` | `1800` | `claude -p` 呼び出しごとのタイムアウト(秒)。`0` で無効化。 |
| `AMADEUS_TUI_SETTING_SOURCES` | `project` | ライブ `claude` TUI 起動に注入される設定ソース。ユーザー/ローカルの Claude 設定を意図的に含める焦点を絞ったキャリブレーションでのみ `default` または空値を使う。 |
| `AMADEUS_TUI_TRACE_POLL_MS` | `10000` | 長いジャーニーが次のメニューまたはディスク終端子を待っている間の、TUI NDJSON トレースにおける `answer_gate_poll` スナップショット間の最小間隔。 |

## CLI リファレンス

```bash
# エントリポイント
bun tests/run-tests.ts        # ネイティブなクロスプラットフォームランナー
bash tests/run-tests.sh       # POSIX 互換ラッパー

# レベルフラグ(組み合わせ可能)
--smoke         # 構造検証
--unit          # 単一コンポーネントの分離
--integration   # コンポーネント横断の契約とステージ/CLI ユーティリティ
--e2e           # フルライフサイクル、worktree、レンダリングされたターミナルジャーニー

# プロファイルフラグ(ショートカット)
(default)       # smoke + unit + integration
--ci            # smoke + unit + integration
--release       # smoke + unit + integration + e2e
--all           # --release と同じ

# 出力修飾子
--verbose       # テストごとのログを tests/logs/ に書き込む
--debug         # --verbose を含意。テストごとの出力をストリームし、SDK/TUI
                # ドライバトレースを tests/logs/ に書き込む
--filter PAT    # ファイル名が拡張正規表現 PAT にマッチするテストのみ実行
--parallel N    # 層内で最大 N 個のテストファイルを並行実行(エイリアス: -P N)。
                # デフォルト: 1(直列)。smoke と unit 層は常に直列。
```

ライブ SDK および TUI ハーネスドライバは、デフォルトで project-only の Claude 設定ソースを使います。
つまり、コピーされたテスト `.claude/` プロジェクト設定とフックを読み込み、開発者の
ユーザーレベルのフック/設定を除外します。これはインストール済みの
フレームワークサーフェスを反映し、ローカルの対話的設定がテストの挙動を変えるのを
防ぎます。明示的なドライバオプションまたは `AMADEUS_TUI_SETTING_SOURCES` が、
キャリブレーションのためのエスケープハッチとして残ります。

`--all --debug`(および `--release --debug`)は、環境が既に設定していない限り
`AMADEUS_TUI_LIVE=1` をデフォルトにします。これにより「すべてをトレース付きで」という
プロファイルは、ライブでトークンを消費する TUI ジャーニーをデフォルトで実行します。それらの
ファイルをテスト内 SKIP 経路に留めるには、`AMADEUS_TUI_LIVE=0` を明示的に設定します。

## 並列実行

`--parallel N`(または `-P N`)は、層内で最大 N 個のテストファイルを並行実行します。デフォルトは直列(`1`)です。

**役立つ場合。** integration と e2e レベルは、それぞれ壁時計時間の大半を `claude -p` サブプロセスの起動と LLM ターンに費やします。これらのテストは既にファイルシステム的に分離されており — `setup_integration_project` がテストごとに新しい `$PROJ` を足場にする — そのため互いに干渉することなく並んで実行できます。

**スパイク結果(2026-05-06、Bedrock 経由の Opus 4.7):**

| シナリオ | 直列 | `--parallel 4` | `--parallel 8` |
|---|---|---|---|
| 4 × `/amadeus --help` | 56s | 16s (3.5x) | — |
| 8 × `/amadeus --help` | — | — | 31s |

8 個の並列呼び出しすべてが `cache_read=73789` を観測しました — Bedrock のプロンプトキャッシュは並行ワーカー間で温かいまま保たれます。8-way でスロットリングや破損は観測されませんでした。

**直列のまま残るもの。** smoke と unit 層は `--parallel` を無視し、いずれにせよ直列で実行します。それらは既に秒単位で完了し、そのインターリーブされた出力は壁時計時間の利得なしにデバッグ性を損なうためです。プリフライトゲート(`tests/integration/t19.test.ts`)も、LLM 層がその終了ステータスに依存するため直列で実行します。

**並列下での出力。** `START` マーカーはライブでストリームします(最初の `DONE` の前に複数が連続して現れることがあります — それがワーカーが並行していることの可視信号です)。通常/verbose モードでは、各ワーカーの TAP 本体はバッファされ、ディレクトリミューテックス(`mkdir $LOG_DIR/.stdout.lock`、POSIX でアトミック — `flock` なしで macOS bash 3.2 で動作)の下で1つの連続ブロックとして stdout にフラッシュされます。したがって、異なるファイルからの `ok`/`not ok` 行が決してインターリーブせず、stdout は直列実行のように上から下へ読めます。ただしファイル完了順序は、ディスパッチ順ではなく各テストがどれだけ時間を要したかで決まります。`--debug` モードでは、Bun の stdout/stderr はテストごとのログに書き込まれつつライブでストリームします。並列デバッグ出力はファイルベース名でプレフィックスされ、重複するライブワーカーが帰属可能なまま保たれます。SDK/TUI/Kiro-ACP のドライバトレースは、ログの隣に `$LOG_DIR/sdk-drive-*.ndjson`、`$LOG_DIR/tui-drive-*.ndjson`、`$LOG_DIR/kiro-acp-drive-*.ndjson` として書き込まれます。それらの正確なファイル名はプロセス ID と TUI セッション名に依存するため、ランナーは起動時と各テスト開始時に glob を表示します。Kiro-ACP トレースはライブの `kiro-cli acp` ターンをイベントごとに記録し(spawn、prompt 開始、各 `tool_call`/`tool_call_update` とその逐語的な出力プレビュー、パーミッション回答、spawn されたプロセスの stderr、そして終端の `result`/`timeout`/`end`)、そのため `session/prompt` タイムアウトを事後に診断できます — 進行していたターン(実際のツール呼び出しが発火)と失速したターンを区別します。

**ワーカー協調。** 親は `run_bun_test_file` を `&` でバックグラウンド化し、`jobs -rp | wc -l` 経由でスロットゲートを保持します。各ワーカーはアトミックな `.meta` サイドカーを `$LOG_DIR/_results/` に書き込み、親は `wait` の後にそれらを読んでサマリテーブルを埋めます。macOS は bash 3.2.57 を出荷しており(`wait -n` なし)、そのためゲートは 200ms ごとにポーリングします — 分単位の LLM 呼び出しに比べれば無視できます。

**ガイダンス。** `--parallel 4` から始めます。Bedrock の容量と請求が許容するなら `8` に上げます。単一の失敗テストをデバッグするときは直列に戻します — または `--filter` を使って分離します。
