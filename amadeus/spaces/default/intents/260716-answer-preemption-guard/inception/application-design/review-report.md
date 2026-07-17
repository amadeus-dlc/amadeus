上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md(レビュー対象の consumes と同一集合)。

# Application Design レビュー報告(answer-preemption-guard / Issue #922)

**Verdict: REVISE**(Critical 1件、Major 2件、Minor 4件)

## 観点別レビュー

### 1. 実装可能性(dispatcher 契約整合)

`amadeus-sensor.ts` の dispatcher は `out.pass`(boolean 必須)と `out.findings_count`(id-agnostic 汎用読み)のみを要求する(`packages/framework/core/tools/amadeus-sensor.ts:565-600`, `:686-699` の `readFindingsCount` 実測)。設計の Result 型 `{ pass, findings_count, reason, skipped }`(`component-methods.md:11`)はこの契約と整合する。

`checkQuestionsEvidence(questionsPath: string): QuestionsEvidence` の実シグネチャは `amadeus-lib.ts:1173`(判別ユニオン `QuestionsEvidence` は `:1144`〜、要件 requirements.md:3 の「:1144-1146」引用は正確)。前例 `amadeus-sensor-required-sections.ts` の `--output-path` は「起点になった成果物ファイルそのもの」を指す実測(`existsSync(flags.outputPath)` → `readFileSync` 直読 :121-127)であり、`evaluateAnswerEvidence(outputPath)` が `checkQuestionsEvidence(outputPath)` へそのまま渡す設計(`component-methods.md:10`)は正しい対応。ここは問題なし。

### 2. 引用の意味論適合(citation-semantics-check)

- `import.meta.main` ガード(前例 `:229-232`)、`./amadeus-lib.ts` からの import(前例 `:1-3`)は実ファイルと一致(`amadeus-sensor-required-sections.ts:1-3`, `:232`)。
- `:112 の fail 関数に倣い exit 1` の引用範囲は「CLI 引数不備」に限定されており、前例本体は「`--output-path` 不在または対象ファイル not-found」の両方を exit 1 にしている(`:118-123`)のに対し、design は「ファイル not-found」を `checkQuestionsEvidence` の `no-file→pass` にそのまま委ねる(基準ファイルは questions ファイルであり「全 stage が持つわけではない」という既存コメント通りの挙動)。これは前例の一部だけを意図的に踏襲する妥当な選択だが、component-methods.md にはこの分岐点(CLI引数欠落=exit1 / 対象ファイル不在=pass)が明記されていない → Minor #4。

### 3. 対称性(symmetric-pair-review)— sensor 発火 ⇔ gate-start 検査

cutoff 定数・日付導出式は ADR-3/C-3 で canonical 化されており対称(`amadeus-state.ts:1721` のローカル定数を `amadeus-lib.ts` の export へ置換)。

一方で **発火条件(matches glob)が成果物間で矛盾**しており Critical(下記)。また日付導出の「同一式」表現はメカニズム面で精度不足(Minor)。

### 4. ADR の代替案品質

