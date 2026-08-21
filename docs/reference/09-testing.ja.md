# テスト

> 言語: [English](09-testing.md) | **日本語**

## 概要

AI-DLC のテストスイートは **完全に TypeScript** です — すべてのテストは
`bun` の下で実行される `t*.test.ts` ファイルであり、シェル(`.sh`)テストファイルは
ゼロです。これは構成によるプラットフォーム不変性の保証です: 同じファイルが
macOS、Linux、ネイティブ Windows で同一に実行されます。

スイートは `smoke`、`unit`、`integration`、`e2e`、`perf` のレベルに構成され、
それぞれ `tests/` 配下に1つのディレクトリを持ちます。前の4つは、速度と網羅性の
バランスを取る古典的な3層テストピラミッドにマッピングされます。`perf` はピラミッドの
外側に位置する直交した wall-clock 層です(後述の「性能層(wall-clock ベンチマーク)」を参照):

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
`bun tests/run-tests.ts` に相乗りします)。`--release` / `--all` は `e2e` と `perf` を
追加します。`perf` レベルは `--ci` とデフォルトプロファイルから意図的に外されており、
`--perf`、`--release`、`--all` でのみ選択されます。上記のピラミッドは
ピラミッド上の各レベルが概念的にどこに位置するかを示します — 実際にそれらを選択するのは
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
  `integration`、`e2e`、`perf`)。*システムのどこまでを結線して動かすか* に答えます。
  後述の純度軸で評価されるのは `unit`、`integration`、`e2e` だけです: `smoke` は
  明示的に除外され、`perf` はガードの `other` バケットに落ちます — どちらも
  サイズ上限を持ちません。
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
- **perf** — wall-clock 予算をアサートする実時間ベンチマーク。判定がマシン負荷に
  依存するため `--ci` とデフォルトプロファイルから除外され、日次の性能 workflow と
  `--release` / `--all` で実行されます。

**サイズは宣言でなく導出。** ファイルのサイズは
[`tests/lib/test-size.ts`](../../tests/lib/test-size.ts) の `classifyTestSize`
が計算します — ファイル自身のソース(コメント除去後)を走査し、次の4つのシグナル
クラスを検出する決定論的な静的シグナルプロキシです:

| シグナルクラス | それが強制する最小サイズ |
| --- | --- |
| ネットワーク(`node:net/http/…`、`WebSocket`、`fetch`、`.listen`) | large |
| プロセス spawn(`child_process`、`spawn*`、`Bun.spawn`) | medium |
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
| perf | —(評価対象外) | ガードのスコープマップに無く `other` に落ちる。全ファイルが慣習として `// size: large` を明示する |

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
- brownfield スタブ + 成果物アサーションによる完全な fix ライフサイクル
- greenfield スタブ + 成果物アサーションによる完全な POC ライフサイクル
- 状態進行、スコープルーティング、監査の完全性、ジャンプ機構
- ステージ指示品質の LLM 意味的レビュー(明確さ、論理的流れ、曖昧さ検出)

**実行:** `bun tests/run-tests.ts --release`

## 性能層(wall-clock ベンチマーク)

実時間ベンチマークは `tests/perf/` にあり、wall-clock 予算をアサートします:
マイグレーションのスループット、ライフサイクルトランザクションのレイテンシ、
guard corpus の走査、プラグインのステージ探索、そして mirror の contract-policy と
distribution の経路です。判定がマシンの負荷に依存するため、これらは
**`--ci` とフラグなしのデフォルトから除外**され、`--perf`、`--release`、`--all`
でのみ選択されます。したがって `tests/perf/` は CI 常駐マーカーを決して持ちません —
`t257-ci-residency-marker-guard` が、この層が `--ci` の外に留まることを強制します。

