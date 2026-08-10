# Requirements — 成果物数値の provenance ガード(第1段)

上流入力(consumes 全数): intent-statement(../../ideation/intent-capture/intent-statement.md — 効能範囲限定と Success Metrics を FR の親とした)、scope-document(../../ideation/scope-definition/scope-document.md — In/Out 境界を Out of scope 節へ転記)、business-overview(codekb — 検査対象ワークフロー成果物の業務文脈確認)、architecture(codekb — センサー発火・advisory 契約の構造前提)、code-structure(codekb — 正本/dist/テスト層の配置規約)。技術実測の正本 = codekb/amadeus/re-scans/260810-numeric-provenance-guard.md(以下「RE §n」)。裁定の正本 = requirements-analysis-questions.md(D1-D3 AUTO_DECIDED + Q4 執行)。

## Intent analysis

Issue #2815(クロスレビュー収束 ESTABLISHED_WITH_REFINEMENTS)の第1段: ステージ成果物 md 中の数値主張の近傍に集計コマンド・測定 ref の併記が存在することを検査する advisory センサーを新設する。目的は provenance **不在**クラスの起草時検出であり、算術誤り・二重計上の検出ではない(intent-statement の効能範囲限定)。規範正本は project.md「実測値には provenance を添える」、機械化予約は E-PM7 L1。

## Functional requirements

### センサー機構(FR-SEN)

- **FR-SEN-1**: 新規 sensor manifest `packages/framework/core/sensors/amadeus-numeric-provenance.md` を追加する。frontmatter は shipped schema(RE §1: REQUIRED_FIELDS = id / kind / command / default_severity / description、amadeus-sensor-schema.ts:57-63)に適合し、`default_severity: advisory`、`kind: deterministic`。受け入れ: t86 系 manifest schema テストと新規テストの manifest 検証が green。
- **FR-SEN-2**: 検査ツール `packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts` を追加する。既存イディオム(RE §7)どおり `evaluate*` / `main` / `fail` を named export し、`if (import.meta.main) main();` ガードで in-process seam を確保する。flag 読みは `amadeus-sensor-flags.ts` の `requireFlagValue` を使う(RE §8)。
- **FR-SEN-3**: verdict は nfr-budget 様式(RE §2)で次の3モードに固定する。(a) enforcement 対象では、近傍窓内に provenance がない数値主張を1件につき1 finding とし、`pass = findings.length === 0`、`skipped = false`、`findings_count` を併記する。(b) measurement-only 対象では候補数・未併記数・未併記率だけを metrics に記録し、`findings = []`、`pass = true`、`skipped = false` とする。(c) cutoff 前・対象外・判定不能パス・ファイル不在では `findings = []`、`pass = true`、`skipped = true` とし理由を返す。FR-SWP の閾値は enforcement と measurement-only の**設計時分類**だけを決め、enforcement 実行時の finding 許容量には使わない。エラーを投げず全て verdict へ写し、verdict は exit code で表現しない(dispatcher 契約 RE §1: exit 非0 は dispatcher 起動エラーのみ)。
- **FR-SEN-4**: 対象 stage の frontmatter `sensors:` リストへ id を追加して配線する(RE §6: 配線2点 + stage 1行、dispatcher 無改修)。初期配線対象は corpus sweep(FR-SWP)で確定した適用範囲の stage 集合とし、sweep 成果物に配線根拠を記録する。`default_severity: advisory` によりグラフ golden への severity 書込がないこと(amadeus-graph.ts:809-811)を検証する。
- **FR-SEN-5**: dispatcher(`amadeus-sensor.ts`)の per-sensor 追加引数アームには触れない。検査に必要な入力は `--stage` + `--output-path` のみで完結させる。cutoff 判定は outputPath から導出する(FR-CUT-1)。

### 検査述語(FR-PRED)

