# Units of Work — 260814-open-bug-batch-6

上流: `requirements.md`(FR-1〜FR-5)、application-design の `components.md` / `component-methods.md` / `services.md` / `component-dependency.md` / `decisions.md`。1 Issue = 1 Unit 原則(project.md)に従い、5 Issue を5ユニットへ写像する。各ユニットは独立に実装・出荷可能(依存は U-2 → U-3 の分母のみ)。

## U-1: landed-finalization(FR-1 / #3062 / C-1)

- kind: `library`(standalone runtime を持たない既存プラグインツール群の修正)/ Deployment model: shared(プラグイン投影経由で全ハーネスへ配送)/ 複雑度: M
- 内容: 選挙裁定 A(D-1)の実装 — pr-convergence CLI の self×landed 拒否3層を landed 事実の report 書込へ置換、センサーの landed+merge commit 検証合格、stage 文書の契約改訂(en 正本+全ハーネス投影)
- 所有ファイル: `plugins/github-pr-convergence/**`(tools / sensors / stages)、対応テスト
- 受け入れ: requirements FR-1 (1)-(4)。落ちる実証1セット必須
- 規模: 実装 ~120 行 + テスト ~200 行
- テスト所有: 同 unit(source と test の ownership 同一境界)

## U-2: sensor-declaration(FR-2 / #3026 / C-2)

- kind: `spec`(manifest 宣言+配線 — その場で消費される契約)/ Deployment model: shared(投影経由)/ 複雑度: S
- 内容: `plugins/formal-model-check/plugin.json` へ sensors 宣言追加+発火配線(資産 manifest の適用宣言から導出)+宣言突合検査(D-3 (a))
- 所有ファイル: `plugins/formal-model-check/plugin.json`、消費ステージ frontmatter、宣言突合検査テスト
- 受け入れ: requirements FR-2(投影 13→14 実測、検査は落ちる実証)
- 規模: 実装 ~10 行 + 検査テスト ~60 行
- テスト所有: 同 unit(宣言突合検査テストは U-2 が所有)

## U-3: docs-sensors-sync(FR-3 / #3028 / C-3)

- kind: `spec`(docs 契約面の同期+検査)/ Deployment model: embedded(リポジトリ docs)/ 複雑度: S
- 内容: 06-sensors en/ja 表の 14 行同期+docs drift 検査(D-3 (b))
- 所有ファイル: `docs/harness-engineering/06-sensors.md` / `.ja.md`、既存 docs 検証テストへの追加
- 受け入れ: requirements FR-3(行数述語・en/ja 同数・落ちる実証)
- 規模: docs ~10 行 ×2 + 検査テスト ~50 行
- 依存: U-2 の宣言裁定(表の最終行数 14 の前提)
- テスト所有: 同 unit(docs drift 検査は U-3 が所有)

## U-4: worktree-gc-determinism(FR-4 / #3031 / C-4)

- kind: `library`(テストコードの決定的化)/ Deployment model: embedded(tests/)/ 複雑度: S
- 内容: 既着地 retry の射程判定(一次証跡)→ 分岐別是正(D-4)+対称面棚卸し(起票のみ)
- 所有ファイル: `tests/integration/t-worktree-gc.test.ts`(覆う分岐なら変更 0)
- 受け入れ: requirements FR-4 (a)/(b)/(c)
- 規模: ~40 行(覆う場合 0 行+record 記録)
- テスト所有: 同 unit(対象は既存テストファイルそのもの)
- record 成果物: 一次証跡判定と対称面棚卸し(検索述語併記)を `construction/worktree-gc-determinism/code-generation/` 配下へ記録(FR-4 (a)/(c))。(2026-08-15 訂正: 同上 — engine 正準パスへ統一)

## U-5: audit-sink-investigation(FR-5 / #3032 / C-5)

- kind: `library`(core emit 経路の条件付き是正)/ Deployment model: shared(core は全ハーネス投影)/ 複雑度: M(調査含む)
- 内容: repo 外 scratch での機序再現試行(D-5)→ 確定時は emit 宛先一致の是正+回帰テスト、非再現時はクローズ準備+申し送り
- 所有ファイル: 調査は repo 外。是正時のみ `packages/framework/core/tools/amadeus-lib.ts` / `otel/**` と対応テスト(bt-ledger-resync 同梱)
- 受け入れ: requirements FR-5(証跡は record へ)
- 規模: 是正時 ~60 行(非再現時 0 行)。調査スクリプトは repo 外 scratch(~100 行、使い捨て — 成果は record への実測記録)
- テスト所有: 同 unit(是正時の回帰テストは U-5 が所有)
- record 成果物: 再現試行の実測ログ・機序判定・クローズ準備文面を `construction/audit-sink-investigation/code-generation/` 配下へ記録(FR-5 受け入れ)。(2026-08-15 訂正: 当初 `issue-3032-audit-sink/` サブディレクトリ案で起草したが、engine の per-unit 成果物正準パスは unit スラッグ直下 — §12a レビュー指摘により engine 正準へ統一)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T00:47:17Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 3件・FOLLOW-UP 3件は全件是正され、yaml エッジブロックは整形式・非循環・語彙適合・宣言名照合すべて合格。新規 BLOCKER なし、FOLLOW-UP 4件。

