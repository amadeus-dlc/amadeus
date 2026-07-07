# Construction とスウォーム(Swarm)

> 言語: [English](08-construction-and-swarm.md) | **日本語**

Construction は AI-DLC が対象物を構築する場所です — Unit ごとのステージが実行され、**スウォーム(swarm)** がその作業を多数の Unit に一度にファンアウトできる場所です。ここはまた、「何を、どう形づくれるか?」という最もクリーンな答えのために、どのつまみが誰のものかを正直に見極める必要のあるハーネスの部分でもあります。ここにあるレバーのいくつかは、他のすべての章が教えるようにデータとして執筆する、ハーネスエンジニアであるあなたのものです。他のつまみは、ゲートにいる人間と、実行を起動するオペレーターのものです。この章ではそのすべてを見ていき、境界線を正確に印すので、あなたは正しい面に手を伸ばし、あなたが押すべきでないものを押すのをやめられます。

一貫した筋道は、このガイドの残りが運ぶものと同じです: あなたは `core/` 配下の **データ** — ルール、ステージ、センサーのチェックコマンド — を編集することで Construction を再形成し、コードを編集することは決してありません。Construction が違って感じられる理由は、その最も目に見える挙動のうち2つ(自律性の付与、スウォームドライバ)が、意図的に *データファイルではない* 関心事によって統治されていることにあります。それを認識することが、存在しない設定を執筆してしまうのを防ぎます。

---

## 3つの関心事、3人の所有者

フレームワークの設計原則は、すべての決定をそれがどんな種類のものかで分けます: 決定性(determinism)はツールに属し、知識はエージェントに属し、判断(judgment)は人間に属します。Construction のスウォームはその分割を具現化したものであり、どれか1つのつまみに触れる前に全体像を把握しておく価値があります。

| Construction における関心事 | 所有者 | 存在する場所 |
|---|---|---|
| チームの自律性 **姿勢**(既定のデフォルト) | あなた、ハーネスエンジニア | `core/memory/{team,project}.md` のルール(データ) |
| Unit が **並列化できる** もの | あなた、ハーネスエンジニア | `units-generation` ステージとその依存 DAG(データ) |
| スウォームが信頼する **収束チェック** | あなた、ハーネスエンジニア | プロジェクト自身の build/test コマンド + 保護された spec(データ + プロジェクト設定) |
| このプロジェクトの実際の自律性 **付与** | 人間 | ランタイムのラダープロンプト |
| スウォーム **ドライバ** の選択 | オペレーター | `AMADEUS_USE_SWARM` 環境変数 |
| 収束の **評決**、マージバック、監査 | ツール | `amadeus-swarm.ts`(コード → Developer Reference) |

「あなた」と印された3行がこの章の本体です。他の3つは、あなたのデータが形づくるランタイムを理解する必要があるため取り上げますが、あなたはそのどれも執筆しません。

---

## 自律性の姿勢 — ルールとして書かれる、あなたの真のレバー

チームがまず制御したいのは、Construction がどれだけの手取り足取りを要求するかです。同梱のデフォルトは、あなたが `core/memory/org.md` の `## Walking Skeleton` 見出しの下に執筆する org ルール(`org.md:28-42`)に存在します。フレームワークのスタンスとして読んでください:

- グリーンフィールドのスコープ — `mvp`、`enterprise`、`feature`、`poc`、`workshop`、`infra` — では **walking-skeleton Bolt が最初に実行されます**。Bolt 1 は単独・ゲート付きで、残りの Bolt が実行される前にユーザーがそれを承認します。
- インクリメンタルなスコープ — `bugfix`、`refactor`、`security-patch` — では **スケルトンのセレモニーはスキップされます**。既存コードベースにブートストラップすべきものはないため、最初の Bolt は他と同様に実行されます。
- Bolt 1 の出荷後、**ラダープロンプト** が一度発火します: 「残りの Bolt はどう実行しますか?」に2つの選択肢 — 自律的に続行、またはすべての Bolt をゲート。選ばれた回答は intent の `amadeus-state.md`(そのレコードディレクトリ配下)に `Construction Autonomy Mode` として永続化されます。

