# Requirements — 260814-open-bug-batch-6(オープンバグ5件バッチ)

## Intent 分析

優先度の高いオープンバグ5件(#3062 / #3026 / #3028 / #3031 / #3032)を1 intent で修正し、オープンバグゼロ目標へ前進する。全5件はクロスレビュー2名成立済み(xrev-260815-*、収束: #3031 のみ `REFRAME_REQUIRED`、他4件 `ESTABLISHED_WITH_REFINEMENTS`)。in-progress の4件(#3065 / #3034 / #3040 / #3035、intent 260814-priority-bug-batch)には着手しない。

上流入力: RE 差分リフレッシュ(`codekb/amadeus/re-scans/260814-open-bug-batch-6.md`、observed `a49f9e9fdbd19fd40e9374feba77e9360771d173`)。`architecture.md` は本 intent の節を持つ更新面。`business-overview.md` / `code-structure.md` は本 intent の節を持たない面(本 intent の RE では履歴ラベル更新等の整備のみ)であり、一般的背景(製品概要・リポジトリ構造)としてのみ前提とし、本 intent の事実はそこから引かない。intent-statement は本 intent の Birth 記述(監査シャードの `--arguments`)を指し、対象5 Issue・in-progress 除外・units-generation/delivery-planning EXECUTE 化はそこに由来する。scope-document は self-fix スコープの定義(`.claude/scopes/amadeus-self-fix.md`)を指し、depth Minimal・Test Strategy Comprehensive の由来。team-practices は `memory/team.md` / `project.md` の適用ノルム(TDD 既定・push-first・実測規律)を指す。

## 機能要件

### FR-1: merged self record の pr-convergence 最終化経路(#3062)

merge queue の auto-merge が `report`(converged)より先に着地した場合でも、self record の pr-convergence ステージを正規経路で完了できること。

- 現状(実測): `plugins/github-pr-convergence/tools/pr-convergence-cli.ts` の landed 拒否は **3層**(`:823` / `:1260` / `:1364`)にあり、`create` を除く全 verb が拒否される。センサーの landed 拒否(`amadeus-sensor-pr-convergence-report-format.ts:368-372`)は **stage 非依存**。この行き止まりは stage 文書に明記された意図的設計であり、Merge Queue 必須ノルム・landed 第一級 verdict(predicate `:262` / `:281`)と契約衝突している(レビュー2名の一致所見)
- 是正方式(landed の self report 許可/override 許可/センサー側 landed+merge commit 検証合格 等)は複数の妥当解を持つため、**application-design ステージで選挙にかけて確定する**(裁定 q3-3062-ruling-timing=A)。是正射程は CLI 3層+センサー+stage 文書の契約記述を含む
- 受け入れ: (1) merged PR の self record で最終化 → sensor pass を実測 (2) 未 merge・未収束では従前どおり fail(落ちる実証を1セットで) (3) 方式非依存の一致述語 — 非 self record の landed 扱い(CLI `:1392-1393` の exit 0)と self record の landed 扱いが選挙採用方式の下で整合すること(self のみ拒否という非対称が残らない)を実測 (4) stage 文書に auto-merge と report 実行順序の契約が記載されていることを grep 述語で検査

### FR-2: formal-model-check プラグインのセンサー資産の投影回復(#3026)

`plugins/formal-model-check/sensors/amadeus-model-completeness.md` が投影・発火可能になること(または意図的非投影の根拠を資産側に記録)。

- 現状(実測): `plugin.json` に `sensors` キー不在。`parseSensors` 系の `?? []` フォールバック4箇所により欠落は無音。投影は現在 **13 件**(git-drift 着地後)であり、宣言追加後の期待値は **14 件**(Issue 記載の 12→13 は起票時点の値)
- レビュー精緻化: 宣言追加は投影のみを回復する。発火はステージ側の `sensors:` 配線に依存するため、発火経路(どのステージで発火すべきか)を含めて閉じること。同一プラグインに `tools` 未宣言という同型の第2インスタンスが実在する — 同一変更で扱うか別起票かを設計時に判定し根拠を記録
- 受け入れ: `bun run build` 後に `.claude/sensors/amadeus-model-completeness.md` が投影される(13→14 を実測)。「ディスク上のセンサー資産と plugin.json 宣言の不一致」検査の要否を判定し根拠を記録(Issue AC3)

### FR-3: 06-sensors センサー表の実在集合への同期(#3028)

`docs/harness-engineering/06-sensors.md` / `.ja.md` の表が実在センサー集合と一致すること。

- 現状(実測): 表 10 行 vs 実在 **14 件**(core 11 + プラグイン 3)。欠落は **4 件**(`amadeus-nfr-budget` / `amadeus-question-budget` / `amadeus-scope-sizing` / `amadeus-git-drift`)。幽霊 1 件(`amadeus-model-completeness`)の扱いは FR-2 の裁定に従う
- 受け入れ: (1) 表の行数を FR-2 の裁定と紐づける — FR-2 が宣言追加なら **14 行**(欠落4件追加+model-completeness 保持)、意図的非投影の根拠記録なら **13 行**+当該行の非投影注記(いずれも `grep -c '^| \`amadeus-'` で実測) (2) en/ja 両言語を同一変更で同期し同数であること (3) docs 表と実在集合の drift 検査(既存 docs 検証テストへの追加または件数フリー契約化)の要否を判定し根拠を記録(Issue AC3)

### FR-4: t-worktree-gc fixture flake の決定的化(#3031、リフレーム後スコープ)

裁定 q1-3031-scope=A。クロスレビューで Issue の完了条件が部分的に失効(stderr は attempt 1 ログに逐語で存在=REFUTED、retry は PR #3056 `e44f6e3c2` で着地済み)したため、残存スコープは:

- 既着地 retry の射程検証: retry の発火条件は stderr `/locked' for writing: No such file or directory` 包含に限定される。観測失敗(job 94681485455 の exit 128)をこの条件が覆うかを一次証跡で判定
- 覆わない場合の決定的化の残余是正(retry 条件の拡大・fixture 直列化・根拠付き flake 免除のいずれか)。時間アサーション裁定(2026-08-15 ユーザー直接裁定)に従い、厳密な時間アサーションを導入しない
- fixture 準備に `git worktree add` を使う他テストの対称面棚卸し — 同一リスクは**修正でなく起票**(潜在バグ探索ノルム)
- 受け入れ(判定分岐ごと): (a) retry が観測失敗を**覆う**と判定した場合 — 一次証跡(attempt 1 ログの stderr と retry 発火条件の対応)を record に記録し、是正0件の根拠として確定する (b) **覆わない**場合 — 採用案に対応した検証述語で閉じる: retry 条件拡大なら「現行条件下で赤になる失敗様式の注入 → 是正後 green の落ちる実証1セット」、fixture 直列化なら「直列化前後の実行構成差分+当該テスト N 回反復(N≥10)全 pass の実測」、根拠付き flake 免除なら「免除台帳への reason・Issue 参照付き登録と fail-closed 検査の green」 (c) いずれの分岐でも対称面棚卸しの記録(起票または0件根拠、検索述語併記)。反復実行・注入は時間アサーション裁定(2026-08-15)に抵触しない(厳密時刻の断言を含まないため)

### FR-5: 監査シャード汚染の機序調査と収束(#3032)

裁定 q2-3032-scope=A。調査ユニットとして実施し、Issue の完了条件どおり両方向で収束させる:

- repo 外 scratch で最小再現を試行(同一プロセスで実 workspace を先に OTel ピン → fixture 向け `recordEngineError` の書込先を実測)。現行バイトの経路読解(RE §2.5)では `assertSameProject` throw を `emitError` の `catch {}` が握り潰すため行は書かれない — 仮説成立には別機序が要る点を再現設計に織り込む
- 機序確定時: 監査 emit の宛先が呼出時 `projectDir` と常に一致(不一致は loud fail または no-op)する是正+回帰テスト
- 再現しない場合: 実測ログを添えて Issue のクローズ準備(クローズ自体は人間承認境界)+既着地2行の revert 要否を申し送り
- 受け入れ: いずれの分岐でも実測証跡を **record**(本 intent の成果物ディレクトリ)へ確定的に残すこと。Issue へのコメント投稿はクローズ提案時の任意手段とし、クローズ自体は人間承認境界を維持する

## 非機能要件

- NFR-1: 全変更は既存の blocking CI 集合(typecheck / lint / 隔離2回ビルド / source-only / グラフ不変量 / フルスイート / Project & Patch Coverage Gate / plugin-conformance-e2e)を green で通過する
- NFR-2: TDD 既定(team.md Testing Posture)— 実行可能な振る舞いの変更は失敗テスト先行。文書のみの FR-3 は適用外だが drift 検査を追加する場合は落ちる実証を経る
- NFR-3: 検証順序は push-first(commit 次第 push→PR 作成、重い検証は CI と並列)

## 制約

- 実装は git worktree 分離で行い、Bolt ごとに PR を分ける(1 Issue = 1 Unit 原則、units-generation / delivery-planning EXECUTE 済み)
- intent 260814-priority-bug-batch(#3065 / #3034 / #3040 / #3035、worktree bolt-priority-bug-batch)と同一ファイルの交差がある場合は直列化する
- `packages/framework/core/` 変更時は `bun run build` で全ハーネス再生成し追跡ファイル不変を確認。model-map.json 実装ハッシュピン・coverage-patch-allowlist・coverage-registry の台帳 resync を同一変更で行う(bt-ledger-resync)
- Issue クローズ・PR マージは人間承認境界(P4)

## 前提

- クロスレビュー verdict(2026-08-15 投稿済みコメント)を実在確認として扱うが、実装時の数値・行番号は observed 断面(`a49f9e9f`)の実測を正とする
- #3062 の設計裁定は application-design の選挙結果に従う(選挙が割れた場合はユーザーエスカレーション)

## スコープ外

- in-progress の4 Issue(#3065 / #3034 / #3040 / #3035)
- 新規候補 #3074(recompose ガード)/ #3075(時間アサーション横展開棚卸し)— 次バッチへ申し送り
- 時間アサーションの全域横展開(#3075 の主題。本 intent では FR-4 の当該テストに限り裁定を適用)

## 未解決事項(後続ステージへ)

- #3062 の是正方式の選挙(application-design)
- #3026 の tools 未宣言第2インスタンスの扱い(同一変更か別起票か — application-design で判定)
- FR-2/FR-3 の drift 検査の要否判定(design で根拠を確定)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-15T00:15:33Z
- **Iteration:** 1
- **Scope decision:** none

5 Issue の FR 写像・Minimal バンド・consume 参照規律・互換シム不在は適合するが、FR-4 の受け入れ条件が「決定的化」を実証できず(単発ローカル green は flake の是正証拠にならず、免除・直列化の分岐にも対応しない)BLOCKER 1 件。

### Findings

- BLOCKER | FR-4(#3031)の受け入れ「残存是正の実装+当該テストのローカル green」は、FR が要求する『決定的化』の合否証拠になっていない — flake は単発 green で通るため実装前でも満たしうる自己成立条件であり、かつ FR 本文が並列に挙げる残余是正3案のうち「fixture 直列化」「根拠付き flake 免除」の2案では当該テストの green が是正の帰結を示さない(免除案では是正コード自体が存在しない)。さらに第1ブレット『既着地 retry(PR #3056 e44f6e3c2)の発火条件が観測失敗(job 94681485455 exit 128)を覆うか』が「覆う」と判定された分岐には完了条件が定義されておらず、受け入れは「残存是正の実装」を無条件の必須項として書いている。同一 intent の FR-5 が両分岐(機序確定時/再現しない場合)の完了条件を明示しているのと非対称。是正の形: (a) 判定分岐ごとの完了条件(覆う=一次証跡の記録+是正0件の根拠、覆わない=採用案ごとの検証述語)を書き分ける (b) 決定的化の検証述語を、採用案に対応した実測可能な形(反復実行回数と全 pass、または現行条件下で赤になる注入→是正後 green の1セット)で固定する。時間アサーション裁定(2026-08-15)は反復実行やフィクスチャ注入を妨げない。
- FOLLOW-UP | FR-2 と FR-3 のセンサー件数の語が同一名で別集合を指し、FR-3 の受け入れが数値述語を持たない — FR-2 は『投影は現在 13 件、宣言追加後 14 件』、FR-3 は『実在 14 件(core 11 + プラグイン 3)』かつ amadeus-model-completeness を『幽霊 1 件』と呼ぶ。14 は未投影のディスク実在資産(model-completeness)を含む集合、13 は投影集合であり、同じ『実在』の語が両方に読める。FR-3 の受け入れ『表が実在センサー集合と一致』は、FR-2 の裁定次第で最終行数が 13 行にも 14 行にもなりうるため、そのままでは合否を機械判定できない。是正の形: FR-3 の受け入れに『FR-2 の裁定が宣言追加なら 14 行、非投影根拠の記録なら 13 行+根拠注記』のように裁定分岐と行数を紐づけた述語を書く(欠落4件 amadeus-nfr-budget / amadeus-question-budget / amadeus-scope-sizing / amadeus-git-drift の追加は現状のまま可)。
- FOLLOW-UP | ステージ frontmatter の consumes に宣言された intent-statement / scope-document / team-practices が requirements.md の散文で名指し参照されていない(team-practices は NFR-2 の『team.md Testing Posture』が実質参照だが、intent-statement と scope-document は不在)。ステージ契約 §Sensors の upstream-coverage は『consumes 宣言の各 artefact を散文が参照すること』を検査対象と明記しており(stage file 内の当該記述は intent-statement / scope-document / team-practices を名指し)、現状では SENSOR_FAILED を招きうる。brownfield 3面(business-overview / architecture / code-structure)の扱いは適切 — architecture.md は本 intent の節(『オープンバグ5件のアーキテクチャ上の位置づけ(260814-open-bug-batch-6)』)を持つ更新面であり、business-overview / code-structure を一般背景に限定する宣言は c4-consume-header-is-not-citable-content に整合している。
- FOLLOW-UP | FR-1(#3062)の受け入れが是正射程の全面をカバーしていない — 本文は射程を『CLI 3層(:823 / :1260 / :1364)+センサー(:368-372)+stage 文書の契約記述』と定義するのに対し、受け入れは『merged PR の self record で最終化 → sensor pass』『未 merge・未収束では従前どおり fail』『stage 文書へ auto-merge と report 実行順序の契約を明記』であり、最後の項目は実行アクションであって検査述語ではない。方式選定を application-design の選挙へ委ねる裁定(q3-3062-ruling-timing=A)自体は妥当だが、方式に依存しない述語(例: 非 self record の landed 扱い(CLI :1392-1393 の exit 0)と self record の扱いが一致すること)を1つ固定できると、設計裁定がどちらへ倒れても合否が測れる。
- NIT | FR-5(#3032)の実測証跡の置き場が『Issue コメントまたは record』とされているが、Issue へのコメント投稿は外部への書込であり、制約節が人間承認境界として列挙しているのは『Issue クローズ・PR マージ』のみ。証跡を record 側へ確定的に置く(Issue コメントは承認後の任意)と書き分けると、承認境界の解釈がぶれない。
- NIT | スコープ規律と互換シムの観点では所見なし — 対象5 Issue(#3062→FR-1 / #3026→FR-2 / #3028→FR-3 / #3031→FR-4 / #3032→FR-5)は 1:1 で写像され、in-progress 4件(#3065 / #3034 / #3040 / #3035)と新規候補(#3074 / #3075)はスコープ外節で明示除外、FR-4 の対称面棚卸しは『修正でなく起票』と限定されており膨張していない。要求にない後方互換レイヤー・移行シム・二重実装の混入も検出されなかった。FR 数 5 は Minimal バンド(5-10)の下限ちょうど、各 FR は 3-5 行でバンド整合。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-15T00:18:33Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(FR-4 の分岐別完了条件と決定的化の検証述語)と FOLLOW-UP/NIT 全件が是正済み。新規 BLOCKER なし。上流入力ヘッダの provenance 主張1件が実測と矛盾するため FOLLOW-UP。

### Findings

- FOLLOW-UP | 上流入力ヘッダ(requirements.md 冒頭『上流入力』段落)の provenance 主張が実測と矛盾する — 『business-overview.md / code-structure.md は本 intent の RE がレビュー済み無変更とした面であり、本 intent の事実はそこから引かない』と宣言しているが、両ファイルは本 intent の RE が更新した面であり本 intent の節を持つ(`grep -n "260814-open-bug-batch-6"` → business-overview.md:105『オープンバグ5件の業務課題(260814-open-bug-batch-6、現在、observed a49f9e9fd)』、code-structure.md:252『Focus Area: オープンバグ5件の患部配置(260814-open-bug-batch-6、現在、observed a49f9e9fd)』。`git status --porcelain amadeus/spaces/default/codekb/amadeus/` でも両ファイルは M。RE 記録 re-scans/260814-open-bug-batch-6.md が『無変更』と述べるのは :78-:85 の実装ファイル群であって codekb 面ではない)。実害は二方向: (1) 実測に基づかない断定が成果物に残る(P2 違反) (2) FR-2 の『13→14』と FR-3 の『欠落4件』は business-overview.md:126 に一次記述があるにもかかわらず、この宣言が下流ステージへ当該面からの引用を禁じており、正当な引用元を自ら塞いでいる。是正の形: 3面すべてを『本 intent の節を持つ更新面』として書き直し、FR-2/FR-3 の件数に business-overview.md:126 を引用元として併記する。iteration 1 のレビューはこの扱いを『適切』と評価したが、それは誤りであり本 iteration の実測で覆る。
- FOLLOW-UP | FR-1 の方式非依存述語が引く CLI 行(`pr-convergence-cli.ts:1392-1393` の exit 0)と FR-1 現状記述の3層(:823 / :1260 / :1364)・センサー(:368-372)の行番号は、本レビューのスコープ外パスのため未検証。application-design で選挙にかける前に observed 断面(a49f9e9f)で行番号の実在と意味論の一意性を再実測すること(mechanism-cite-verify-at-draft は起草時1回で確定させず後続段でも再列挙することを求める)。
- NIT | iteration 1 findings の是正は全件確認 — BLOCKER(FR-4): 受け入れが判定分岐 (a) 覆う=一次証跡の record 記録+是正0件の根拠 / (b) 覆わない=採用案別の検証述語(retry 条件拡大は注入→赤→是正後 green の落ちる実証1セット、fixture 直列化は N≥10 全 pass、flake 免除は台帳登録+fail-closed 検査 green)/ (c) 全分岐共通の対称面棚卸し(検索述語併記)へ書き分けられ、単発 green の自己成立条件は解消。FOLLOW-UP 1(FR-3): 行数を FR-2 の裁定へ紐づけ(宣言追加=14行 / 非投影根拠=13行+注記)、`grep -c '^| `amadeus-'` の数値述語を追加。FOLLOW-UP 2(consumes): intent-statement / scope-document / team-practices を散文で名指し参照。FOLLOW-UP 3(FR-1): 方式非依存の一致述語(3)と stage 文書の grep 述語(4)を追加。NIT 1(FR-5): 証跡置き場を record へ確定し Issue コメントを任意手段へ格下げ。
- NIT | スコープ・互換シム・バンド整合は再確認して所見なし — FR 数 5 は Minimal バンド(5-10)の下限、対象5 Issue の 1:1 写像・in-progress 4件と新規候補2件の明示除外は維持され、要求にない後方互換レイヤー・移行シム・二重実装の混入も検出されなかった。