**実行場所。** `.github/workflows/perf.yml` が、この層を日次スケジュール
(`cron: "47 17 * * *"` — 17:47 UTC。`:00` / `:30` の混雑ピークを意図的に避けています)と
`workflow_dispatch` で実行します。この workflow は perf 層の実行に加えて Intent Mirror
ベンチマークのジョブ(`distribution-benchmark` とその集約)を持ちます。これらは
ベンチマークのタイミングが Pull Request をゲートしないよう `ci.yml` から移設されました。

**非 blocking・loud-fail。** `perf.yml` は `ci.yml` の `ci-success` の needs リストからも
ブランチ保護からも意図的に外れており、ここが赤くなっても Pull Request は塞がれません。
失敗は無音にはならず loud に残ります: Actions タブで実行が赤くなり、失敗した各ジョブは
自身の出力の末尾を実行の step summary に追記します。`continue-on-error` や `|| true` で
失敗を握り潰してグリーンを保つことは許容しません。

**スケジュールの停止。** GitHub はリポジトリの活動が約60日途絶えると `schedule`
トリガーを無効化します。日次実行が現れなくなったら、Actions タブで停止した
スケジュールを確認し、そこから再有効化してください。

`ci.yml` 自体はベンチマークジョブを失った点を除いて変更されていません:
`ci-success` が集約する blocking ジョブの集合は従来どおりです。

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

1. Bun 1.3.13 以上と Claude Code CLI をインストールします。
2. フルスイートまたは POSIX ラッパー互換 smoke を実行する場合は Git for Windows をインストールします。ネイティブランナーのパス自体は Bash を必要としません。
3. `bun install --frozen-lockfile` で開発依存をインストールします。
4. `AMADEUS_TUI_LIVE=0` を設定します。ライブのレンダリングターミナルジャーニーは tmux を必要とするため、Windows ではサポートしません。
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

4. ライブ TUI を除外して Windows `--all` ゲートを実行します:

   ```bash
   bun tests/harness/windows/ssm-run.ts --stack-name amadeus-windows-test -- \
     powershell -ExecutionPolicy Bypass -File C:\amadeus\tests\harness\windows\run-all.ps1 -ProjectDir C:\amadeus -Parallel 8
   ```

5. ホストを破棄します:

   ```bash
   aws cloudformation delete-stack --stack-name amadeus-windows-test
   ```

`run-all.ps1` は、ライブのレンダリングターミナルジャーニーが tmux を必要とし Windows ではサポートされないため、`bun tests/run-tests.ts --all --debug -P <N>` を呼び出す前に `AMADEUS_TUI_LIVE=0` をエクスポートします。ネイティブインストーラは CloudFormation UserData ブートストラップを実行したユーザー(EC2Launch v2 では Administrator)のもとに `claude.exe` を配置するため、`C:\Users\Administrator\.local\bin` と systemprofile ホームにまたがって claude バイナリを探索します。

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

`function` クラスは、フレームワークのインポート可能なサーフェスから列挙されます —
`amadeus-lib.ts`、`amadeus-graph.ts`、`amadeus-state.ts` の対象3関数、そして
`packages/setup/src/` 配下の setup パッケージ(トップレベルの `export function` と
`export namespace` のメンバーの両方。後者は `function:<Namespace>.<name>` として現れます)。
ID 空間はフラットなので、2つのルートが宣言する同名の関数 — `main` は
`amadeus-graph.ts` と `packages/setup/src/cli.ts` の両方に存在します — は、
宣言している全ファイルを `source` に列挙する1つのユニットになります。

### join されない `covers:` 主張

`covers:` ヘッダは寛容に解析されます。複数の台帳がこのヘッダを共有しているためです。
`file:` はパッチゲートに供給され、`domain:`/`modules:`/`invariant:` は散文レベルの
グルーピングで、散文そのものもノイズ(`node:child_process` など)を持ち込みます。
レジストリ *自身の* 語彙 — 7つのクラス接頭辞のいずれか — で書かれていながら列挙済み
ユニットのどれにも一致しない主張は、テストが「カバーする」と言っていることと台帳が
知っていることの実際の乖離です。そのためジェネレータはそれをすべて報告します:

- 生成時と `--check` の両方で、stderr に `UNJOINED COVERS CLAIMS` として出力する
- コミット済みレジストリの `unjoinedClaims`(および `counts.unjoinedClaims`)に記録する

この一覧をコミットすることが、この仕組みに歯を与えています。*新しい* 未 join 主張は
生成されるレジストリを変えるため、誰かが再生成してその差分がレビューされるまで、
フレッシュネス差分が `--check` をレッドにします。報告自体は advisory であり、
単独で失敗させることはありません。リポジトリには現在この種の主張が数百件存在し
(その大半は、どの列挙器も読まないルートのヘルパーを指す `function:` ID です)、
これをハード失敗にしても、新しい情報を伝えないままビルドをレッドにするだけだからです。
レジストリの語彙外の主張は報告されません。

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
- **合格ルール。** ビルドは
  `current% >= minimumProjectLineCoverageBasisPoints / 100` と
  `current% >= mergeBase% − maximumRelativeDropBasisPoints / 100 pp` の
  **両方**を満たすときにのみ合格します。判定は浮動小数点を使わず厳密な整数
  (BigInt)演算で計算され、いずれの境界もちょうどの一致は合格です。ゲートは
  現在のカバレッジ、絶対下限、merge-base のカバレッジ、相対許容幅、**判定に用いた
  ベースライン母集団**、および失敗した条件をすべて出力します。emit の欠如、
  ベースラインの欠如、ポリシーの欠如、不正なファイル(誤った `schemaVersion`、
  負値・非整数、`hits > lines`)、範囲外のポリシー値、空の母集団(`lines == 0`)は
  それぞれ固有の理由コードとともに stderr に出力して失敗します。
- **相対条件は「残存母集団」で比較する。** プロジェクト全体の比率どうしを比べると、
  2 つの問いが同時に混ざります — 残ったコードは悪化したか、そして去ったコードは
  平均より良かったのか悪かったのか。よくカバーされた一群を削除すると、残ったコードが
  1 行も悪化していなくてもプロジェクト比率は下がります。そこに失敗を出すことは、
  テストのあるコードを削除することへの課税にほかなりません。したがって相対条件は、
  **head に存在するファイルだけでベースラインを再計算**し、現在側は head の
  全母集団のままにします。それ以外は従来どおり捕捉されます: 残存ファイルが hit を
  失えば現在側の比率が下がる一方で残存ベースラインは動かず、新規ファイルは
  ベースラインに存在しなかったのだから現在側にだけ加わり、テストのない新規コードは
  やはり delta を下げます。**絶対条件は不変**で、常に head の全母集団を読みます。
- **必要な入力と、無いときの挙動。** 残存母集団は両側の per-file LCOV から読みます:
  head 側のレポート `coverage/lcov.info`(`AMADEUS_COVERAGE_LCOV`)と、
  `coverage-base` ジョブが計測して totals と並べてアップロードする merge-base 側の
  レポート(`AMADEUS_COVERAGE_PROJECT_BASELINE_LCOV`)です。各側のレポートは、
  同梱の totals emit と合計が一致しなければなりません。一致しない場合、ゲートは
  別々の実行に由来する数値で重み付けをやり直すのではなく `LCOV_TOTALS_MISMATCH` で
  失敗します。両側の per-file 読み取りが得られない場合(ベースライン LCOV を持たない
  ローカルの `--check` など)は、従来どおりプロジェクト全体の比率で比較し、
  **どちらの基準を用いたかを出力に明記**します。このフォールバックは 2 つのうち
  厳しい側なので、赤を緑に変えることはありません。
- **ベースラインの更新。** ベースラインは
  `tests/.coverage-project-baseline.json` にあります。PR がカバレッジを**改善する**
  場合、作成者は**その同じ PR 内で** `bun run coverage:ci` に続けて
  `bun tests/coverage-project-gate.ts --update`(実測した `hits`/`lines` を転記する
  — 数値を手書きしない)を実行してベースラインを再生成します。自動的なバンプは
  なく、ベースラインは人間がコミットしたときにのみ動きます。