あなたはこの姿勢を、他のどのルールも形づくるのと同じ方法で、[Rules and the Learning Loop](05-rules-and-the-loop.ja.md) の strict-additive レイヤーを通じて形づくります: チーム全体のスタンスには `team.md` を、1つのプロジェクトの恒久的な逸脱には `project.md` を編集します。`org.md` はそのままにします — それはフレームワーク同梱で継承されます。

あなたが設定するのは **デフォルトとガイダンス** です。付与はラダープロンプトにいる人間のもとに留まり、その人がプロジェクトごとの判断を下します。あなたのルールの散文は、エージェントがそのプロンプトに入る際に読むものであり、推奨を枠づけます。*この* プロジェクトが手放しで実行されるかどうかの判断は、ゲートにいる人のもとに留まります。それが1つのプロンプトを貫いて引かれた、決定性・知識・判断の境界線です: あなたが既定のガイダンス(データ)を執筆し、エージェントがそれを提示し(知識)、人間が決定します(判断)。

### 実例 — チームがデフォルトですべての Bolt をゲートするようにする

あなたのチームが自律的な Construction に不慣れで、保守的な姿勢 — すべての Bolt をレビューし、手放しの実行はせず、信頼が得られるまで — を望むとします。`core/memory/team.md` の `## Walking Skeleton` の下に箇条書きを追加します:

```markdown
## Walking Skeleton

Until our team has shipped three clean autonomous batches, the recommended
answer at the ladder prompt is **gate every Bolt**. Reviewers see each Bolt's
diff before the next one starts. Revisit this default once our convergence
checks have proven reliable.
```

これは org のデフォルトの上に積み重なります — スケルトン優先 / セレモニースキップの分割は変わらず、あなたのチームの散文はラダープロンプトでエージェントのコンテキストに加わります。人間は、あるプロジェクトがそれに値するなら依然として「continue autonomously」を選べます。あなたのルールは推奨を形づくりつつ、選択を開いたままにします。変更は次のワークフローのコンパイル境界で効き始めます — 他のすべてのルール編集とまったく同じで、ワークフロー途中の編集が進行中の実行を遡って変えることはありません。

信頼されたスコープに対して手放しの Construction へと昇格するチームは、鏡像の箇条書きを書きます: 「このコードベースの `feature` スコープでは、walking skeleton がグリーンになったら推奨されるラダーの回答は continue autonomously」。同じファイル、同じ見出し、正反対の推奨です。

---

## 並列に実行できるものを形づくる — Bolt-DAG

スウォームは作業を Unit にファンアウトするので、「何を一度に実行できるか?」という問いは上流の、inception の `units-generation` ステージで決定されます。そのステージは `unit-of-work-dependency.md` を生成し(`core/amadeus-common/stages/inception/units-generation.md` が `produces: unit-of-work-dependency` を宣言)、その成果物の中で、必須の fenced な `yaml` エッジブロックが各 Unit をその `depends_on` リストとともに列挙します。

コンパイラはそのブロックを `runtime-graph.json` の `bolt_dag` ノードに読み込みます。このノードは、エッジブロックが整形式かつ非巡回である **場合のみ** 存在します。ブロックが欠落・不整形・巡回している場合、ノードは完全に省略されます([Runtime Graph](../reference/13-runtime-graph.ja.md)、44行目のスキーマ注記)。`bolt_dag` ノードは `batches` も持ちます — すべての Unit の依存が先行するレベルによって満たされるトポロジカルなレベルで、あるバッチの Unit 間にはエッジがなく、一緒にファンアウトできます。

並列面そのものは、フロントマターで `for_each: unit-of-work` を宣言する5つの **Unit ごと** の Construction ステージです:

| ステージ | 実行 |
|---|---|
| `nfr-requirements` | Unit ごとに1回 |
| `functional-design` | Unit ごとに1回 |
| `nfr-design` | Unit ごとに1回 |
| `infrastructure-design` | Unit ごとに1回 |
| `code-generation` | Unit ごとに1回 |

(残る2つの Construction ステージ `build-and-test` と `ci-pipeline` は、最後に全体に対して1回実行されるので、Unit ごとのファンアウトの一部ではありません。)

**この並列面は `units-generation` が実行されるスコープ — `enterprise`、`feature`、`mvp`、`workshop` — にのみ存在します。** インクリメンタルなスコープ(`bugfix`、`refactor`、`security-patch`)と `poc`/`infra` は `units-generation` を実行しないので、エッジブロックを生成せず、`bolt_dag` を持たず、スウォームがファンアウトするものが何もない単一パスで Construction を実行します。作業が真にマルチ Unit である場所でスウォームを形づくり、手放しの Construction をすべてのスコープではなくマルチ Unit のグリーンフィールドスコープの性質として扱ってください。