- **FR-PRED-1**: 数値主張の候補集合は4クラスに固定する。(a) 件数: 桁区切りを含む整数/小数の直後に `件|個|本|行|ファイル|files?|items?|lines?|tests?` が続く、(b) 比率: `整数/整数` の直後に大小文字を無視した `PASS|FAIL` が続く、(c) パーセント: 整数/小数の直後に `%` が続く、(d) 実測値: `実測|計測|measured|observed` と同一行の後方40文字以内に整数/小数がある。実装 regex はこの語彙・距離・大小文字条件を1対1で写し、見出し番号、ISO日付、Issue/FR/id番号、hex SHA、semver 単独、コードフェンス内のコマンド引数を候補から除外する。クラス自体の追加・削除は sweep 裁量にせず、別 requirements 変更とする。
- **FR-PRED-2**: provenance 受理語彙を次に固定する。(a) 同一近傍窓内のバッククォートコードに `git|grep|rg|wc|find|ls|jq|gh|bun` のいずれかがコマンド境界で存在する、(b) `測定 ref|measurement ref|observed at|HEAD|origin/main` のいずれか、(c) 7-40桁の hex SHA、(d) 検査対象ファイルからの相対 Markdown link を fragment 除去後 POSIX normalize し、実在する通常ファイルへ解決した結果が、同一 intent record 内の `verification/**`、`construction/**/{measurements,verification}/**`、basename `*-{measurement,measurements,sweep,benchmark,test-results}.{md,json}` のいずれか、または active repo の `amadeus/spaces/<space>/codekb/<repo>/re-scans/*.md` に一致する。絶対パス、URL scheme、解決後に許容 root を `..` で脱出する参照、別 intent、directory、存在しない target、同一 record 内でも上記に一致しない一般成果物は拒否する。受理 fixture は同一 record の `construction/u1/measurements/corpus-sweep.md` と active codekb re-scan、拒否 fixture は `requirements.md`、別 intent、`https://...`、root 脱出とする。単なる「測定」「確認済み」やリンクのない裸ファイル名は受理しない。語彙・許容 path の変更は別 requirements 変更とする。
- **FR-PRED-3**: 近傍窓は同じ Markdown list item / paragraph / table row の範囲内で数値主張行から前後 `W` 論理行(空行・次の見出し・次の同階層 list item を越えない)とする。`W` は FR-SWP-2 の再現可能な sweep 規則で成果物種別×意味クラスごとに一意に導出し、生成された mapping 表をツール定数として固定する。テストで `W` 行内は PASS、`W+1` 行は FAIL、構造境界越えは距離内でも FAIL をピンする。mapping の承認主体は Build and Test の lead(`amadeus-quality-agent`)であり、規則どおり再計算できない mapping は承認しない。
- **FR-PRED-4**: 適用候補は intent record 配下の Ideation/Inception/Construction/Operation の stage 成果物 `.md` とする。機械的な除外は path basename が `*-questions.md` または `memory.md`、record 相対 path が `verification/**` / `audit/**` / `amadeus-state.md`、あるいは basename が大小文字を無視して `/(^|[-_])(ack|acknowledgement)([-_.]|$)/` に一致する場合だけとする。「定型 ack」はこの basename 規則の一致だけを意味し、本文内容や実装者判断で除外を広げない。`release-ack.md` と `handoff_acknowledgement.md` は skipped、`acknowledgement-design.md` は skipped、`facts.md` と `numeric-report.md` は候補として処理する境界 fixture を固定する。「軽量報告」は (a) basename が exact set `{status.md, progress.md, completion.md, receipt.md, run-status.md, deployment-status.md}` に一致する、または (b) runtime graph の当該 stage `produces` artifact key が exact set `{status, progress, completion, receipt}` に一致する成果物だけと定義し、数値候補の有無にかかわらず `skipped: lightweight-report` とする。substring の `summary` / `report` や本文の短さでは判定しない。`progress.md` と produces key `status` に `3/4 PASS` があっても skipped、同じ本文の `performance-summary.md` と produces key `performance-summary` は候補として処理する境界 fixture を固定する。100行未満かつ数値候補0件のファイルは候補走査後に `not-applicable` とするが、上記 exact set 外で数値候補が1件でもあれば行数で除外しない。残る成果物種別×意味クラスを FR-SWP-2 の規則で enforcement / measurement-only に分類し、1件以上 enforcement となった stage slug のみ frontmatter `sensors:` へ配線する。成果物パス→stage slug は runtime graph の宣言済み produces から機械導出し、手書き推定しない。分類表と配線 stage 集合は FR-SWP-4 の成果物を正本とする。`matches` は dispatcher の `matchesGlob` と hook の `Bun.Glob` の両エンジンで一致することをテストで検証する(RE §2 t514 様式)。
- **FR-PRED-5**: 検査対象は不定長のリポジトリ文書であるため、新設 regex は敵対入力(100KB 級)での線形性を実測し完成条件に含める(team.md regex-linearity-untrusted-input)。

