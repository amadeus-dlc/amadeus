# Requirements — metrics 可視化(B1 後続)

上流入力(consumes 全数): intent-statement.md, scope-document.md, business-overview.md, architecture.md, code-structure.md, team-practices.md

## 承認系譜と入力

- intent-statement.md の承認系譜(#921 → 260712 B1 → 本 intent)とユーザー裁定 Q1〜Q4(2026-07-26T04:54:00Z)を前提とする
- scope-document.md の In 7項 / Out 5項 / 成功基準 S1〜S5 を本要件へ展開する
- RE codekb(architecture.md の挿入点3案と CI job 実測、code-structure.md の再利用 seam・テスト配置、business-overview.md の docs 0件所見)を実測根拠とする
- team-practices.md の対応表(既存 practices が全面カバー、新規ルールなし)に従う

測定 ref: 本文の file:line はすべて observed 1c43438df(codekb「現在」節と同一断面)。

## FR-1: 生成スクリプト(新規 `scripts/metrics-visualize.ts`)

- 新規スクリプトとして追加する。`scripts/metrics-timeseries.ts` から読み手 seam を import し、fs 書き込みは自分が持つ — `scripts/metrics-retention.ts`(reader import + 書込自前、metrics-retention.ts:17)と同型の構成とし、timeseries の AC-1c 契約(metrics-timeseries.ts:3-4「must not import any fs write API」)を**変更しない**(architecture.md 挿入点3案のうち案2。案1 = timeseries への --html 追加は AC-1c に正面抵触するため不採用)
- CLI 契約(兄弟ツールの既習様式に揃える — ui-less-mockups-as-output-contract):
  - `--write`: `metrics/index.html` を生成(上書き)。成功 = exit 0
  - `--check`: 再生成内容と既存 `metrics/index.html` のバイト比較。一致 = exit 0、不一致・不在 = exit 1 に非空 stderr(ドリフトガード — S5)
  - それ以外の引数・引数なし: usage を stderr、exit 2(metrics-timeseries.ts:193 と同じ codes)
- ルート解決は既存 env seam `AMADEUS_METRICS_ROOT`(metrics-snapshot.ts:112 と同一規約)を使う

## FR-2: データ層(パーサ単一正本・fail-closed)

- `parseSnapshot` / `buildSeries` / `discoverCollectors` / `unionValueKeys` / `assertNonEmpty` を import し、私設パーサ・私設ソートを作らない(constraint-register C4、metrics-retention.ts:8-9 の共有契約に読み手として合流)
- fail-closed: 1件でも parse 失敗があれば HTML を生成せず、対象ファイル名と理由を stderr に出して exit 1(retention の zero-deletions 契約 metrics-retention.ts:6-9 と同型の zero-write)
- `metrics/` が空・不在の場合も exit 1(assertNonEmpty 準拠)

## FR-3: HTML 内容契約

- self-contained: 外部リソース参照(CDN・外部 CSS/JS/フォント・fetch)を一切含まない。チャートは inline SVG(constraint C1、HTML 既習様式 = tests/run-tests.ts:573-614 writeCoverageHtml の延長)
- コレクタは `discoverCollectors` によるデータ駆動で全件表示し、キーは `unionValueKeys` で解決する — コレクタ名・キー集合をコードにハードコードしない。これにより未知コレクタ・キー増減(test_pyramid の動的キー、metrics-snapshot.ts:102、実データ11キー)は自動追随する(raid-log R2 の表示契約)
- 値の型分岐: `values` の個値は unknown(metrics-timeseries.ts:18-19 の明文)— number 以外は表・チャートで欠測扱いとする。**非有限値(NaN/Infinity)を SVG 座標へ流さない**(欠測点としてスキップ。codekb Q-M3 の無音破壊クラスの封鎖)。値整形の妥当性定義は単一正本とし、timeseries 側と二重実装しない(実現手段 — formatValue の export 昇格か別共有関数か — は application-design で確定)
- 文字列出力は HTML エスケープを通す(writeCoverageHtml の coverageHtmlEscape:526 と同じ責務。commit SHA・tool_version 等の埋め込みが対象)

## FR-4: 可視化 UI 要件(成功基準 S1〜S3 の展開)

- S1(1画面把握): 6系列(実データ上: ccn / coverage / loc / tests / test_pyramid / dist_size)すべてのトレンドチャートを単一ページに縦並びで表示。系列数・キー数は FR-3 のデータ駆動により将来変動へ自動追随
- S2(劣化強調): 以下の悪化方向を、最新値が直前値より悪化している場合に視覚的に区別可能なマーカー(CSS class)で強調する — `ccn.over_threshold` 増加 / `ccn.max` 増加 / `coverage.percent` 低下 / `tests.failedFiles`・`tests.failedAssertions` の非ゼロ / `dist_size.bytes` 増加。対象と方向のこの列挙が受け入れ基準であり、テストは強調 class の出現を assert する(免責による代替は認めない — exemption-clause-must-not-substitute)
- S3(SHA 遡及): 各スナップショット列から commit SHA(12桁以上)へ到達できる(データ点の title 属性または表セル)。任意の1点について SHA が HTML 中に存在することをテストで assert する
- 表示文言は日本語可(閲覧者 = ユーザー)、コード内コメントは英語(C8)

## FR-5: CI 同乗(S4)

- `.github/workflows/ci.yml` の metrics-snapshot job に、retention `--apply`(:449)の**後**・commit(:457-462)の**前**に `bun scripts/metrics-visualize.ts --write` ステップを追加する(削除後の集合を反映するため)
- 出力先 `metrics/index.html` は既存の `git add -A metrics/`(:461)に自動で乗り、snapshot と同一コミット・同一 bot PR(ブランチ + `gh pr merge --auto --squash`、:464-480)で main へ届く — 公開経路の変更なし
- `continue-on-error` を付けない(生成失敗 = job 赤 = loud-fail。C5 の非対称 — ci-success 集約外・PR 非ブロック — は不変)
- 影響確認済み(RE 実測): push の `paths-ignore: metrics/**`(:11-13)は index.html も除外(スナップショット専用 PR が再帰しない現行意図と一致)。retention の対象フィルタは `*.json` のみ(metrics-retention.ts:45)で index.html に触れない

## FR-6: サイズ上限(raid-log R1 の数値固定)

- 生成 HTML のバイト数が上限を超えたら `--write` を exit 1 で fail する(loud。無音の肥大を許さない)
- 上限は実在の named constant からの導出式で定義する: `serializeSnapshot` の 16_384 バイト上限(metrics-snapshot.ts:150)× `METRICS_RETENTION_KEEP_LAST` = 360(metrics-retention.ts:25)= 5,898,240 バイトをデータ側理論上限とし、マークアップ余裕を係数2で見て **MAX_HTML_BYTES = 16_384 × METRICS_RETENTION_KEEP_LAST × 2**(= 11,796,480)とする(constants-from-code — 両定数は実在、係数2のみ本要件の新規決定)。定数は visualize 側に named constant で置き、導出式をコメントで残す

## FR-7: テスト(S5)

- 層分割は既習様式(t230/t231 と同型、fs-tests-integration-first): 純関数(SVG 生成・強調判定・エスケープ・サイズ判定)= `tests/unit/`、fs/CLI 境界 = `tests/integration/` + `AMADEUS_METRICS_ROOT` seam
- 落ちる実証(必須、いずれも赤の実測を伴う): (a) 壊れたスナップショット → zero-write + exit 1 (b) 空/不在 dir → exit 1 (c) `--check` のドリフト(生成後に既存 HTML を改変)→ exit 1 (d) 悪化データ → 強調 class 出現、非悪化データ → 非出現(両側実測 — corpus-sweep-for-new-guards の両側原則)
- エラー経路は lcov の DA で当該分岐の実駆動を確認する(error-path-reach-lcov)
- 実データ全件(現 123件)への適用 sweep を1回実施し、生成成功+全コレクタ出現を確認する
- coverage registry 登録は既存 metrics テストに先例がない(RE 実測訂正: code-structure.md:74 — harness-instrument マーカーの registry 登録は 0件)ため要求しない — 既存 patch/ratchet ゲートの通過のみを基準とする

## FR-8: ドキュメント

- `docs/` に可視化コマンドの利用手順を追加する(日英ペア — project.md Mandated)。既存 docs に metrics-timeseries/snapshot の言及が0件(business-overview.md 所見)のため、metrics サブシステム全体の1ページとして新設し、その中で可視化を扱う(スコープは可視化の記述を主、既存3スクリプトへの言及は導線程度)

## Non-Goals(スコープ外 — scope-document.md Out の再掲)

- GitHub Pages 公開(V1)/ Codecov の置換・複製 / snapshot writer・retention の挙動変更 / アラート・通知 / 遡及計測(V4)
- package.json への scripts エントリ追加は行わない(既存 metrics 3スクリプトと同じ直叩き運用に揃える。エントリ追加は既存3つと合わせて別判断 — 一貫性のため本 intent では見送り)

## 受け入れ基準の総括(トレーサビリティ)

| 基準 | 検証手段 | 由来 |
|---|---|---|
| AC-1 `--write` で index.html 生成・全コレクタ出現 | integration テスト+実データ sweep | S1 / Q3=A |
| AC-2 劣化強調 class の両側実測 | unit+integration(FR-7d) | S2 / Q4 |
| AC-3 SHA 遡及の実在 assert | integration | S3 / Q4 |
| AC-4 fail-closed(壊れ・空・上限超過で zero-write exit 1) | integration 落ちる実証 | FR-2/FR-6 |
| AC-5 `--check` ドリフトガード | integration 落ちる実証 | S5 / Q1=A |
| AC-6 CI 同乗(retention 後・commit 前) | ci.yml diff レビュー+着地後 main run 観測 | S4 / Q2=C |
| AC-7 AC-1c 契約不変 | timeseries への fs write import 不在 grep | C3/C4 |
| AC-8 docs 日英ペア | ファイル実在+相互参照 | FR-8 |