ここでのハーネスのレバーは間接的ですが実在します: **あなたは `units-generation` が捉える依存構造を形づくることで、何が並列化されるかを形づくります。** クロス依存の少ない粗い Unit を好むチームガイダンスを執筆すると、より多くの Unit が同じバッチに入り並行実行されます。タイトで深く連鎖した依存は、作業を多数の小さなバッチへと直列化します。あなたはこれに、`units-generation` ステージの散文と、アーキテクトエージェントが分解時に読むルールを通じて影響を与えます — 分解そのものはエージェントが人間とともに行う知識の判断であり、それが書くトポロジーこそコンパイラがバッチに変えるものです。

エッジブロックを `bolt_dag` に変えるコンパイルとパースはコードであり、あなたが執筆するものではありません。そのパーサを形づくるのはコード変更です → [Developer Reference](../reference/13-runtime-graph.ja.md) を参照してください。

---

## 収束の配線 — プロジェクト自身のチェックが信頼される信号

スウォームワーカーは自分の Unit が収束したと主張できます。フレームワークはその主張を決して額面通りに受け取りません。権威ある信号は、レフェリーが実行するプロジェクト **自身のチェックコマンド** です: 終了コード `0` は真に収束したことを意味し、それ以外の終了はまだであることを意味します。これは、ハーネスエンジニアが自律的な Construction のために確保する、最も重要な唯一のこと — プロジェクトが実際に本物のチェックコマンドと保護された spec を *持っている* ことで、スウォームが収束を照らし合わせる信頼できる何かを持てること — です。

信号を運ぶ面は2つあります:

- **チェックコマンド。** あなたの Unit が完了したことを証明するもの — `npm test`、`pytest`、build-and-lint スクリプト、CI のローカル等価物。レフェリーはループ中に Unit ごとにそれを実行し、finalize でもう一度実行します。グリーンの終了だけが Unit の作業をマージさせます。
- **保護された spec ファイル。** レフェリーは、指定された `--test-file` をその fork した git のベースラインと anti-tamper(改ざん防止)比較できるので、ワーカーは「完了」を定義するテストをこっそり弱めて赤いチェックをグリーンにすることができません。あなたは、受け入れ基準をエンコードする spec が存在し、それが指し示されるファイルであることを確保します。

あなたのハーネスへの貢献は、その両方を本物で意味のあるものにすることです。常にパスするチェックや、空の spec は、スウォームにゴム印を渡すことになります。`org.md:44-58` の `## Testing Posture` ルールはすでにスコープごとのテスト下限を設定しています(例えば `mvp`/`feature` は80%カバレッジのコードと並行するテストを得ます)。より厳格な姿勢を `team.md` で執筆することが、チェックが強制する基準を引き上げる方法です。

センサーは散文の側でチェックを補完します。`units-generation` がすでにインポートしている `required-sections` と `upstream-coverage` センサーは、ゲートで成果物の形状とカバレッジを検証します。[Sensors](06-sensors.ja.md) の腕前で、プロジェクト固有の収束センサーや required-sections センサーを執筆し、同じギャップに目を光らせ続ける Construction ステージの出力にバインドできます。センサーは各書き込みで発火する助言的なテレメトリであり、プロジェクトのチェックコマンドは硬い収束ゲートです。両者は2つの半分を担います — センサーはエージェントが書くにつれて形状を見張り、チェックは Unit がマージできるかを決定します。

---

## ドライバのシーム — `AMADEUS_USE_SWARM`

スウォームが物理的にどうファンアウトするかは環境変数によって選択され、これが **オペレーターのつまみ** であることは率直に述べておく価値があります。これは `.claude/` のデータファイルではなく、`settings.json` にもありません(ファンアウト時にコンダクター側で読まれます)。あなたはそれを執筆しません。あなたのデータが形づくるランタイムを知るために、それを理解します。