### 遡及適用(FR-CUT — D1 裁定)

- **FR-CUT-1**: answer-evidence 型 enforcement cutoff を採用する(D1: AUTO_DECIDED 31132b8e)。record dir 名の先頭6桁日付が cutoff 定数以上の intent のみ検査し、それ以前・undatable・intents 外パス(codekb 等)は skipped(pre-cutoff / not-applicable)として fail-open。cutoff 定数は本 intent の着地日(YYMMDD)とする。
- **FR-CUT-2**: cutoff の両方向をテストでピンする — cutoff 以後の record で述語が発火すること、cutoff 以前の record 形パスで skipped になること(RE §2: t514 の enforcement cutoff 両方向様式)。

### corpus sweep と閾値確定(FR-SWP)

- **FR-SWP-1**: センサー本実装の前に、FR-PRED-1/2 の固定候補述語を既存コーパス(intents 配下 8,503 md + codekb 135 md — RE §9)へ適用する。成果物種別×意味クラスごとに候補数、provenance あり/なし、最短 provenance 距離を全件集計する。偽陽性評価は各candidateについて、要素順を固定した空白なしのcanonical JSON tuple `JSON.stringify([relativePath,line,normalizedText])` のUTF-8 bytesをpreimageとするlowercase hex `sha256` identityを作り、そのidentity昇順で各組最大50件(50件未満は全件)抽出する。Build and Test の lead(`amadeus-quality-agent`)が「意味ある数値主張か」「FR-PRED-2 の正当 provenance を見落としていないか」を二値ラベルする。偽陽性はどちらかが否の候補、分母はラベル済み候補数とする。述語3要素(パターン・対象集合・除外条件)、標本 identity、各ラベルと理由を sweep 成果物へ記録し、同じ HEAD で再計算可能にする(E-ASD-RES13)。
- **FR-SWP-2**: enforcement 分類には (a) ラベル標本30件以上、(b) 偽陽性率 `falsePositive / labeled <= 0.10`、(c) 正当 provenance あり候補20件以上、(d) 最短 provenance 距離の min < max を全て要求する。近傍閾値 `W` は「正当ペア距離の95%を覆い、かつ観測minより大きい最小整数」、すなわち `W = max(nearest-rank p95, min + 1)` とする。`W < max` を満たす組だけをenforcementへ採用し、`nearest-rank p95 = max` で上端へ張り付く組はmeasurement-onlyとする。この規則は、同一行距離0が95%以上を占めて `p95 = min = 0` となる分布では `W = 1` を選び、95% coverageを維持したままstrict interiorを確保する一方、観測上端を閾値に採用しない(project.md c1-threshold-inside-observed-range)。各組の n・min・median・p95・max・偽陽性率・`W` を nfr-budget 定数コメント様式で固定し、受け入れテストは `W = max(p95, min + 1)`、`min < W < max`、95% coverage、分類規則の再計算一致を検証する。lower-bound saturation fixture(`p95 = min` かつ `max >= min + 2`)は `W = min + 1` でenforcement、upper-bound saturation fixture(`p95 = max`)はmeasurement-onlyに固定する。少なくとも1組が enforcement にならなければ Success Metric 1を満たせないため Build and Test を BLOCKER とする。`W` は runtime finding 許容量ではない(FR-SEN-3)。
- **FR-SWP-3**: FR-SWP-2 のいずれかを満たさない組は scope-sizing 型 measurement-only へ機械的に分類する(D3: AUTO_DECIDED 2883cefc)。実装者の裁量で enforcement へ昇格できない。降格した組、失敗した条件、測定値を sweep 成果物に明記する。
- **FR-SWP-4**: sweep の結果(固定4クラス、成果物種別ごとの enforcement / measurement-only、`W`、除外、配線対象 stage 集合)は record の Construction 配下に機械生成し、`amadeus-quality-agent` が FR-SWP-1/2 の再計算一致を Build and Test で承認する。この成果物を mapping の単一正本とし、実装定数・manifest・stage 配線が byte/集合一致することを統合テストで検証する。