ADR-1〜4 いずれも Alternatives Rejected 2件以上を満たす。ただし inception ガードレール(`phases/inception.md`)が要求する ADR 必須要素「Context/Decision/**Consequences**/Alternatives Rejected」のうち Consequences に相当する明示セクションが本 `decisions.md` には無い(Minor #6、下記)。

### 5. 要件カバレッジ(FR→AC→設計 対応表)

| FR/AC | 設計での着地 | 判定 |
|---|---|---|
| AC-1a (matches glob) | components/decisions/services で矛盾 | **Critical** |
| AC-1b〜1e | component-methods.md C-1 | OK |
| AC-2a〜2c | decisions ADR-3、component-methods C-3 | OK(日付導出の精度は Minor) |
| AC-3a | decisions ADR-2、逸脱を diary(`memory.md:9`)へ申告済み・実装保留 | OK(手続き遵守) |
| AC-3b | component-dependency.md(graph compile 無改修) | OK |
| AC-3c(runner-gen drift guard) | 言及なし | Minor #5(実害なしと確認済み) |
| AC-4a〜4c | components.md C-5 に概要のみ(construction 側で詳細化予定) | OK(この段の粒度としては妥当) |
| AC-5a, 5c, 5d | component-dependency.md、questions.md に部分言及 | OK |
| AC-5b(gen-coverage-registry 判断) | 言及なし | **Major** |
| AC-6a | decisions ADR-1 | OK(根拠の一部を後述) |
| AC-7a | 対象外(実行フェーズのタスク) | N/A |

ADR-2 の AC-3a 逸脱については、`decisions.md:19` と `application-design-questions.md:7` の両方に明記され、`memory.md` の Deviations 節(`:9`)に「裁定まで C-4 は実装しない」と実装停止も記録されている — deviation-stop-before-implement 手続きは遵守されている。

### 6. 検証劇場チェック

Result 型の4フィールド(`pass`/`findings_count`/`reason`/`skipped`)は ADR-4 で「全フィールドが dispatcher/finding に消費される」と明記され、`reason` は finding 詳細生成(`buildDetailBody` が `sensorJson` 全体を渡す実測 — `amadeus-sensor.ts` 内 `detailBody` 生成部)に、`skipped` は ADR-4 の pass 理由の可視化に使われる。ダミーフィールドは無い。

### 7. 後方互換シム混入なし

ADR-3 は「挙動不変」の局所置換のみで、旧定数と新定数の並存・フォールバック分岐は無い。C-4 も新規追加のみで既存 sensors: リストの削除・置換を伴わない。混入なし。

## 指摘一覧

### Critical

**C-1: manifest `matches` glob の値が成果物間で矛盾しており、一意に実装できない**

requirements.md AC-1a は次のように明記する:「`matches` は questions ファイルに到達する glob(既存 `**/{amadeus-docs,intents}/**` が match=true 実測済み — A1)」(`requirements.md:9`)。これは required-sections manifest が実際に使っている広い glob(`.claude/sensors/amadeus-required-sections.md` の `matches: "**/{amadeus-docs,intents}/**"` 実測)を **そのまま再利用する** という意味の記述である。

ところが application-design の decisions.md と services.md は逆に「狭い glob」を前提にしている:
- `decisions.md:16`「発火の実選別は manifest matches `**/*-questions.md`(狭 glob)が担い、questions を書かない stage ではそもそも発火しない」
- `decisions.md:19`「matches 狭 glob により実行時コストは questions 書込み時のみ」(32 stage 一括宣言の低コスト論拠として使用)
- `services.md:16`「Write(questions)→ ... → matches `**/*-questions.md` 一致 → dispatcher fire」

この2つは両立しない一つの manifest フィールドについての記述であり、C-2(manifest 本体、`components.md:10`)の実装者は `matches:` に何を書けばよいか成果物単独からは決定できない。加えて、両者は実行時コストの見積りが真逆になる:
- 広い glob(AC-1a 採用)の場合: 32 stage 全部で「questions 以外を含む全ドキュメント書込み時」に script が spawn され、AC-1d のスクリプト側 basename フィルタが唯一の実質的な選別ロジックになる。
- 狭い glob(decisions.md/services.md 採用)の場合: hook 側で questions ファイル以外はそもそも発火せず、AC-1d のスクリプト側フィルタは実運用では到達しない防御的コードになる。

ADR-2 の「32 stage 一括宣言」の正当化(「matches 狭 glob により実行時コストは questions 書込み時のみ」)は狭い glob を前提にしており、もし AC-1a どおり広い glob を採用するなら、この低コスト論拠自体が成立しなくなる(32 stage × 全ドキュメント書込みごとに spawn が発生する)。symmetric-pair-review の観点(発火条件の対称性)からも、成果物間で発火条件そのものが食い違っているのは是正必須。

**是正方向**: どちらか一方に統一し、全成果物(components/component-methods/decisions/services)を同じ値で揃える。AC-1d のスクリプト側 basename フィルタが要件で明記されている(AC-1d は削除されていない)ことから、広い glob(AC-1a 採用・required-sections 踏襲)を正としてスクリプト側フィルタが実働する設計の方が要件文言と整合的に見えるが、それを選ぶ場合は ADR-2 の低コスト論拠の書き換えが連動して必要になる。

### Major

**M-1: AC-5b(gen-coverage-registry 登録要否の設計判断)が5成果物のどこにも存在しない**

requirements.md AC-5b:「`tests/gen-coverage-registry.ts` への新 script 登録(TOOL_DESCRIPTORS)+ registry 再生成が必要かを **design で実測判断**し、必要なら同一 PR で実施する」(`requirements.md:36`)。5成果物(components/component-methods/services/component-dependency/decisions)を全文 grep したが `gen-coverage-registry` `TOOL_DESCRIPTORS` の言及は0件。

実測(`tests/gen-coverage-registry.ts:255-268`)では `TOOL_DESCRIPTORS` は switch/subcommand 型ディスパッチャ(`amadeus-state.ts`、`amadeus-sensor.ts` 本体等)専用のレジストリであり、per-sensor スクリプト(`amadeus-sensor-required-sections.ts` 含む)はどれも登録されていない。したがって実質的な結論は「登録不要」になる可能性が高いが、**その判断自体が成果物に存在しない**。AC-5b は明示的に「design で実測判断し記録する」ことを要求しており、実装者が要件充足を成果物だけから確認できない状態は是正対象。

**M-2: ADR に project.md/inception ガードレール必須の "Consequences" 相当セクションが欠落**

`phases/inception.md`「すべての ADR に含める: Context、Decision、Consequences、Alternatives Rejected」。同リポジトリの先行実績(`amadeus/spaces/default/intents/260713-swarm-driver-migration/inception/application-design/decisions.md:1-30` 実測)は Context/Options/Decision/Consequences の4点セットを明示見出しで踏襲している。本 `decisions.md` の ADR-1〜4 は Context/Decision/根拠/Alternatives Rejected/セキュリティ影響という構成で、Consequences に相当する内容は「根拠」に暗黙的に混在しており、独立した Consequences 節が無い。内容が欠けているわけではないが、ガードレールが名指しする必須要素が形式上欠落している。

### Minor

**m-1: 日付導出の「同一式」表現がメカニズムの違いを隠している**

`component-methods.md:13`「日付導出は gate-start :1722 と同一式(record dir basename 先頭6桁)— outputPath から intent dir を抽出する」。実際には gate-start 側は `recordDir(pd)`(`amadeus-lib.ts:1086`、active-intent カーソル+`intents.json` レジストリ経由の状態解決)で record dir を得てから `basename(rd).slice(0,6)` を parse するのに対し、sensor 側は `outputPath` 文字列から `intents/<dir>/` セグメントを直接パースする方式で、状態(カーソル)を一切参照しない。数値変換(`slice(0,6)` → `parseInt`)は同一だが、intent dir 名を得る手段は別経路。常態では同じ結果になるが(書き込みは通常アクティブ intent 配下で起きる)、「同一式」という表現は経路の違いを覆い隠す。実装時に導出関数の docstring へ明記することを推奨。

**m-2: AC-3c(runner-gen drift guard)が成果物に一切登場しない**

`requirements.md:25` AC-3c「runner-gen drift guard(`bun .claude/tools/amadeus-runner-gen.ts check`)が green のこと」。実測(`.claude/tools/amadeus-runner-gen.ts:100-103` 他)では runner-gen は compiled stage-slug 集合のみに依存し `sensors:` フィールドとは無関係 — 本変更(既存32 stage の frontmatter に1行追加、新規 stage 追加なし)では自明に green になる。実害はないが、トレーサビリティ表に「影響なし」の一言があるべき。

**m-3: ADR-1 の「(b) の独自検知価値ゼロ」論拠がエッジケースを扱っていない**

ADR-1(`decisions.md:9`)は「両層をすり抜けて commit された先取り記入は gate-start の fail-closed により構造的に発生しない」と述べるが、これは「gate-start 通過後に questions ファイルが再編集され、その後 gate-start が再実行されないまま commit される」というケース(例: 承認済みゲートの後で誤ってプレースホルダを埋め直す)を想定していない。発生確率は低いとみられるが、ADR の「独自検知ゼロ」という言い切りはこの分だけ過大。断定を弱め「実務上無視できる残余リスク」等への言い換えを推奨(ブロッキングではない)。

**m-4: 前例 `:112` の exit-1 分岐と `checkQuestionsEvidence` の no-file pass 分岐の境界が明記されていない**

上記「引用の意味論適合」節で述べた通り、CLI 引数不備(exit 1)と対象ファイル not-found(pass、`checkQuestionsEvidence` 内部委譲)の境界線が component-methods.md の `main` 責務記述に明記されていない。実装者が required-sections 前例を字面通り模倣して `existsSync` チェック+`fail()` を追加すると、AC-1c が要求する「述語の結果をそのまま写像する」という無改修方針に反する二重ゲートが生まれかねない。1行の注記で予防可能。

## 総括

FR-1〜FR-7 の大半は要件からの直接トレースが成立し、ADR-2 の逸脱申告も手続き通り実装前停止されている点は良好。ただし Critical の manifest matches 矛盾は実装者が迷わず着手できない状態であり、Major 2件(gen-coverage-registry 判断の欠落、ADR 必須要素の欠落)とあわせて是正のうえ再レビューを要する。

## Iteration 2

**Verdict: READY**(是正7件すべて実ファイルで確認済み、新規指摘なし)

上流入力(consumes 全数、iteration 2 でも同一集合): requirements.md、architecture.md、component-inventory.md、team-practices.md。

### 是正の実測確認

| # | 指摘 | 是正内容 | 実測箇所 | 判定 |
|---|------|---------|---------|------|
| C-1 | matches glob 矛盾 | requirements.md AC-1a を狭 glob `**/*-questions.md` へ遡及訂正し decisions.md/services.md と統一。A1 実測(広glob match=true)は「hookが questions に到達する」根拠に限定する注記へ変更、広glob再利用ではないと明記 | `requirements-analysis/requirements.md:9`「`matches` は **狭 glob `\*\*/\*-questions.md`** とする...広 glob の再利用を意味しない。【遡及訂正 2026-07-16: ...狭 glob へ統一】」/ `decisions.md:17`(ADR-2、既存のまま狭glob)/ `services.md:16`(既存のまま狭glob)。全成果物で矛盾解消を確認。AC-1d の script 側 basename フィルタは「手動 fire(任意パス指定可)経路で実働するため存置」と用途が明記され、狭glob採用後もデッドコード化しない理由が成立している | 解消 |
| M-1 | AC-5b(gen-coverage-registry)判断欠落 | decisions.md に ADR-5 新設 | `decisions.md:39-45`。Decision「登録不要」、根拠は `tests/gen-coverage-registry.ts:255-268` の実測(reviewer が iteration 1 で確認した内容と一致 — per-sensor script は同レジストリ対象外、前例4本とも未登録)。Alternatives Rejected 2件、Consequences(in-process seam 計測方針)、AC-5c の `registry --check` 検証列への言及もあり閉包している | 解消 |
| M-2 | ADR に Consequences 節欠落 | ADR-1〜5 全てに独立した `Consequences:` 行を追加 | `decisions.md:10`(ADR-1)、`:21`(ADR-2)、`:29`(ADR-3)、`:37`(ADR-4)、`:44`(ADR-5)の5箇所で確認。inception ガードレールの必須要素(Context/Decision/Consequences/Alternatives Rejected)を全 ADR が充足 | 解消 |
| m-1 | 日付導出「同一式」の精度 | component-methods.md に経路差を明記 | `component-methods.md`「日付の数値変換...は gate-start :1722 と同一だが、**intent dir 名の取得経路は異なる**: gate-start は状態解決(recordDir...)、sensor は outputPath 文字列中の `intents/<dir>/` セグメント直接パース(状態非参照)」。実装時 docstring 転記の指示も明記 | 解消 |
| m-2 | AC-3c(runner-gen)未言及 | component-dependency.md に非影響を追記 | `component-dependency.md:21`「runner-gen drift guard(AC-3c)への影響: なし — runner-gen は compiled stage-slug 集合のみに依存し sensors: フィールド非参照(amadeus-runner-gen.ts:100-103 reviewer 実測)」。iteration 1 レビューでの実測(:100-103、`runnableStages().map(...)`)と整合 | 解消 |
| m-3 | ADR-1 の断定過大 | 残余リスクを明示し sensor 層による捕捉を追記 | `decisions.md:9`「残余ケースは実務上無視できる: gate-start 通過後に questions が再編集されるケースは、その再編集 Write 自体が sensor 層の発火対象であり記入時点で loud 化される」。「構造的に発生しない」の言い切りを残余リスク明示 + 緩和機構の説明へ弱めており、指摘の趣旨(過大な断定の是正)を満たす | 解消 |
| m-4 | exit-1 とファイル不在の境界未記載 | component-methods.md の main 責務に明記 | `component-methods.md`「(--stage/--output-path 必須、**CLI 引数不備のみ** 前例 :112 に倣い exit 1)...**対象ファイル不在は exit 1 にしない** — 述語の no-file→pass に委譲(existsSync+fail の二重ゲートを作らない)」。境界線が1行で明記され、実装者が required-sections を字面模倣して二重ゲートを作るリスクを予防している | 解消 |

### E-APG-AD-DEV 裁定の転記確認

- `requirements-analysis/requirements.md:23`(AC-3a): 「【遡及訂正 2026-07-16: E-APG-AD-DEV 裁定(X 採用、e1=X GoA 2・e2=X GoA 1・Y 受容度7)...e1 留保転記: 本遡及訂正の根拠(慣行 questions の実測)を requirements へ verbatim 転記すること — 本注記がその転記】」— 裁定結果・票(GoA内訳)・留保転記のいずれも記載を確認。
- `application-design/decisions.md:20`(ADR-2): 「**裁定(E-APG-AD-DEV、2026-07-16 22:04:34Z 開票)**: X(全32 stage)採用 — e1=X(GoA 2、留保: ...→ 実施済み)・e2=X(GoA 1、独立再列挙 18/32 一致)・e3 後着。実装前停止→裁定→再開の手続き完了(deviation-stop-before-implement)」— 開票時刻・各票の GoA・留保内容が転記されている。

両ファイルとも裁定・票・留保の3要素を確認でき、norm-pr-vote-count-check 相当の照合(票数表記が食い違っていないか)も行った — requirements.md と decisions.md の両方で e1=X(GoA2)・e2=X(GoA1)の記載が一致しており、票数の水増し・食い違いは無い。

### 新規指摘

なし。iteration 1 の7件はいずれも実ファイルで是正が確認でき、是正自体が新たな矛盾(fix-diff-independent-reverify の観点)を持ち込んでいないことも確認した(例: ADR-5 の「登録不要」判断は iteration 1 のレビュー実測と完全に一致しており、再是正コミットでの数値・引用の誤りは無い)。

**Verdict: READY**