| `AMADEUS_USE_SWARM` | ドライバ | 挙動 |
|---|---|---|
| 未設定または `"1"` でない | subagent floor | コンダクターは1つのメッセージで N 個の並列 `Task` 呼び出しを、Unit ごとに1つ発行します。 |
| `"1"` | inline Dynamic Workflow | コンダクターは、その JS が Unit ごとのパイプラインと反復上限を所有する `Workflow` を執筆します。 |
| `"1"` だが Workflow ツールが利用不可 | floor へ loud-degrade | コンダクターは floor にフォールバックし、`--degraded-from ultracode` を渡すのでレフェリーが `SWARM_DEGRADED` を発します。 |

両ドライバは同じ5つの Unit ごとのステージを実行し、同じプロジェクトチェックに対して収束します。違いは、純粋に並列作業がどうディスパッチされるかだけです。暴走に対するバックストップは、スウォームツール自体の外、ハーネスの **Stop-hook シーリング**(`core/hooks/amadeus-stop.ts`、`blockCap()` / `defaultBlockCap()` のペア、`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` として公開)に存在します。この自律 Construction パスでは、デフォルトのシーリングは **8ブロック** です(対話型のデフォルトは2。明示的な `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` は両方を上書きします)。ドライバのシーム契約は [Skill System § 6](../reference/17-skill-system.ja.md#6-the-swarm-referee-the-driver-seam-and-the-bolt-dag) にあります。

1つの判断だけはドライバとともに動きません: 失敗は自律モードに関係なく **常に停止して人間を再び関与させます**。これは `amadeus-common/protocols/stage-protocol.md:125`(「Halt-and-ask on failure」)に従います。レフェリーの `finalize` がその exit-2 エンベロープを返すと、コンダクターは人間にバトンを戻します。手放しモードはハッピーパスのゲートを取り除きますが、失敗の停止は大きく鳴らしたまま保ちます。

---

## どこでコード変更になるか

境界線はクリーンです。上記のすべて — 自律性の姿勢ルール、エッジブロックを生成する Unit 分解、プロジェクトのチェックコマンドと保護された spec、補完的なセンサー — は、あなたが `core/` 配下やプロジェクト設定で執筆するデータです。あなたはコードに触れることなく Construction を形づくります。

スウォームの機構はコードであり、それを形づくるのは Developer Reference の領域です:

- **レフェリー** `amadeus-swarm.ts` — worktree を fork し、評決を実行し、マージ前に主張されたすべての Unit を再検証し(嘘つきコンダクターガード)、マージバックを直列化し、6つの `SWARM_*` 監査イベントを発する、ステートレスな `prepare` / `check` / `finalize` サブコマンド。
- **エンジン** `amadeus-orchestrate.ts` — Construction バッチがいつスウォームの対象になるかを決定する、決定的な `next` / `report` ルーター。
- **Bolt-DAG パーサ** — エッジブロックを `runtime-graph.json` に読み込むコンパイルステップ。

この3つすべての規範的な契約は [Skill System § 6](../reference/17-skill-system.ja.md#6-the-swarm-referee-the-driver-seam-and-the-bolt-dag) にあり、`bolt_dag` ノードのスキーマは [Runtime Graph](../reference/13-runtime-graph.ja.md) にあります。コンダクター自身の章は [Orchestrator](../reference/03-orchestrator.ja.md) です。

あなたの姿勢ルールが統治するもののユーザー向けの側面 — walking-skeleton ゲート、ラダープロンプト、自律モード — は、User Guide の [Phases and Stages § Construction](../guide/04-phases-and-stages.ja.md) で歩まれ、ログで目にする6つの `SWARM_*` 監査イベントは [State and Audit](../guide/10-state-and-audit.ja.md) にカタログ化されています。

---

## 次へ

- **[Porting to a New Harness](09-porting-to-a-new-harness.ja.md)** — このガイドの集大成。あなたは `core/` のすべてのデータ面を形づくりました。最後のステップは、そのコアを *新しい* CLI へレンダリングすることです: 1つの `harness/<name>/` ディレクトリ、1つのマニフェスト行、1つのフックアダプタ、そしてバイト同一性ゲート。
- あなたが形づくるデータ面の全体マップについては、[ハーネスエンジニアガイド概要](00-overview.ja.md) に戻ってください。
- コードレベルのスウォーム、エンジン、Bolt-DAG 契約 — Construction を形づくることがデータ編集であることをやめてコード変更になる境界線 — については [Developer Reference § Skill System](../reference/17-skill-system.ja.md) を参照してください。