### テストと実証(FR-TST)

- **FR-TST-1**: 統合テストを `tests/integration/t532-numeric-provenance-sensor.integration.test.ts` として追加する(t 系列最大 531 の次 — RE §7 実測。base 前進時は再接地 SHA の tests/ 実測で再確認し、衝突時は改番+全参照 grep 更新)。構成は t514 三部様式(manifest 両 glob エンジン検証 + 述語測定 + cutoff 両方向)+ corpus sweep 同居。
- **FR-TST-2**: 落ちる実証(赤側) — 集計コマンド・測定 ref の併記なしに数値断定を含む fixture で FAILED verdict(findings ≥ 1)になることを、テストが実際に読む面へ注入して実証する。
- **FR-TST-3**: 緑側 — enforcement mapping ごとに正当な併記付き fixture で PASS とし、既存コーパスの決定的標本で偽陽性率が10%以下、距離閾値が `W = max(nearest-rank p95, min + 1)` かつ `min < W < max`、95% coverageを維持し、実装 mapping が sweep 成果物と一致することを実測する(corpus-sweep-for-new-guards の両側)。lower-bound saturationとupper-bound saturationの境界fixtureを含め、標本 identity・ラベル・分母を fixture として固定し、単なる未併記率を偽陽性率として扱わない。
- **FR-TST-4**: TDD を既定とする — 合意済み seam(evaluate 関数)へ失敗テストを1件追加して Red を実測し、最小実装で Green にする vertical slice を反復する(team.md tdd-default-with-narrow-exceptions)。conductor は完了前にフルスイートを1回通す(project.md c3-conductor-runs-full-suite)。

### 配布同期(FR-DIST)

- **FR-DIST-1**: 正本(core)編集後に `bun run build` を実行し、manifest 発見の全ハーネスへ投影する。センサーは `{ src: "sensors", dst: "sensors" }` のディレクトリ単位投影(RE §1)により manifest 追加のみで自動投影されることを確認する。
- **FR-DIST-2**: 受け入れ条件は配送先ツリーの述語で確認する — 自己インストール面(`.claude/sensors/` / `.claude/tools/`)経由で `amadeus-sensor.ts fire numeric-provenance --stage <slug> --output-path <fixture>` が SENSOR_PASSED/FAILED を audit へ emit すること(project.md c2-acceptance-at-delivery-tree、no-canonical-direct-execution)。
- **FR-DIST-3**: CI ブロッキング集合(typecheck / lint / 再現性検査 / source-only:check / グラフ不変量 / run-tests --ci / Project & Patch Coverage Gate / complexity)を全て green にする。patch coverage は in-process seam(FR-SEN-2)で充足する。

## Non-functional requirements

