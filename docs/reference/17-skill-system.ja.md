# オーケストレーションエンジンとスキルシステム

> 言語: [English](17-skill-system.md) | **日本語**

> 対象読者: Tier 2/3(チーム導入者、フレームワーク貢献者)。

> **パス規約。** 以下の `<record>/` = アクティブな intent のレコードディレクトリ `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`。ここに per-intent の状態とランタイムファイルが存在します。

この章は、すべての `/amadeus` 実行を駆動するオーケストレーションアーキテクチャの正規リファレンスです。「次は何か?」に答える決定論的な**エンジン**(`amadeus-orchestrate.ts`)、エンジンの答えに基づいて動作する薄い**コンダクター**(`skills/amadeus/SKILL.md`)、両者を結ぶ**型付きディレクティブ契約**、ランナージェネレーターが発行する**複数スキル**セット、どのステージが実行されるかを決める**スコープの形式**、そして並列 Construction 作業を収束させる**スウォーム**レフェリーを扱います。これは、`SKILL.md` の本体そのものがすべてのルーティングロジックを保持していた古い prose-orchestrator モデルを置き換えます。[Orchestrator](03-orchestrator.ja.md)(コンダクター自身の章)、[Runtime Graph](13-runtime-graph.ja.md)(エンジンとスウォームが読む execution-truth のミラー)、[State Machine](12-state-machine.ja.md)(`report` がコミットする遷移)、[Hooks and Tools](06-hooks-and-tools.ja.md)(Stop フックを含む決定論的な背骨)へ相互リンクします。

---

## 1. エンジンとコンダクター

このカットオーバーは1つの関心事を2つに分割します。**エンジン**は*ステージ間ルーティング* — スコープ解決、フラグの優先順位ラダー、ジャンプ方向の計算、resume と init のガード、ステージシーケンス、ゲートステータス、ワークフロー完了 — を所有します。**コンダクター**は*エンジンが指名した move の内部の実行品質* — ペルソナのフレーミング、良い質問をすること、ステージダイアリーの維持、ステージ内の Keep/Modify/Redo ループ、ゲートでの人間への判断の提示 — を所有します。

エンジンは `packages/framework/core/tools/amadeus-orchestrate.ts` で作成され、各ハーネスへ `<harness-dir>/tools/amadeus-orchestrate.ts`(例 `.claude/tools/`)として出荷されます。これはちょうど2つのサブコマンドを持つ Bun CLI です:

| サブコマンド | 役割 | 状態を変更する? |
|------------|------|----------------|
| `next` | ワークフロー状態(アクティブな intent の `amadeus-state.md`、`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` 配下)とコンパイル済みステージグラフ(`tools/data/stage-graph.json`)を読み取り、スコープと位置を解決し、**ちょうど1つ**の型付きディレクティブ(JSON)を stdout に発行する。 | しない(1つの文書化された推移的な例外: 既に intent を保持するワークスペース上での no-state birth は、重複を birth するのではなく intent-pick プロンプトを発行する)。 |
| `report` | コンダクターがディレクティブに基づいて動作した後、遷移をコミットする。ステージ認識ディスパッチャ: `--stage <slug>` は動作したディレクティブを固定し、復元された `Current Stage` が report のターゲットをドリフトさせられないようにする。状態ツールの transition(s) にシェルアウトし、明示的に report されたステージがまだ `[-]` の場合は承認の前に欠落したゲートを開く。 | する。 |

