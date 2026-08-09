# Requirements — 260809-sensor-parseflags-failop

上流入力(consumes 全数): business-overview(プロダクト文脈の確認)/ architecture(センサー機構と dispatcher の位置づけ)/ code-structure(core/tools 配下の対象ファイル配置)。一次入力: `codekb/amadeus/re-scans/260809-sensor-parseflags-failop.md`(RE 正本)と Issue #2741(クロスレビュー2名+REFRAME+convergence)。裁定は `requirements-analysis-questions.md`(Q1〜Q4、semi 梯子 AUTO_DECIDED)。

## Intent analysis

センサー CLI の引数 parse が「値なしフラグ」「フラグのフラグ値化」を無言受理し、検証系の入力面が fail-open になっている(#2741、クロスレビューで実在確定)。目標は症状の場当たり修正ではなく、**parse 層で不正形を loud に分離する house idiom(dispatcher 自身が持つ両アーム拒否)をセンサー側へ canonical に届かせる**こと。L5(blocking 受け皿)着地後はセンサー verdict が approve を左右するため、入力面の先行封鎖が本 intent の価値。

## Functional requirements

### FR-1: strict parse ヘルパーの canonical 1定義

- **Behavior**: 両アーム(値なし末尾 = end-of-arguments / 次トークンがフラグ)を loud に拒否する strict flag-parse ヘルパーを1箇所で定義し export する。エラー文言は house idiom(`expects a value, got end of arguments.` / `expects a value, got another flag: "…"`)の既習形に揃える
- **Acceptance**: ヘルパーの unit テストが両アームの拒否(exit 1 / エラー文言)と正当列の受理を固定する。定義は1箇所のみ(`grep -rn` で複製 0)

### FR-2: budget 系3センサーへの適用(T1)

- **Behavior**: depth-budget / question-budget / nfr-budget の `parseFlags` を FR-1 ヘルパー消費へ置換。値なし `--depth`・`--kind`、フラグ値化(`--output-path --depth <v>` / `--kind --depth <v>`)はすべて exit 1
- **Acceptance**: 各センサーで「値なしフラグ」と「フラグ完全省略」の出力が**バイト同一でなくなる**(前者は exit 1、後者は従来どおり測定)。nfr-budget の `unit_kind:"--depth"` 受理が再現不能になる

### FR-3: scope-sizing 残渣の封鎖(T2)

- **Behavior**: scope-sizing の任意フラグ値なし(`--output-path <p> --depth` → `depth:null` / exit 0)を FR-1 ヘルパーで loud 化。既存の `valueAt` によるフラグ値化防止の挙動は等価以上を維持
- **Acceptance**: 値なし `--depth` が exit 1。t519:305 の既存 assert(`--output-path is required`)は green を維持

### FR-4: 偶然 loud の同型3センサーへの適用(T3)

- **Behavior**: answer-evidence / required-sections / pr-convergence-report-format の `parseFlags` を FR-1 ヘルパー消費へ置換 — 現状の loudness は下流の偶然(existsSync・必須チェック)に依存しており、required-sections は `--templates-dir --template-eligible X` で警告なしの完全偽 green(RS-C)
- **Acceptance**: RS-C 再現が exit 1 になる。各センサーの正当引数列の挙動は不変(既存テスト green)

### FR-5: 既存テスト契約の明示改訂

- **Behavior**: t488:695-703(テスト名 "a missing flag is the only exit-1 path")を新契約(値なしフラグも exit 1)へ名前・assert とも明示改訂する。**加えて t519:253-265(:264 の stderr 期待 "--output-path is required")を strict parse の実文言(`--output-path expects a value, got another flag: "--depth".`)へ改訂する** — 実質契約(exit 1・stdout 空)は不変で、stderr が実原因を名指す形へ改善。t488:688-693 / t514:645 の「`--depth` 完全省略 = no-depth 測定」ピンは**非衝突のため不変**
- **Acceptance**: 改訂は当該**2本**のみ(cid:reverse-engineering:c1-pinned-behavior-ruling — 本 requirements が仕様裁定とテスト契約改訂をセットで確定)。full suite green
- **改訂履歴**: 当初「1本のみ」→ CG 実測で t519:264 の衝突が確定し、semi 梯子裁定 `cg-2741-q5-t519-conflict`(decided / agent-recommendation / a-revise-t519)により2本へ明示改訂(2026-08-10)。互換分岐案は canonical 1定義原則と org.md Forbidden(要求されない互換レイヤー)により不採用

### FR-6: in-process seam と両側の落ちる実証

- **Behavior**: 対象センサーへ `fail` export の in-process seam(t519:275-306 様式)を移植し、両アームのネガティブテストを in-process で固定する(spawn 盲点回避)
- **Acceptance**: 赤側 = 2アーム×対象7ファイルのネガティブテストが修正前コードで赤・修正後緑(TDD Red 実測ログ)。緑側 = dispatcher 経由の正当列不変+コーパス実ファイルへの正当実行が従来どおり測定+full suite / patch gate green

### FR-7: 対象外の不変確認(negative)

- **Behavior**: upstream-coverage(意図宣言済みの寛容仕様)と dispatcher(構造的に安全)、linter / type-check(両アーム loud 実測済み)は**変更しない**
- **Acceptance**: 上記ファイルの diff が 0 行であることを PR で機械確認。upstream-coverage の意図コメント(:29-30)は温存

## Non-functional requirements

- 追跡ファイルの生成物 drift なし(`bun run build` 後 porcelain 0)— 対象は core/tools のため全ハーネス dist へ投影される
- coverage: patch gate green(allowlist 追加なし)。新規行は in-process seam で計測(FR-6)
- 既存 CI ブロッキング集合(typecheck / lint / 再現性 / source-only / graph invariants / test:ci)全 green

## Constraints

- self-contained 制約(depth-budget.ts:23-24「no amadeus-lib import」)は budget 系のローカル方針であり、cross-sensor import は前例6本で許容(RE 実測)。FR-1 の配置はセンサー間 import の既習作法に従う(amadeus-lib への追加はしない)
- upstream-coverage は対象外(FR-7)— strict 化のオプトイン設計により構造的に除外される
- 新規テスト番号は **t520 から**(RE 実測の予約)

## Assumptions

- dispatcher の argv 構成(対 push・閉語彙)は不変 — 発火経路の挙動は本修正で変化しない(変化したら FR-7 違反として検出される)
- required-sections 同型の bootstrap 遡及(reviewer-2 主張)は CG で `git log --diff-filter=A` により実測し、結果を record と Issue #2741 コメントへ事実として記録する(ラベルは Q3 裁定により不変)

## Out of scope

- センサー外の同根 T7(state/learnings/jump の汎用 parseFlags 4箇所)・T7b(名指しフラグ変種4箇所)— 実発現未実測。Open questions へ固定し、起票はユーザー判断(issue-first-capture)
- upstream-coverage の寛容仕様の変更(意図宣言尊重)
- dispatcher・sensor-schema・stage md の変更

## Open questions

- T7/T7b の実発現有無(呼出し元 argv が値なしフラグを生みうるか)— 別調査・別起票候補としてユーザーへ回付
- `?? ""` 変種(linter / type-check / upstream-coverage 以外に意図宣言の有無)— 本 intent では FR-7 により非対象、将来の棚卸し候補

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-09T14:45:22Z
- **Iteration:** 1
- **Scope decision:** none

必須7節・FR-n 契約・裁定整合は適合だが、質問票4問すべてで stage 契約 Step 7 の MUST『X. Other (please specify)』選択肢が欠落しており NOT-READY。

### Findings

- BLOCKER | requirements-analysis-questions.md:9-42 — Step 7 の明示 MUST『EVERY question MUST end with X. Other (please specify)』に対し Q1〜Q4 全問で X. Other 選択肢が欠落(semi 梯子の自動裁定はファイル様式契約を免除しない)
- FOLLOW-UP | requirements.md:3 — 上流入力ヘッダに intent-statement / scope-document / team-practices(optional consumes)への参照なし — センサー手動発火で FAILED が出ないか確認、実在するなら一言参照を推奨
- FOLLOW-UP | requirements.md:24,33-34,38-39 — t519/t488/t514 の file:line 引用は許可読取範囲外で逐語未検証 — code-generation 段での実測確認を推奨

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-09T14:47:04Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の唯一の BLOCKER(質問票4問の X. Other 欠落)が是正され逐語一致を確認、新規違反なし。READY。

### Findings

- FOLLOW-UP | requirements.md:3 — optional consumes(intent-statement/scope-document/team-practices)への参照なし — upstream-coverage 実発火は PASSED 確認済みのため経過観察
- FOLLOW-UP | requirements.md:24,33-34,38-39 — t519/t488/t514 引用は許可範囲外で逐語未検証 — code-generation 段で実測確認