### Findings

- NIT | iteration 1 の BLOCKER 3件は全件是正済み。(1) yaml エッジブロック: unit-of-work-dependency.md:32-49 に H2『機械可読エッジブロック』配下の fenced yaml が存在し、5 unit 全件が name/kind/depends_on の宣言順で並ぶ。(2) canonical kind: unit-of-work.md の U-1〜U-5 全件が先頭行に kind を持ち(library / spec / spec / library / library)、yaml 側 5 件と一致。語彙は service/spec/ui/packaging/library の閉集合内。(3) story-map の H2: unit-of-work-story-map.md は H2 3件(『トレース方針』:3 / 『Unit ↔ FR 対応表』:7 / 『トレーサビリティ検証』:17)で registry 既定の ≥2 を満たす。FOLLOW-UP 3件も是正済み — Deployment model は全 unit に記載(shared/shared/embedded/embedded/shared、語彙 standalone/shared/embedded 内)、複雑度は全 unit に S/M 表記、record 成果物は U-4(:41)と U-5(:51)に構築先ディレクトリ付きで明記、test ownership は 5 unit 全件に『テスト所有: 同 unit』として記載され project.md の source/test 同一境界規律に整合。
- NIT | yaml エッジブロックの機械検査は全項目合格 — 宣言名 5 件(landed-finalization / sensor-declaration / docs-sensors-sync / worktree-gc-determinism / audit-sink-investigation)は重複なし、depends_on に現れる唯一の名 sensor-declaration は宣言済み、自己依存なし、辺は docs-sensors-sync → sensor-declaration の 1 本のみで有向閉路なし(単辺グラフのため循環不能)。kind 値 library/spec/spec/library/library はすべて閉語彙内。フィールド順も stage 契約の name/kind/depends_on どおり。散文(:13)・mermaid(:5-11)・yaml の三者が同じ 1 辺(U-2 → U-3)を述べ、方向も上流 component-dependency.md:7 の FR2 --> FR3 と一致する。
- FOLLOW-UP | yaml の unit 名と unit-of-work.md の見出し識別子が別体系で、両者を結ぶ対応表がどの成果物にもない — unit-of-work.md の見出しは『## U-1: landed-finalization』形式(U-n 接頭辞付き)、yaml の name は接頭辞なしの slug、story-map の表は『U-1 landed-finalization』形式(接頭辞+空白区切り)の第3の表記。stage 契約は下流 batch fan-out を yaml から計算すると明記しており、fan-out 結果(slug)を record ディレクトリ名や成果物見出しへ突き合わせる実装者は 3 形式の照合を自力で行うことになる。3 形式は接頭辞の有無だけの差で人間には自明だが、機械照合には正規化規則が要る。是正の形: unit-of-work.md の各見出しに yaml name を verbatim で併記するか、dependency.md の機械可読ブロック節へ『name は unit-of-work.md 見出しの U-n 接頭辞を除いた部分と一致する』という 1 行の対応規則を書く。
- FOLLOW-UP | upstream-coverage センサーの粒度次第で unit-of-work-dependency.md が SENSOR_FAILED になりうる — stage 契約 §Sensors は upstream-coverage を『the output prose references each artefact declared in this stage's consumes: frontmatter』と定義し、consumes は components / component-methods / services / component-dependency / decisions / requirements / stories(任意)の 7 件。unit-of-work.md:3 は requirements.md・components.md・component-methods.md・services.md・component-dependency.md・decisions.md の 6 件を artefact 名で名指しし、story-map:5 が stories の不在理由(user-stories SKIP)を述べて 7 件目を閉じるが、unit-of-work-dependency.md には consumes artefact 名の言及が 1 件もない(実測: 同ファイル全 58 行に .md ファイル名の出現なし)。センサーが produces 単位でなくステージ出力全体を対象にするなら現状で充足するが、required-sections が iteration 1 で story-map 個別に H2 を要求した実績はファイル単位判定を示唆する。是正の形: dependency.md 冒頭へ『上流 component-dependency.md の FR2→FR3 依存を unit 粒度へ写像したもの』のような 1 文を加え、少なくとも根拠となる上流 artefact 名を明示する(コストは 1 行、失敗時の手戻りはゲート差し戻し)。
- FOLLOW-UP | U-4 の kind: library が語彙定義と噛み合っていない — stage 契約の library は『reusable code without a standalone runtime』だが、U-4 の所有ファイルは tests/integration/t-worktree-gc.test.ts 単体で、内容も『既着地 retry の射程判定 → 分岐別是正』(unit-of-work.md:33-41)であり、再利用されるコードではなく検証コードそのもの。しかも受け入れ分岐 (a) では『覆う場合 0 行』(:39)、すなわちコード変更ゼロで record 記録のみという可能性が第一分岐として設計されている(D-4)。閉語彙に test/investigation に相当する kind がない以上どれかへ寄せる必要はあるが、kind は stage 契約が『which Construction artifacts apply to that unit』を決める軸と明記しているため、library と宣言した結果 U-4 に適用される Construction 成果物の集合が実態(調査+条件付き是正)と合うかは実装前に確認されるべき。同じ懸念は U-5(kind: library、内容は repo 外 scratch での機序再現調査が主、非再現時はコード 0 行)にも当てはまる。是正の形: 両 unit の kind 選択根拠を 1 行で添える(『閉語彙に調査ユニットの kind がないため、成果物適用の観点で最も近い library を選択』等)か、Construction 側で適用される成果物集合が調査ユニットで空振りしないことを delivery-planning で確認する申し送りを書く。
- FOLLOW-UP | 5 unit 構成が pr-convergence の Delivery Bolt authority と衝突しないかが、どの成果物でも確認されていない — project.md の既存学習(cid:code-generation:oq-singleton)は、self-fix 等の degrade スコープで pr-convergence の authority が engine-singleton となり record の construction 配下の unit ディレクトリが『ちょうど 1 つ』であることを要求する、と記録する。本 intent は self-fix だが requirements.md:60 が『units-generation / delivery-planning EXECUTE 済み』と宣言しており、authority がスコープ名で決まるのか units-generation の実行有無で決まるのかによって、construction 配下に 5 つの unit ディレクトリを作った時点で全 unit の report mint が構造的に不成立になる分岐が残る。判定に必要な実装(pr-convergence-presentation.ts / amadeus-runtime.ts)は本レビューのスコープ外パスのため未検証。unit 分割そのものは 1 Issue = 1 Unit 原則(project.md)に忠実で妥当だが、この確認を delivery-planning より後ろへ持ち越すと、5 本の PR を立ててから最初の report mint で発覚する順序になる。是正の形: delivery-planning の入口で authority 解決経路を実読して確認する旨を dependency.md の共有台帳・直列化の補足(:24)へ 1 行で申し送る。
- NIT | 上流との cross-reference は全件解決する — unit-of-work.md が引く D-1/D-3(a)(b)/D-4/D-5 は decisions.md:3/17/22/27 に実在、C-1〜C-5 は components.md:7/13/19/25/31 に実在、FR-1〜FR-5 は requirements.md:11/19/27/34/43 に実在、Issue 番号 #3062/#3026/#3028/#3031/#3032 も 5 者すべてで一致する。所有ファイルは components.md の対象と一致(U-1 の plugins/github-pr-convergence/** ⊇ CLI・センサー・stage 文書、U-2 の plugin.json、U-3 の 06-sensors(.ja).md、U-4 の t-worktree-gc.test.ts、U-5 の amadeus-lib.ts / otel/**)。規模見積の数値も components.md の規模見積と同値(~120+~200 / ~10+~60 / ~10x2+~50 / ~40 / ~60)。分母 14 の由来(U-2 の宣言追加が U-3 の表行数を決める)も component-dependency.md:29 と整合する。story-map は FR 5 件 = Unit 5 件の 1:1 で孤児ゼロ。
- NIT | 2.7/2.8 の境界は守られている — 3 成果物のいずれにも実装順の推奨・クリティカルパスの指名がなく、dependency.md:3 が『トポロジーのみを記述する(実装順・クリティカルパスの選定は delivery-planning の所掌)』と明示し、:58 の並行開発機会も『有効なトポロジカル順序は複数存在』と述べて単一順序へ畳んでいない。unit-of-work.md:3 と dependency.md:28 の『U-3 のみ U-2 着地後』はトポロジー由来の順序制約であって経済的順序付けではない。story-map の『Story implementation order within each unit』は stories 不在(user-stories SKIP)のため該当項目がなく、その旨が :5 で宣言されている。要求にない後方互換レイヤー・移行シム・二重実装の混入も検出されなかった(services.md:8 の『互換シムなし』と整合)。