- **ベースラインの引き下げ。** ベースラインを意図的に**引き下げる**(より低い
  カバレッジを受け入れる)には、**PR に記録された明示的なユーザー承認**が必要です —
  これは通常のリフレッシュではなく、意図的なポリシー判断です。

## Silent-Success ゲート

テストファイルは、何も証明していないのに `PASS` を報告できます。その失敗のうち
3 つの形態はランナーが既に保持している成果物から検出可能であり、
`bun tests/run-tests.ts` は実行するすべてのファイルで 3 つとも検査します。検出
ロジックは `tests/lib/silent-success.ts`(純関数)にあり、`tests/run-tests.ts` は
I/O の配線のみを行います。

違反は**そのファイル 1 件**のメタを `STATUS=FAIL`(`FAILED >= 1`)へ反転させます —
ランナーが import クラッシュに対して既に行っている合成と同じです — ので、
`exit == 失敗ファイル数` の契約は不変です: ゲートされた 1 ファイルはカウント 1 増分
です。検出結果はそのファイルの `=== START/DONE ===` ブロック内に
`GATE <name>:` 行として出力されます。

### ゲート 1 — アサーション 0 件

1 件以上の testcase を実行しながら `expect()` を **0 回**しか評価しなかった
ファイルは失敗しようがなく、その `PASS` は何も証明しません。bun の JUnit ルートが
`assertions="0"` を持つので、ゲートはそれを読みます。

意図的に違反と**しない**もの: 空スイート(bun は outfile を一切書かず、import
クラッシュとバイト同一 — こちらはランナーの exit-code 経路が既に捕捉します)、
全 testcase がスキップされたファイル(それはゲート 2 の対象)、`assertions` 属性を
持たない JUnit ドキュメント(属性の出力をやめた将来の bun が、パース上の仮定で
スイート全体を赤にしてはならない)。

免除は 2 系統:

- ファイルのソース中の **`// assertion-free: <reason>`** — import や shape が
  throw しないことそのものが主旨の、意図的に構造的なファイル向け。reason は必須
  で、理由のないマーカーは免除になりません。
- **`zeroAssertion` ベースラインエントリ** — issue 参照つきの既存債務向け。

### ゲート 2 — 恒常的な自己 SKIP

`test.skip`(または bun が同様に記録する条件付き早期 return)はケースを恒久的に
未実行のまま保ちます。bun は JUnit ドキュメントで `<skipped />` を付けます。SKIP は
**期限つき**の免除としては正当ですが、恒久的で未レビューの穴としては正当では
ありません。そこで、すべての自己 SKIP は理由と失効日つきでコミット済み台帳に登録
され、未登録の SKIP と失効済みエントリはどちらも違反です。

スコープ: JUnit レベルの `<skipped />` ケースのみ、つまり**ファイル自身**が決めた
SKIP です。ランナー自身の `STATUS=SKIP` ファイル(Claude substrate ゲート)は対象外
— あれはランナーが stdout 上で可視に宣言する決定であって、テストが静かに実行を
辞退するものではありません。

すべての実行は、違反の有無やモードに関わらず、サマリブロックに census を出力
します:

```text
self-skipped tests: 2 distinct case(s) this run
  tests/unit/t11.test.ts :: reads a real socket (x1) — registered age=41d expires=2026-11-18
  tests/unit/tX.test.ts :: conditional case (x1) — UNREGISTERED
```

この行がカウンタ証跡です: SKIP がどれだけの期間持ち越されているか、免除がいつ
切れるか。失効エントリの更新は意識的な行為です — SKIP を正当化した条件がまだ
成り立つかを再確認してから日付を動かします。

### ゲート 3 — プロセスリーク