エンジンは設計上決定論的なコードです — ルーティングは決定論の関心事なので、LLM の prose ではなくツールに存在します(ルート文字列の構築を LLM に渡すことは、tool/agent/human のテーゼを反転させることになります)。既存の決定論的ライブラリを**組み合わせます**: コンパイル済みグラフには `loadGraph()`、シーケンスには `nextInScopeStage()` / `firstInScopeStageOfPhase()`、スコープ名セットには `validScopes()`、状態読み取りには `getField` / `parseCheckboxes`。非ハッピーパスのブランチ(ジャンプ、resume、intent birth、スコープ/設定変更、env-scope 検証)は兄弟の CLI ツールをシェルアウトで組み合わせ、その stderr をそのまま中継するため、ユーザー向けのエラー文言は決して再構築されません。エンジンが組み合わせるのではなく*追加*する唯一のものは、`(観測された状態 + グラフ) → ディレクティブ種別` をマッピングする決定ルールと、グラフノードの語彙名を正規のレコードディレクトリパス(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/<phase>/<stage>/...`)に変換する artifact-path リゾルバです。

すべてのディレクティブは、表示される前に `amadeus-directive.ts` の凍結された契約に対して検証されます。不正なディレクティブは、コンダクターが動作するであろう嘘を発行するのではなく、非ゼロで終了します。

---

## 2. 型付きディレクティブ契約

`amadeus-directive.ts` は、`kind` フィールドをキーとする判別可能な共用体(discriminated union)を定義します。各ディレクティブは、その種別が必要とするフィールドのみを持ち、種別ごとの許可キーセットによって強制されます(種別のセット外のフィールドは未知のキーとして拒否されます)。以下の表はコンダクターが分岐する種別です。2つは、後のウェーブがそれらを配線するまでループを complete-shaped に保つ文書化されたプレースホルダで、残りは今日発行されます。

| `kind` | 今日発行される? | コンダクターが行うこと |
|--------|----------------|--------------------------|
| `print` | Yes | `directive.message` が言うことを正確に行う — それが権威的です。2つの形式: **terminal**(status/help/doctor/version のような読み取り専用ユーティリティを指名; 実行し、stdout をそのまま表示し、STOP)と **run-then-continue**(スコープ変更、ジャンプ `execute`、またはユーザーが新規ワークスペースでスコープを明示的に指名した(フラグまたは位置引数)ときに発行される workflow-birth `init --scope <scope>` のような変更を伴うツールを指名; 実行し、ループのステップ1に戻る)。変更は指名されたツールに存在し、`next` には決して存在しない。 |
| `error` | Yes | `directive.message` をそのまま表示し、STOP。回復したり取り繕ったりしない — メッセージはユーザー向けのエラーそのものです。 |
| `committed` | Yes | `report` のトランジションが着地し、ループは**継続**する。`report` の成功する非終端コミット(通常のコミット ack、authorized carrier 経由の承認 ack、冪等な stale re-report)すべてで発行される。`directive.reason` が着地した遷移を示す; コンダクターは再び `next` を実行する。#2762 で `done` から分離された — 単一の kind が「ワークフローが終わったので停止」と「コミットが着地したので継続」の両方を意味していた。 |
| `done` | Yes | ワークフロー(または single-stage 実行)が完了した。完了サマリを提示し、STOP。これを発行するのは終端の完了だけであり、`report` の成功は `committed` で ack される。 |
| `parked` | Yes | ワークフローは後のセッションのために、クリーンなステージ間境界(`directive.stage`)でフロー途中で park された。park されたこととどう resume するか(`/amadeus --resume`)をユーザーに伝え、STOP。`Parked` マーカーがセットされている間(`amadeus-orchestrate park` によって書き込まれる)の素の `next` で発行される; ステージは前進しない。Stop フックは `parked` を terminal allow として扱うため、コンダクターは `done` に到達するためにステージをラバースタンプするのではなく park する(#367)。 |
| `run-stage` | Yes | リードエージェントのペルソナと任意の `support_agents` をロードし、`directive.stage_file` を読み、ステージ本体を実行し、`produces` を書き、`directive.memory_path` にダイアリーを保持し、`directive.gate` で分岐する([Orchestrator](03-orchestrator.ja.md) を参照)。解決されたルーティングフィールドをグラフノードからそのまま持ち込む: `lead_agent`、`support_agents`、`mode`、`gate`、`consumes`、`produces`、`rules_in_context`、`sensors_applicable`、`stage_file`。 |
| `ask` | Yes | `directive.question` を `AskUserQuestion` 経由でレンダリングし、次の `report` で `--user-input` を通じて人間の答えをフィードバックする。エンジン自体は決して `AskUserQuestion` を呼ばない — 人間のターンをコンダクターに委ねる。 |
| `invoke-swarm` | Yes | エンジンが適格な Construction バッチをスウォームに付与した。コンダクターは `directive.units` のユニットをファンアウトし、収束ループを実行し、スウォームレフェリーに相談する(§6 を参照)。その際、エンジンの 1-origin バッチ識別子であり durable な Unit Pool id でもある `directive.batch` を、当該バッチへのすべてのレフェリー呼び出しへ渡す。収束チェック自体は搬送されない: `--check-cmd` と任意の `--test-file` はコンダクターの知識のままで、取得元は各コンダクター面の swarm 手順が名指す。`autonomous` または `gated` 付与の下での適格な Construction バッチに対して発行される。`gated` ではバッチ間にエンジンが `ask` のバッチ末尾ゲートを発行し、`amadeus-bolt approve-batch --batch <n>` で解除する。 |
| `await-advisory-choice` | Yes | このチェックポイントで plugin が advisory を raise し、まだ誰も答えていない。`amadeus-log.ts advisory-decision` で保護された提示を記録し、`directive.question` を逐語で `directive.options` とともに提示して STOP する。この kind は人間への質問経路**専用**であり、すでに回答を持つ advisory は `execute-advisory-handoff` として届く。 |
| `execute-advisory-handoff` | Yes | `directive.stage` の advisory は人間または autonomy ladder によってすでに `run-now` と回答済みで、hold は継続している。何も提示せず、`directive.handoff_stages` の各 slug に対して配列順に `/amadeus --stage <slug> --single` を実行し、その後 `next` を再実行する(`report` は呼ばない)。`handoff_stages` が空なら destination を名指しする advisory が無いということであり、継続中の hold を報告して停止する。handoff stage を開いても hold は解除されない — 解除するのは宣言元 plugin の evaluator が no-hold を返したときだけ(#2967)。 |
| `dispatch-subagent` | No(engine-future プレースホルダ) | 指名されたステージをインラインではなく `Task` 呼び出しで実行*する予定*。今日は発行されない; 投機的に実装しない。 |
| `present-gate` | No(engine-future プレースホルダ) | ゲートの儀式を独自のディレクティブとして実行*する予定*; 今日ゲートの決定は `run-stage` の `gate` フィールドに折り込まれている。 |

**exit code 契約。** エンジンの exit code が答える問いは1つだけです — 妥当なディレクティブを発行できたか? — そのディレクティブが良い知らせかどうかではありません。上表のいずれかの種別を発行できれば、`error` を含め exit 0 です。非0 exit は、ディレクティブそのものが1件も生成できなかったことのみを意味します。これは `next`、`report`、`gate-reserve`、`gate-reject` のすべてで共通です — `amadeus-orchestrate.ts` が `process.exit(1)` を呼ぶ箇所はちょうど5箇所あり、そのいずれもがディレクティブの構築失敗であって、悪い知らせを運ぶディレクティブではありません: stranded autonomy carry(`:771`)、frozen contract が拒否する malformed directive(`:778`)、`run-stage` ディレクティブの sensor-invocation projection 失敗(`:801`)、不明または欠落したサブコマンド(`:6115`)、`runEngineMain` のトップレベルエラー境界が捕捉する未捕捉例外(`:6135`)です。`error` ディレクティブが正常に発行された後は、この5箇所のいずれにも到達しません。`tests/integration/t214-engine-error-logged.test.ts:95-96` はこの契約を逐語で pin しています(`// Exit code unchanged: an error directive is a conductor-handled terminal, NOT a process failure.`)。`t365-kimi-reviewer-boundary.integration.test.ts:2232` と `t427-goal-reconciliation-completion.integration.test.ts:316` は `report` における同じ「exit 0 + `error` ディレクティブ」形を pin しています。**非対話の呼び出し側**(CI ジョブ、スクリプト、ラッパー)は、拒否を検出するために stdout の `directive.kind` を読む必要があります — exit code だけでは拒否と成功を区別できないため、exit code だけで分岐すると拒否された `report` を無音のまま飲み込みます。これは sibling CLI ツールの規約とは逆です: `amadeus-state.ts` の `error()` ヘルパー(`:5595`)は拒否時に非0 exit し、多くの CLI が採る「exit code = 成否」の規約に一致します。両ツールが規約を共有していると仮定しないでください。

**ゲートのセンチネル。** `run-stage` の `gate` は、すべての決定論的なケースでブール値です(auto-proceeding のブートストラップ initialization ステージでは `false`、他のすべての EXECUTE ステージでは `true`)。1つのケースは決定論的ではありません: 最初の Construction Bolt のゲートは、チームの自由形式の `## Walking Skeleton` プラクティスの prose に依存し、どのパーサもそれを導出できません。エンジンは文字列センチネル `GATE_UNRESOLVED`(`"unresolved"`)を発行し、分類をコンダクターのナレッジワークに委ねます。コンダクターは `report --skeleton-stance <on|off|scope-dependent>` を通じてスタンスを返し、次の `next` は今や決定されたブールゲートで同じステージを再発行します。

**コンダクターのペルソナ配信。** コンダクターの実行品質チャーターは `amadeus-common/conductor.md` に一度だけ存在します。どのスキルもそれをパスで参照しません。代わりにエンジンがそれを読み、その内容を**ワークフローの最初の `run-stage` ディレクティブ**の `conductor_persona` フィールドに焼き込みます。コンダクターがそのフィールドを受け取ると、実行全体でそのペルソナを採用します。これにより、すべてのエントリポイント — フレームワークランナーも手書きも同様に — がスキルごとの diligence なしに1つのペルソナに揃います。

---

## 3. 転送ループと Stop フック

`skills/amadeus/SKILL.md` が**コンダクター**です: エンジンのディレクティブに基づいて動作する薄い転送ループ。その制御構造全体は以下のとおりです:

```
Loop:
  1. directive = `bun .claude/tools/amadeus-orchestrate.ts next $ARGUMENTS`
  2. act on directive.kind
  3. `bun .claude/tools/amadeus-orchestrate.ts report --stage <directive.stage> --result <outcome> [--user-input "<text>"]` when the directive names a stage; omit `--stage` only for non-stage report round-trips.
  4. repeat while the directive continues the loop (`committed` — the report
     ack — plus `run-stage`, `invoke-swarm`, run-then-continue `print`)
```

```mermaid
flowchart LR
  A["next $ARGUMENTS"] --> B{"directive.kind"}
  B -->|"run-stage / ask / invoke-swarm"| C["conductor acts on the move"]
  C --> D["report --stage ... --result ..."]
  D --> A
  B -->|"print (run-then-continue)"| C
  B -->|"committed (report ack)"| A
  B -->|"print (terminal) / error / done"| E["STOP"]
```

図のテキスト説明: `next`(`$ARGUMENTS` がそのまま渡される)は1つのディレクティブを返します。コンダクターは `directive.kind` で分岐します。`run-stage`、`ask`、`invoke-swarm`、および run-then-continue の `print` ディレクティブに対しては、指名された move を実行し `report` を呼び、これが `next` にループバックします。`report` の成功が返す `committed` ディレクティブは、2度目の `report` を挟まずそのまま `next` へ戻ります。terminal の `print`、`error`、`done` に対してはループを停止します。

`$ARGUMENTS` は最初の `next` にそのまま渡されます — エンジンがフラグ(`--status`、`--stage`、`--scope`、`--depth`、自由形式テキスト)をパースするため、コンダクターは決して事前パースやストリップをしません。`next` は何も変更しないため、ループは `report` が遷移をコミットしたときにのみ前進し、次の `next` は常に新鮮な状態を読みます。

インタラクティブなパスではコンダクターがループを保持します。人間に質問できるのはコンダクターだけだからです。ループが LLM の良い振る舞いに依存しないように、**Stop フック**(`hooks/amadeus-stop.ts`)がそれを決定論的に強制します - フレームワークで最初のフロー変更フックです(他のすべてのフレームワークフックは advisory で常に 0 で終了します)。コンダクターがターンを終えようとすると、Stop フックは `amadeus-orchestrate next` を実行します; ディレクティブがまだ保留中の場合、停止をブロックし、`reason` フィールドを通じてディレクティブを再注入し、**on-task continuation**(タスク継続)として表現します(まだ owed の作業 - ループを実行し、動作し、report する - を指名し、override 形式の指示は決して指名しません。それはコンダクターの安全訓練が拒否するでしょう)。`done` または `parked` ディレクティブ(後者は `amadeus-orchestrate park` から、後のセッションのためのサポートされる mid-flow 一時停止)は停止を許可します。一部の保留ケースも*ブロックされません*: **human-wait carve-out** は、コンダクターが正しく人間に park されている(または単にチャットしている)ときに停止を許可します - 現在のステージが positively `[?]` の awaiting-approval、`[R]` の revising、`[-]` の in-progress で `<slug>-questions.md` に未回答の `[Answer]:` タグがある(保留中の mid-stage 明確化質問)場合、または終了するターンが会話的だった(人間の最後のプロンプトがワークフローエンジン呼び出しなしで回答された、ハーネストランスクリプトから読み取る; 読み取り専用の `--status`/`--doctor` クエリは engagement とみなされない)場合です。質問タグのケースは Intent autonomy `full` と人間コマンド由来の `semi` の下で、会話ケースは `full` の下でだけ抑制され、無人実行が動き続けます; 会話ケースも Kiro では inert です。Kiro はトランスクリプトを配信せず、そこではインタラクティブキャップがリリースパスの代わりになります。そこでブロックしても nudge をスパムするだけです(positive-confirmation のみ; human-wait チェックは fail open、会話チェックは fail closed; ステートレスケースと真の mid-stage quit は依然としてブロックします)。2つの境界が、スタックしたループがセッションをトラップするのを防ぎます: Claude Code の `stop_hook_active` シグナルと、`<record>/.amadeus-stop-hook/`(アクティブな intent のレコードディレクトリ内)配下に永続化される no-progress カウンタです。連続した no-progress ブロックが上限(`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`、そのデフォルトは run-mode 認識: **インタラクティブ実行では 2、autonomous Construction では 8**)に達すると、フックは手放します; ワークフローの前進は位置シグネチャを変え、カウンタを 0 にリセットするため、健全なループが throttle されることは決してありません。アクティブなワークフローがない場合、または予期しないエラーの場合、フックは fail open します - 非 AIDLC セッションを決してブロックしません。

---

## 4. 複数スキル、ランナー、共有された背骨

オーケストレーターは数多くのスキルの1つです。各ハーネスはそのスキルディレクトリ(`<harness-dir>/skills/`、例 `dist/claude/.claude/skills/`)配下に複数セットを出荷します: ベースの `amadeus` オーケストレーター、実行可能なステージごとに1つの**ステージランナー**(`amadeus-<slug>`)、first-batch スコープごとに1つの**スコープランナー**(`amadeus-<scope>`)、読み取り専用のセッションスキル(`amadeus-session-cost`、`amadeus-replay`、`amadeus-outcomes-pack`、`amadeus-grilling`)、そして `amadeus-init`。すべてのルーティングと実行の知識は、`packages/framework/core/amadeus-common/` で作成される**共有された背骨**(`<harness-dir>/amadeus-common/` として出荷)に一度だけ存在します: `conductor.md` ペルソナ、`protocols/`、そして `stages/{initialization,ideation,inception,construction,operation}/` 配下の32個のステージファイル。

ランナースキルは生成されるものであり、決して手書きされません。`tools/amadeus-runner-gen.ts` によって:

- **ステージランナー**はオプトインのシュガーです。各 `/amadeus-<slug>` は `/amadeus --stage <slug> --single`(これはランナーなしで動作する)を、エンジンの `--single` モード経由で1つのステージを分離して実行し、メインワークフローの `Current Stage` を決して前進させない、タイプ可能なコマンドにパッケージします。slug リストは `loadGraph()` — 唯一のコンパイル済み真実のソース — から来るため、グラフに追加されたステージはここでの編集なしにランナーに流れ込みます。ブートストラップ initialization ステージは除外されます(スタンドアロンの `--single` の意味を持たない; `--single` はそれらを拒否する)。そして initialization フェーズ全体は、エンジンの intent-birth の move をパッケージする1つの `/amadeus-init` ランナーとして出荷されます。
- **スコープランナー**は既に実行可能なコマンドをパッケージします; スコープファイルが定義を保持します。それぞれは、固定されたスコープと検出なしで `amadeus-orchestrate next --scope <scope>` を `done` まで駆動する短いシェルです。完全なスコープセットは `/amadeus --scope <name>` 経由で到達可能なままです; ランナーは高トラフィックなものに対するタイプ可能なシュガーです。

2つのドリフトガードが、ディスク上のランナーセットをそのソースに固定します: ステージランナーには `amadeus-runner-gen.ts check`、スコープランナーには `scopes --check`、両方とも CI で実行されます。ランナーは**`hooks:` ブロックを持ちません** — ワークフロー背骨フックはプロジェクト全体で `settings.json` に存在するため、決定論的な背骨はコピーではなく継承されます。そしてどのランナーも `conductor.md` を手動でロードしません: エンジンが最初の `next` でペルソナを配信します。

---

## 5. スコープの形式

スコープはファイルで作成されるプリミティブであり、センサーやエージェントを作成するのと同じ筋肉記憶です。**`scope-mapping.json` は存在しません** — 出荷ツリーから削除されました。スコープの identity とステージメンバーシップは、2つのファイルで作成されるサーフェスに分割され、コンパイル済みグリッドに転置されます:

1. **Identity** はスコープごとに1ファイル `dist/claude/.claude/scopes/amadeus-<name>.md` に存在します — フロントマター(`name`、`depth`、`keywords`、`description`)にスコープを記述する prose を加えたもの。出荷セットは `fix`、`chore`、`enterprise`、`feature`、`infra`、`mvp`、`poc`、`refactor`、`security-patch`、`workshop` です。
2. **Membership** は各ステージの `scopes:` フロントマターに存在します — そのステージが EXECUTE となるスコープのリスト。

`bun .claude/tools/amadeus-graph.ts compile`(`stage-graph.json` を生成するのと同じコンパイルパス)は、これらを `tools/data/scope-grid.json` のグリッド — エンジンがすべての scope-level ルーティングのために読む `scope → {stages: {slug: EXECUTE|SKIP}}` マップ — に転置します。エンジンの `validScopes()` は、そのコンパイル済みグリッドから正規スコープ名セットを導出します。

スコープの追加は純粋に加算的です: `.claude/scopes/amadeus-<name>.md` を配置し、メンバーステージの `scopes:` リストにタグ付けし、再コンパイルし、`SKILL.md` の人間可読なサマリテーブルを再生成します。ディスパッチロジックの編集は不要で、ドリフトガードがディスク上のセットの乖離を防ぎます。

---

## 6. スウォームレフェリー、ドライバーの継ぎ目、Bolt-DAG

**スウォーム**は、人間から付与された自律性の下で並列 Construction 作業がどう収束するかです。ライブな `/amadeus` セッション内でのみ発火するため、コンダクター(そのセッション)がファンアウトとリトライループを所有します; `tools/amadeus-swarm.ts` は、コンダクターがループ自体を所有する間に相談する決定論的な**レフェリー**です。これは収束に適用された three-concerns 分割です: コンダクターがファンアウトとリトライ決定を所有し(ナレッジ)、ツールが収束判定 + マージ + 監査を所有し(決定論)、人間が自律性を付与し失敗エンベロープでバトンを取り戻す(判断)。

収束 check はステートレスのままですが、固定 Unit pool は監査 fold を正本とする C2 single writer です。FIFO queue、slot、Unit-attempt budget、reconciliation は pool が所有し、harness は native fact だけを報告します。

| サブコマンド | 役割 | 発行 |
|------------|------|------|
| `prepare --batch <n> --units <a,b,c> [--base <branch>] [--concurrency <1..4>] [--degraded-from <subagent\|claude-ultra\|codex-ultra>]` | `swarm.unit.concurrency.limit` を解決し、正準 FIFO pool を初期化して全 Unit の worktree を作る。 | `SWARM_STARTED`、`UNIT_POOL_EVENT_SET_COMMITTED`(loud downgrade 時は `SWARM_DEGRADED` も)。 |
| `acquire` / `confirm-dispatch` / `record-reconciliation` / `settle-release*` / `terminate-batch` / `late-result-observed` | cap 以下の slot reservation、native start fact、release と次の dependency-ready FIFO Unit の promotion、drain/termination を原子的に行う。 | `UNIT_POOL_EVENT_SET_COMMITTED`。 |
| `check <unit> --check-cmd <cmd> [--test-file <path>]` | ステートレスな単一ユニット判定: プロジェクト自身の check コマンドを実行(exit 0 = green、権威あるシグナル — ワーカーの自己申告は決して信頼されない)し、保護されたファイルを fork-git のベースラインと比較する anti-tamper を行う。`{converged, tampered, reason}` を表示し、genuinely converged の場合にのみ exit 0。 | なし(advisory; コンダクターのリトライ決定に情報を与える)。 |
| `finalize --batch <n> --units <a,b,c> --claimed <a,b> --check-cmd <cmd> [--test-file <path>] [--reasons <unit>=<reason>,…] [--target <branch>] [--base <branch>] [--strategy <squash\|merge\|rebase>] [--repo <name>]` | 権威あるゲート: どのマージよりも前に**すべての claimed ユニットで check を再実行**し(`--claimed` で名指しされたがディスク上では red のユニットはマージを拒否され、失敗エンベロープに入る — lying-conductor ガード)、その後 genuine passes の直列化された HOLD-MERGE のマージバック(AIDLC data の `complete --merge` のあと Git source の `amadeus-worktree merge`)。genuine unit は `--target` または `--base`(prepare の base)を必須とする。両方着地するまで converged にしない。exit 0(バッチが収束しマージされた)または 2(失敗エンベロープ)。 | `SWARM_UNIT_CONVERGED` / `SWARM_UNIT_FAILED` / `SWARM_BATON_RETURNED` / `SWARM_COMPLETED`。 |

これら6つの `SWARM_*` イベントと Unit pool イベントは 81-event 監査分類の一部です([State Machine](12-state-machine.ja.md) を参照)。exit-2 エンベロープでは、コンダクターがバトンを取り戻します - 失敗は自律モードに関係なく常に停止し、人間を再エンゲージします。

**ドライバーの継ぎ目。** `AMADEUS_USE_SWARM` の有効値は未設定、`claude-ultra`、`codex-ultra` です。コンダクターは prepare 前にバッチごとに1回だけ解決します。driver は native dispatch substrate だけを選び、どの harness も pool permit を消費しなければ dispatch できず、cap を所有・拡大できません。別 harness 向け ultra は loud-degrade、未知値は worktree・dispatch・監査開始より前に fail-closed で拒否します。

**Bolt-DAG。** スウォームがファンアウトするバッチは、`runtime-graph.json` の `bolt_dag` ノード([Runtime Graph](13-runtime-graph.ja.md) を参照)から来ます。これは units-generation の `unit-of-work-dependency.md` エッジブロックからパースされます。ノードは `units`(それぞれ `depends_on` リストを持つ)と `batches` — すべてのユニットの依存が先行するバッチによって満たされるトポロジカルレベルなので、バッチのユニットは並列にファンアウトできる — を持ちます。ノードは、有効なエッジブロックがディスク上に存在するときにのみ存在します。無いときは graph が理由を語ります: 正当な欠落(スコープが units-generation をスキップする、またはステージが未実行)は代わりに `bolt_dag_absence` を書き、欠陥(units-generation が completed なのに成果物が不在、または成果物のブロックがパース不能)は compile 自体を失敗させます — gate-time の required-sections センサーは同じブロックを上流でフラグします。

---

## 次のステップ

- **コンダクター自身の章** — 転送ループ、ゲートの儀式、学習の儀式を完全に。[Orchestrator](03-orchestrator.ja.md) を参照。
- **エンジンとスウォームが読む execution-truth の成果物** — `runtime-graph.json` とその `bolt_dag` ノード。[Runtime Graph](13-runtime-graph.ja.md) を参照。
- **`report` がコミットする遷移** - ワークフロー / フェーズ / ステージのマシンと 81-event 監査分類。[State Machine](12-state-machine.ja.md) を参照。
- **決定論的な背骨** — Stop フックと他のフレームワークフックおよびツール。[Hooks and Tools](06-hooks-and-tools.ja.md) を参照。
- **ランナーを日々使う** — タイプ可能な `/amadeus-<stage>` と `/amadeus-<scope>` コマンド。User Guide の [Skills and Runner Commands](../guide/17-skills.ja.md) を参照。