- **NFR-1(advisory 契約)**: 本センサーは advisory であり、ステージ承認をブロックしない。SENSOR_* audit 行の記録のみ(RE §6 の severity 契約)。graph golden・承認ガードの挙動は byte/意味論とも不変。
- **NFR-2(fail-open 方向)**: cutoff 判定不能・対象外パス・ファイル不在は skipped(pass 側)へ写す。fail-closed にしない — advisory 検査の偽赤は信号希釈につながる(answer-evidence の意図的逸脱申告様式 RE §3 を踏襲し、兄弟イディオムとの相違をコメントで明文化)。
- **NFR-3(性能)**: CI の `ubuntu-latest`、Bun 1.3.13、単一プロセスで、100KB の敵対 Markdown 1ファイルを5回 warm-up 後20回検査し、wall-clock の median <= 100ms、p95 <= 250ms とする。50KB/100KB の同型入力で各20回の median 比を <= 2.5 とし、入力倍増に対する実測線形性を担保する。計時対象はファイル読込から verdict 生成まで、dispatcher 起動時間は除外する。閾値超過または regex timeout はテスト失敗とし、測定値・Bun版・runner をテスト出力へ残す。
- **NFR-4(依存)**: 新規 runtime dependency を追加しない(Bun-only 前提の維持)。

## Constraints

- source-only 境界: `packages/framework/core/` を正本として編集し、`dist/` とセルフインストール面は `bun run build` で再生成(追跡ファイル不変)。
- ハーネス中立: core 配下のコメント・文字列に repo-only の `scripts/<file>` パストークンや Claude 固有パスを書かない(t258 境界、c1-1569-shipped-comment-vocab)。
- テスト層: 実 FS を触るテストは integration 層(fs-tests-integration-first)。
- 第1段は既存 stage 本文・engine・dispatcher の挙動を変更しない(manifest + ツール + stage frontmatter 1行のみ)。

## Assumptions

- corpus sweep は本 worktree の HEAD 断面(コード面 = origin/main 40056d0ec と byte 同一)で実施すれば足りる — 閾値確定後の base 前進で分布が実質変化した場合は c5-ratchet-census-at-final-base に準じ最終 base で再実測する。
- cutoff 定数により既存コーパスは検査対象外となるため、sweep の偽陽性実測は「もし遡及したら」の設計根拠であり、運用初期の findings は新規 record のみから発生する。
- reviewer-1 のプロトタイプ実測(未併記率 27.6〜66.1%)は近似述語の値であり、本実装の偽陽性率は FR-SWP-1 の自前 sweep で独立に実測し直す。

## Out of scope

scope-document.md の Out と同一: 第2段(併記コマンドの再実行可能書式検査)/ 全数値の自動再実行照合 / 算術誤り・二重計上の検出(併記があれば通過 — 構造的限界)/ #1237 実装および共有述語エンジンの新設(D2: AUTO_DECIDED a3522397 — nfr-budget 鋳型の自前実装とし、共通化は #1237 実装時判断。reviewer-2 の代替3案の非採用理由: (a) 供給側機械化のみでは成果物への転記面が無検査のまま (b) #2536 template override への相乗りは検査意味論が異なる(節構造 vs 数値近傍) (c) reviewer-runtime 側チェックは §12a 実行時のみでセンサーの起草時検出にならない)。

## Open questions

- RE UNMEASURED (a): `.claude/sensors/` と core manifest の8バイト差の原因 — 実装時に build 再生成で確認(想定: 投影時の trailing 差)。
- code-generation実測(証拠commit `55f0027e321f8b1aa4aa8ec5d0e1e67a0e1223a6`)では8,637 files・184 groupsの旧規則適用時に21組が標本数/positive数を満たしたが、`W = p95` としたためstrict interior成立が0組だった。FR-SWP-2のlower-bound saturation規則で同一corpusを再計算し、1組以上のenforcement成立を確認する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T11:36:54Z
- **Iteration:** 1
- **Scope decision:** none

FR-SWP-2、FR-TST-3、D4は、95%以上のcoverage、strict interior、上下端saturation、Success Metrics、下流の再計算・実装・検証契約まで一貫している。

### Findings

- None