ランナーはすべてのテスト子プロセスの環境に `AMADEUS_TEST_NAME=<basename>` を
注入します。`bun test` の子プロセスが終了した後、その**正確な**環境エントリを
まだ保持している同一ユーザのプロセスは、そのファイルの孤児であり、他の何者も
同じマーカーを持ち得ません(値はファイルごとなので、`--parallel` 下の並行ワーカー
が相互検出することはありません)。

- **Linux** は `/proc/<pid>/environ` を走査し、NUL 区切りエントリの全体一致で
  照合するため、マッチは正確です。競合や権限拒否による読み取り失敗は無視します。
- **macOS** は `ps xeww -o pid=,command=` を実行し、マーカーを空白区切りの
  トークン全体として照合します。ベストエフォートであり、それがデフォルトで
  report-only である理由です。
- **Windows** は非対応: 走査はスキップされ、何も出力されません。

最初の走査で何も見つからなければ検査は即座に終わるため、行儀のよいファイルの
コストは走査 1 回・待機なしです。何かがまだマークされている場合のみ、100 ms 間隔
で最大 2000 ms の猶予ウィンドウをポーリングし、その後もマーカーを保持しているもの
がリークです。

リークしたプロセスは、`report` モードでもベースライン登録済みでも、あらゆる
モードで**回収**(`SIGKILL`)されます。所有ファイルは終了済みなので誰も使っておらず、
放置は長時間実行での孤児蓄積(#1811)そのものだからです。ランナー自身の pid は
決して対象になりません。

### モード

`AMADEUS_SILENT_SUCCESS_GATE` が 3 ゲート共通のモードを選択します:

| 値 | 効果 |
|---|---|
| `off` | 3 ゲートすべて無効。文書化された脱出ハッチで、ベースラインの読み込みもスキップします。 |
| `report` | すべて評価して出力するが、ファイルの status は決して反転しない。report 実行は `strict` が落とすものの正直なプレビューです。 |
| `strict` | 3 ゲートすべて fail-closed。 |
| *(未設定)* | ゲートごとのデフォルト(下表)。 |

未設定時のデフォルト:

| ゲート | デフォルト |
|---|---|
| zero-assertion | どこでも `strict` — bun が常に出力する成果物を読むだけで、ベースライン化後は環境非依存。 |
| self-SKIP | `GITHUB_ACTIONS=true` なら `strict`、それ以外は `report`。編集中の開発者を台帳の記帳で止めない; 台帳の強制は CI の役割。 |
| process-leak | `GITHUB_ACTIONS=true` **かつ** Linux なら `strict`、それ以外は `report`。プロセス環境を正確に検分できるプラットフォームだけがビルドを落とせる。 |

`AMADEUS_SILENT_SUCCESS_LEAK=fail` はリークゲートをプラットフォームを問わず
fail-closed に強制します(macOS の開発マシンでゲートの failing アームへ到達する
手段です)。`off` はこれよりも優先されます — 脱出ハッチは絶対です。

`AMADEUS_SILENT_SUCCESS_GATE` の認識できない値は WARNING を出して未設定時の
デフォルトへフォールバックし、決して `off` にはなりません: タイポでゲートが
黙って無効化されてはならないためです。

解決されたモードは実行冒頭に 1 回出力されます:

```text
Silent-success gates: zero-assertion=strict skip=report leak=report
```

### ベースライン: `tests/.silent-success-baseline.json`

```json
{
  "schemaVersion": 1,
  "zeroAssertion": [
    { "file": "tests/unit/x.test.ts", "reason": "why", "issue": "#1982" }
  ],
  "skips": [
    {
      "file": "tests/integration/y.test.ts",
      "test": "*",
      "reason": "why",
      "issue": "#1982",
      "firstObserved": "2026-08-20",
      "expires": "2026-11-18"
    }
  ],
  "leaks": [
    { "file": "tests/e2e/z.test.ts", "reason": "why", "issue": "#1982" }
  ]
}
```

- `file` はリポジトリ相対・スラッシュ区切りで、完全一致。
- `test` は JUnit testcase の `name` と照合。`"*"` はファイル内の全ケースを
  カバーします(動的な名前を持つ条件付き SKIP に必要)。
- 日付は UTC `YYYY-MM-DD`。`expires` が過去日で SKIP がまだ観測されるなら違反。
  失効日当日はまだ通ります。
- ベースラインファイルの**不在**は空のベースライン(免除なし)。
- **不正な**ベースライン — パース不能な JSON、未知の `schemaVersion`、欠落・空の
  必須フィールド、非 ISO 日付 — は **fail-closed**: ランナーは理由を出力し、何も
  実行する前に exit 2 します(`tests/callsite-guard.ts` と同じ姿勢)。「免除なし」
  や「全部免除」へ黙って劣化することは決してありません。

方向は**規約として shrink-only** で、レビューで強制されます: エントリは債務の
返済とともに減り、新しい違反を通すために追加されることはありません。機械的に
追加できてしまう `--update` ライターは意図的に存在しません。

## トリガーポイント

| トリガー | レイヤー | コマンド | 場所 |
|---------|--------|---------|------|
| `git commit` | L1 | `bun tests/run-tests.ts` | ローカル(pre-commit フック) |
| CI パイプライン | L2 | `bun tests/run-tests.ts --ci` | CI/CD パイプライン |
| リリース / main へのマージ | L3 | `bun tests/run-tests.ts --release` | CI/CD パイプライン |
| 日次スケジュール / 手動 dispatch | perf | `bash tests/run-tests.sh --perf` | `.github/workflows/perf.yml`(非 blocking) |

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
| `state-brownfield-init-done.md` | Brownfield | fix | Init 完了、次は RE | t72 |
| `state-mid-inception.md` | Brownfield | fix | RE 完了、次は requirements-analysis | t74 |
| `state-mid-ideation.md` | Greenfield | feature | Intent+market 完了、次は feasibility | t08, t10, t11, t12, t20, t22, t24, t25, t37 |
| `state-construction.md` | -- | -- | Construction フェーズ | t07, t10, t11, t26, t57 |
| `state-operation.md` | -- | -- | Operation フェーズ | t07, t10, t11 |
| `state-completed.md` | -- | -- | 全ステージ完了 | t08, t11 |
| `state-jumped.md` | Brownfield | fix | ジャンプ履歴を持つワークフロー中盤 | t11, t37, t42 |
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
| `AMADEUS_SILENT_SUCCESS_GATE` | *(未設定)* | 3 つの silent-success ゲート共通のモード: `off`、`report`、`strict`。未設定はゲートごとのデフォルト。[Silent-Success ゲート](#silent-success-ゲート)を参照。 |
| `AMADEUS_SILENT_SUCCESS_LEAK` | *(未設定)* | `fail` でプロセスリークゲートをプラットフォームを問わず fail-closed に強制(Linux CI 限定のデフォルトを上書き)。`AMADEUS_SILENT_SUCCESS_GATE=off` が優先。 |

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
--perf          # 実時間の性能ベンチマーク(wall-clock 計測)

# プロファイルフラグ(ショートカット)
(default)       # smoke + unit + integration
--ci            # smoke + unit + integration
--release       # smoke + unit + integration + e2e + perf
--all           # --release と同じ

# 出力修飾子
--verbose       # テストごとのログを tests/logs/ に書き込む
--debug         # --verbose を含意。テストごとの出力をストリームし、SDK/TUI
                # ドライバトレースを tests/logs/ に書き込む
--filter PAT    # ファイル名が拡張正規表現 PAT にマッチするテストのみ実行
--parallel N    # 層内で最大 N 個のテストファイルを並行実行(エイリアス: -P N)。
                # デフォルト: 利用可能な CPU 数と 4 のうち小さい方。smoke は常に直列。
                # どの層でもファイル名に .serial. を含むものは直列のまま。
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

`--parallel N`(または `-P N`)は、層内で最大 N 個のテストファイルを並行実行します。デフォルトでは、利用可能な CPU 数と `4` のうち小さい方を使います。直列でデバッグするときは `-P 1` を指定します。

**役立つ場合。** unit、integration、e2e、perf レベルはファイル単位で並行実行されます。unit と perf ファイルは独立したプロセスであり、integration と e2e はさらに分離されたワークスペースを作るため、独立したファイルを互いに干渉させず並行実行できます。

**スパイク結果(2026-05-06、Bedrock 経由の Opus 4.7):**

| シナリオ | 直列 | `--parallel 4` | `--parallel 8` |
|---|---|---|---|
| 4 × `/amadeus --help` | 56s | 16s (3.5x) | — |
| 8 × `/amadeus --help` | — | — | 31s |

8 個の並列呼び出しすべてが `cache_read=73789` を観測しました — Bedrock のプロンプトキャッシュは並行ワーカー間で温かいまま保たれます。8-way でスロットリングや破損は観測されませんでした。

**直列のまま残るもの。** smoke 層は `--parallel` を無視して直列実行します。ファイル名に `.serial.` を含むテストも、その層の並列帯より先に直列実行されます。この接尾辞は、共有状態または順序依存が実証された場合に限って使います。プリフライトゲート(`tests/integration/t19.test.ts`)も、LLM 層がその終了ステータスに依存するため直列で実行します。

**並列下での出力。** `START` マーカーはライブでストリームします(最初の `DONE` の前に複数が連続して現れることがあります — それがワーカーが並行していることの可視信号です)。通常/verbose モードでは、各ワーカーの TAP 本体はバッファされ、ディレクトリミューテックス(`mkdir $LOG_DIR/.stdout.lock`、POSIX でアトミック — `flock` なしで macOS bash 3.2 で動作)の下で1つの連続ブロックとして stdout にフラッシュされます。したがって、異なるファイルからの `ok`/`not ok` 行が決してインターリーブせず、stdout は直列実行のように上から下へ読めます。ただしファイル完了順序は、ディスパッチ順ではなく各テストがどれだけ時間を要したかで決まります。`--debug` モードでは、Bun の stdout/stderr はテストごとのログに書き込まれつつライブでストリームします。並列デバッグ出力はファイルベース名でプレフィックスされ、重複するライブワーカーが帰属可能なまま保たれます。SDK/TUI/Kiro-ACP のドライバトレースは、ログの隣に `$LOG_DIR/sdk-drive-*.ndjson`、`$LOG_DIR/tui-drive-*.ndjson`、`$LOG_DIR/kiro-acp-drive-*.ndjson` として書き込まれます。それらの正確なファイル名はプロセス ID と TUI セッション名に依存するため、ランナーは起動時と各テスト開始時に glob を表示します。Kiro-ACP トレースはライブの `kiro-cli acp` ターンをイベントごとに記録し(spawn、prompt 開始、各 `tool_call`/`tool_call_update` とその逐語的な出力プレビュー、パーミッション回答、spawn されたプロセスの stderr、そして終端の `result`/`timeout`/`end`)、そのため `session/prompt` タイムアウトを事後に診断できます — 進行していたターン(実際のツール呼び出しが発火)と失速したターンを区別します。

**ワーカー協調。** 親は `run_bun_test_file` を `&` でバックグラウンド化し、`jobs -rp | wc -l` 経由でスロットゲートを保持します。各ワーカーはアトミックな `.meta` サイドカーを `$LOG_DIR/_results/` に書き込み、親は `wait` の後にそれらを読んでサマリテーブルを埋めます。macOS は bash 3.2.57 を出荷しており(`wait -n` なし)、そのためゲートは 200ms ごとにポーリングします — 分単位の LLM 呼び出しに比べれば無視できます。

**ガイダンス。** `--parallel 4` から始めます。Bedrock の容量と請求が許容するなら `8` に上げます。単一の失敗テストをデバッグするときは直列に戻します — または `--filter` を使って分離します。
